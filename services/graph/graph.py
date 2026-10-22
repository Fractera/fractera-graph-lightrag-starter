"""The graph of this element: LightRAG over its SDK, ONE operation per run (node step 540-3; the mode — 540-4).

Owner 2026-10-22, the mode, verbatim: «На каждый вызов (Рекомендую)». A resident graph process held ~190 MB, so there is none: each
call of the element's doors starts Python for one operation and the process ends with it. Calls take turns through a lock file.

    python -I services/graph/graph.py <insert|query|status>    request JSON on stdin, answer JSON (one line) on stdout

  insert   a ready graph: {chunks: [{content, source_id}],
                           entities: [{entity_name, entity_type, description, source_id}],
                           relationships: [{src_id, tgt_id, description, keywords, weight?, source_id}]}
           every entity and relationship names, by source_id, a chunk of the same insert
  query    {query, mode?, hl_keywords?, ll_keywords?, top_k?, chunk_top_k?} → {found, entities, relationships, chunks} — retrieval
           without generation (aquery_data); nothing relevant is ok with found false; every mode but `naive` needs the caller's
           keywords: no language model is ever called here
           One process holds ~190-200 MB while it runs: the caller runs one call at a time (the lock guards the files, not memory)
  status   {} → counts of entities, relationships and chunks, read from the files without opening LightRAG

Exit code 0 — ok; 1 — a refusal named in the answer {"ok": false, "error", "detail"}; 2 — the element is set up wrong.
The graph: <SERVICE_DATA_DIR>/lightrag/ (absolute, outside every build); the lock: <SERVICE_DATA_DIR>/lightrag.lock (the pid inside).
OpenAI does one thing — the vectors (embeddings): the core's key first, then the element's own (node law 336).
"""

import asyncio
import importlib.metadata
import json
import logging
import os
import sys
import time
from pathlib import Path

ELEMENT_DIR = Path(__file__).resolve().parents[2]
NODE_DIR = ELEMENT_DIR.parents[2]  # an element lives at <node>/WEB4-ITEMS/<kind>/<id>


def answer(body: dict, code: int = 0) -> int:
    sys.stdout.write(json.dumps(body) + "\n")  # ASCII with escapes: no console code page can break it
    sys.stdout.flush()
    return code


def refusal(error: str, detail: str = "") -> int:
    return answer({"ok": False, "error": error, **({"detail": detail} if detail else {})}, 1)


def read_env_file(path: Path) -> dict:
    values = {}
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                name, value = line.split("=", 1)
                values[name.strip()] = value.strip()
    except OSError:
        pass
    return values


ENV = {**read_env_file(ELEMENT_DIR / ".env.local"), **os.environ}
DATA_DIR = ENV.get("SERVICE_DATA_DIR", "").strip()
DATA = Path(DATA_DIR) if DATA_DIR and Path(DATA_DIR).is_absolute() else None
WORK = DATA / "lightrag" if DATA else None
LOCK_FILE = DATA / "lightrag.lock" if DATA else None
LOCK_WAIT = 120  # seconds one call waits for the call before it
# tiktoken reads this at call time; scripts/graph-python.mjs put the encodings there, so a run never downloads them.
os.environ.setdefault("TIKTOKEN_CACHE_DIR", str(ELEMENT_DIR / ".uv" / "tiktoken"))

# The vectors of a live graph cannot change model or size: every stored vector would have to be made again.
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIMS = 1536
# Any OpenAI-compatible embeddings address (a local model, a probe). The OpenAI key goes to OpenAI only; another address gets
# its own GRAPH_EMBED_KEY, or no key at all.
OPENAI_URL = "https://api.openai.com/v1"
EMBED_URL = (ENV.get("GRAPH_EMBED_URL") or OPENAI_URL).rstrip("/")
MODES = {"local", "global", "hybrid", "naive", "mix"}
NO_RESULT = ("Query returned no results", "No relevant document chunks found.")  # lightrag 1.5.7, aquery_data
LIMITS = {"chunks": 2000, "entities": 5000, "relationships": 10000, "text": 50000}
COUNTS = {"llmCalls": 0, "embedCalls": 0, "embedTexts": 0}


def openai_key() -> str:
    # Node law 336: the core's key first, otherwise the element's own; read at every run, so a key saved on the node's screen works
    # from the next call.
    files = ([NODE_DIR / ".env.local"] if (NODE_DIR / "WEB4-ITEMS").is_dir() else []) + [ELEMENT_DIR / ".env.local"]
    for f in files:
        key = read_env_file(f).get("OPENAI_API_KEY", "")
        if key:
            return key
    return os.environ.get("OPENAI_API_KEY", "")


def text(value) -> bool:
    return isinstance(value, str) and value.strip() != "" and len(value) <= LIMITS["text"]


def shape_graph(body):
    """Only the documented fields of a ready graph pass on to LightRAG; anything else is a refusal that names the place."""
    if not isinstance(body, dict):
        return "the request must be an object"
    graph = {"chunks": [], "entities": [], "relationships": []}
    for part, required in (("chunks", ("content", "source_id")), ("entities", ("entity_name", "description", "source_id")),
                           ("relationships", ("src_id", "tgt_id", "description", "keywords", "source_id"))):
        items = body.get(part, [])
        if not isinstance(items, list) or len(items) > LIMITS[part]:
            return f"{part} must be a list of at most {LIMITS[part]}"
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                return f"{part}[{index}] must be an object"
            for field in required:
                if not text(item.get(field)):
                    return f"{part}[{index}].{field} must be a non-empty string"
            row = {field: item[field] for field in required}
            if part == "entities":
                row["entity_type"] = item.get("entity_type") if text(item.get("entity_type")) else "UNKNOWN"
            if part == "relationships" and isinstance(item.get("weight"), (int, float)):
                row["weight"] = float(item["weight"])
            graph[part].append(row)
    if not any(graph.values()):
        return "nothing to insert"
    return graph


def shape_query(body):
    if not isinstance(body, dict) or not text(body.get("query")):
        return "query must be a non-empty string"
    mode = body.get("mode", "mix")
    if mode not in MODES:
        return f"mode must be one of {sorted(MODES)}"
    words = {}
    for name in ("hl_keywords", "ll_keywords"):
        value = body.get(name, [])
        if not isinstance(value, list) or not all(text(word) for word in value):
            return f"{name} must be a list of non-empty strings"
        words[name] = value
    if mode != "naive" and not (words["hl_keywords"] or words["ll_keywords"]):
        return "the graph calls no language model: send hl_keywords and/or ll_keywords, or use mode naive"
    sizes = {name: body[name] for name in ("top_k", "chunk_top_k") if isinstance(body.get(name), int) and 0 < body[name] <= 200}
    return {"query": body["query"], "mode": mode, **words, **sizes}


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":  # os.kill(pid, 0) on Windows TERMINATES the process — ask the kernel instead
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


async def take_lock() -> None:
    deadline = time.monotonic() + LOCK_WAIT
    while True:
        try:
            fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            return
        except FileExistsError:
            try:
                holder = int(LOCK_FILE.read_text(encoding="utf-8").strip() or "0")
            except (OSError, ValueError):
                holder = 0
            if holder and not pid_alive(holder):  # the holder died mid-call: its lock means nothing any more
                try:
                    LOCK_FILE.unlink()
                except OSError:
                    pass
                continue
            if time.monotonic() > deadline:
                raise TimeoutError(f"the graph stayed busy for {LOCK_WAIT} s (pid {holder})")
            await asyncio.sleep(0.2)


def drop_lock() -> None:
    try:
        if LOCK_FILE.read_text(encoding="utf-8").strip() == str(os.getpid()):
            LOCK_FILE.unlink()
    except OSError:
        pass


def status() -> int:
    counts = {"entities": 0, "relationships": 0, "chunks": 0}
    graph_file = WORK / "graph_chunk_entity_relation.graphml"
    chunks_file = WORK / "kv_store_text_chunks.json"
    try:
        if graph_file.exists():
            import networkx
            graph = networkx.read_graphml(graph_file)
            counts["entities"], counts["relationships"] = graph.number_of_nodes(), graph.number_of_edges()
        if chunks_file.exists():
            counts["chunks"] = len(json.loads(chunks_file.read_text(encoding="utf-8")))
    except Exception as error:  # a file being written at this instant
        return refusal("busy", str(error)[:200])
    return answer({
        "ok": True, **counts, "lightrag": importlib.metadata.version("lightrag-hku"), "embedModel": EMBED_MODEL,
        "keyFound": bool(openai_key()) if EMBED_URL == OPENAI_URL else True,
        "busy": bool(LOCK_FILE.exists()),
    })


async def work(op: str, request: dict) -> int:
    import aiohttp
    import numpy as np
    from lightrag import LightRAG, QueryParam
    from lightrag.utils import EmbeddingFunc

    session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60))

    async def embed(texts: list, **_kwargs):
        key = openai_key() if EMBED_URL == OPENAI_URL else ENV.get("GRAPH_EMBED_KEY", "")
        if EMBED_URL == OPENAI_URL and not key:
            raise RuntimeError("no OpenAI key: save it on the node's screen, or in this element's .env.local")
        async with session.post(f"{EMBED_URL}/embeddings", headers={"Authorization": f"Bearer {key}"} if key else {},
                                json={"model": EMBED_MODEL, "input": list(texts)}) as reply:
            body = await reply.json(content_type=None)
            if reply.status == 401 and EMBED_URL == OPENAI_URL:
                raise RuntimeError("OpenAI refused the key (401): replace it on the node's screen")
            if reply.status != 200:
                error = body.get("error") if isinstance(body, dict) else None
                message = error.get("message", "") if isinstance(error, dict) else str(body)
                raise RuntimeError(f"embeddings answered {reply.status}: {message[:200]}")
        COUNTS["embedCalls"] += 1
        COUNTS["embedTexts"] += len(texts)
        rows = sorted(body["data"], key=lambda row: row["index"])
        return np.array([row["embedding"] for row in rows], dtype=np.float32)

    async def no_llm(*_args, **_kwargs):
        COUNTS["llmCalls"] += 1
        raise RuntimeError("the graph element calls no language model: send a ready graph, and keywords with a question")

    WORK.mkdir(parents=True, exist_ok=True)
    await take_lock()
    try:
        rag = LightRAG(working_dir=str(WORK), llm_model_func=no_llm,
                       embedding_func=EmbeddingFunc(embedding_dim=EMBED_DIMS, max_token_size=8192, func=embed))
        await rag.initialize_storages()
        try:
            if op == "insert":
                await rag.ainsert_custom_kg(request)
                return {"ok": True, **{part: len(rows) for part, rows in request.items()}, **COUNTS}, 0
            param = QueryParam(mode=request["mode"], hl_keywords=request["hl_keywords"], ll_keywords=request["ll_keywords"],
                               enable_rerank=False)
            for name in ("top_k", "chunk_top_k"):
                if name in request:
                    setattr(param, name, request[name])
            result = await rag.aquery_data(request["query"], param)
            data = result.get("data") or {}
            # LightRAG reports «nothing relevant» as a failure; for the caller it is an answer: found nothing.
            found = result.get("status") == "success"
            body = {"ok": found or result.get("message") in NO_RESULT, "found": found, "message": result.get("message", ""),
                    "entities": data.get("entities", []), "relationships": data.get("relationships", []),
                    "chunks": data.get("chunks", []), **COUNTS}
            return body, 0 if body["ok"] else 1
        finally:
            await rag.finalize_storages()
    finally:
        drop_lock()
        await session.close()


def main() -> int:
    logging.basicConfig(level=logging.WARNING)
    for name in ("lightrag", "nano-vectordb"):
        logging.getLogger(name).setLevel(logging.WARNING)
    op = sys.argv[1] if len(sys.argv) > 1 else ""
    if op not in ("insert", "query", "status"):
        return answer({"ok": False, "error": "usage", "detail": "graph.py <insert|query|status> < request.json"}, 2)
    if DATA is None:
        # A relative path would put the graph inside a build and lose it at the next rebuild (node law 259-260).
        return answer({"ok": False, "error": "setup", "detail": "SERVICE_DATA_DIR must be an absolute path"}, 2)
    if op == "status":
        return status()
    try:
        request = json.loads(sys.stdin.buffer.read().decode("utf-8") or "{}")
    except ValueError as error:
        return refusal("json", str(error)[:200])
    shaped = shape_graph(request) if op == "insert" else shape_query(request)
    if isinstance(shaped, str):
        return refusal("request", shaped)
    try:
        body, code = asyncio.run(work(op, shaped))
    except Exception as error:  # what the store kept is kept; the caller sees the reason
        reason = str(error)
        # LightRAG wraps the embedding failure in its own words; the two causes a person can fix get their own names.
        kind = "key_refused" if "OpenAI refused the key" in reason else "no_key" if "no OpenAI key" in reason else op
        return refusal(kind, reason[:300])
    return answer(body, code)


if __name__ == "__main__":
    sys.exit(main())
