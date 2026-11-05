"""The graph of this element: LightRAG over its SDK, ONE operation per run (node step 540-3; the mode — 540-4).

Owner 2026-10-22, the mode, verbatim: «На каждый вызов (Рекомендую)». A resident graph process held ~190 MB, so there is none: each
call of the element's doors starts Python for one operation and the process ends with it. Calls take turns through a lock file.

    python -I services/graph/graph.py <insert|query|status>    request JSON on stdin, answer JSON (one line) on stdout

  insert   a ready graph: {chunks: [{content, source_id, file_path?}],
                           entities: [{entity_name, entity_type, description, source_id, file_path?}],
                           relationships: [{src_id, tgt_id, description, keywords, weight?, source_id, file_path?}]}
           every entity and relationship names, by source_id, a chunk of the same insert; `file_path` is where the knowledge comes
           from — `external-study:<task>` for a product studied by reverse engineering (node step 590-1)
  query    {query, mode?, hl_keywords?, ll_keywords?, top_k?, chunk_top_k?, threshold?} → {found, entities, relationships, chunks,
           notice?} — retrieval without generation (aquery_data); nothing relevant is ok with found false; every mode but `naive`
           needs the caller's keywords: no language model is ever called here. Every item carries `origin`: `external-study` or `node`
           `threshold` (0 < t < 1, optional) — LightRAG's own cosine_better_than_threshold for this one query (node step 598-2):
           the vector stores return only what is at least this close. Without it — LightRAG's default 0.2, which lets almost
           anything through, so «nothing close enough» never comes; the node's skills search asks for a stricter one
           One process holds ~190-200 MB while it runs: the caller runs one call at a time (the lock guards the files, not memory)
  status   {} → counts of entities, relationships and chunks, read from the files without opening LightRAG

  space    every request may name `space` — a store of its own, apart from the shared graph (node step 596-1): the node's deep
           memory keeps what a person said in `space: "memory"`, so the skills of other projects (595-3) and studied products (590)
           never come back as facts of that person's life, and the shared graph never sees the person's facts. No `space` — the
           shared graph, exactly as before.

Exit code 0 — ok; 1 — a refusal named in the answer {"ok": false, "error", "detail"}; 2 — the element is set up wrong.
The graph: <SERVICE_DATA_DIR>/lightrag/ (absolute, outside every build); a space: <SERVICE_DATA_DIR>/spaces/<space>/; the lock (one for
all, it guards the memory of the machine too): <SERVICE_DATA_DIR>/lightrag.lock (the pid inside).
The vectors come from the node's own element embeddings (node step 626-5): texts in, vectors out, on this computer, no key; the model
and the size are the ones it names. A graph counted by another model is set aside whole at the first run (see set_aside_other_model).
"""

import asyncio
import importlib.metadata
import json
import logging
import os
import re
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

# 626-5: THE VECTORS COME FROM THE NODE'S OWN ELEMENT embeddings (paraphrase-multilingual-MiniLM-L12-v2, 384 numbers, on this computer, no
# key). Its address is the installer's answer (EMBEDDINGS_URL, the neighbour rule); its doors take the node key every element shares
# (SETTINGS_SECRET, sent as X-Node-Key). The model and the size are asked at every run — one call on this computer.
# 🪦 Until 626 OpenAI counted them (text-embedding-3-small, 1536) with the core's key or the element's own.
EMBEDDINGS_URL = (ENV.get("EMBEDDINGS_URL") or "").strip().rstrip("/")
NODE_KEY = ENV.get("SETTINGS_SECRET", "")
MODES = {"local", "global", "hybrid", "naive", "mix"}
NO_RESULT = ("Query returned no results", "No relevant document chunks found.")  # lightrag 1.5.7, aquery_data
LIMITS = {"chunks": 2000, "entities": 5000, "relationships": 10000, "text": 50000}
COUNTS = {"llmCalls": 0, "embedCalls": 0, "embedTexts": 0}
# ORIGIN (node step 590-1). The owner of the node, 2026-10-23: «проверь что граф при работе с реверс-инжиниринг очень чётко размечает
# его как то что это не наш кот а это источник» — an agent must never take a studied product for this node's own code. LightRAG keeps
# `file_path` with every chunk, entity and relationship and gives it back on a query; the reverse engineering element writes
# `external-study:<task>` there, and every item of a query answer is marked by it.
FILE_PATH_MAX = 300
# SPACE (node step 596-1): the name of a caller's own store. Lower-case latin, digits and dashes — it becomes a folder name, so
# nothing that could climb out of <SERVICE_DATA_DIR>/spaces/ is accepted.
# 654-4: and an element's own space — `el-<element id>` or `el-<element id>.<name>` (the doors put it in from the caller's key,
# lib/graph/whose.mjs); one dot at most, between two non-empty parts, so no name is `..` or climbs anywhere.
SPACE = re.compile(r"^(?:[a-z][a-z0-9-]{0,31}|el-[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z][a-z0-9-]{0,31})?)$")
SPACE_RULE = "^[a-z][a-z0-9-]{0,31}$, or an element's el-<id>[.<name>]"
EXTERNAL = re.compile(r"external-study:([A-Za-z0-9._-]+)")
NOTICE = ("Items with origin external-study describe a product studied by reverse engineering ({tasks}): a source to learn how it "
          "works, never this node's code, pages, routes or data.")


def embeddings_status() -> dict:
    """{model, dims, ready, ...} as the node's embeddings element names them; raises with the reason (no address, no answer)."""
    if not EMBEDDINGS_URL:
        raise RuntimeError("EMBEDDINGS_URL is empty — the node has no embeddings element (npm run services:install)")
    import urllib.request
    request = urllib.request.Request(f"{EMBEDDINGS_URL}/api/embed-status", headers={"X-Node-Key": NODE_KEY})
    try:
        with urllib.request.urlopen(request, timeout=10) as reply:
            return json.loads(reply.read().decode("utf-8"))
    except Exception as error:
        raise RuntimeError(f"the embeddings element did not answer: {error}") from error


def set_aside_other_model(model: str, dims: int) -> None:
    """626-5: a graph counted by another model is set aside WHOLE — `lightrag/` and `spaces/` renamed `<name>.<old model>-<date>/` beside
    them, never read again, nothing deleted (the owner, 2026-11-02: «Нет, начать с чистого листа») — and the new graph starts empty.
    The model is recorded in <SERVICE_DATA_DIR>/embed-model.json; a graph on the disk with no record was counted by OpenAI (before 626).
    Called under the lock, so two runs never move the same folder."""
    mark = DATA / "embed-model.json"
    try:
        recorded = json.loads(mark.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        recorded = None
    if isinstance(recorded, dict) and recorded.get("model") == model and recorded.get("dims") == dims:
        return
    old = recorded.get("model") if isinstance(recorded, dict) else None
    tag = (re.sub(r"[^a-z0-9]+", "-", str(old).lower()).strip("-") or "other") if old else "openai"
    day = time.strftime("%Y-%m-%d")
    for name in ("lightrag", "spaces"):
        folder = DATA / name
        if not folder.exists():
            continue
        target, n = DATA / f"{name}.{tag}-{day}", 2
        while target.exists():
            target, n = DATA / f"{name}.{tag}-{day}-{n}", n + 1
        folder.rename(target)
    DATA.mkdir(parents=True, exist_ok=True)
    mark.write_text(json.dumps({"model": model, "dims": dims}) + "\n", encoding="utf-8")


def text(value) -> bool:
    return isinstance(value, str) and value.strip() != "" and len(value) <= LIMITS["text"]


def store_of(body):
    """Where this request's graph lives: the shared one, or the caller's own space (node step 596-1); a bad name is a refusal."""
    name = body.get("space") if isinstance(body, dict) else None
    if name is None:
        return WORK, None
    if not isinstance(name, str) or not SPACE.fullmatch(name):
        return None, f"space must match {SPACE_RULE} — the name of the caller's own store"
    return DATA / "spaces" / name, None


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
            if "file_path" in item:
                where_from = item["file_path"]
                if not isinstance(where_from, str) or not where_from.strip() or len(where_from) > FILE_PATH_MAX:
                    return f"{part}[{index}].file_path must be a non-empty string of at most {FILE_PATH_MAX} characters"
                row["file_path"] = where_from.strip()
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
    threshold = body.get("threshold")
    if threshold is not None:
        if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not 0 < threshold < 1:
            return "threshold must be a number between 0 and 1"
        sizes["threshold"] = float(threshold)
    return {"query": body["query"], "mode": mode, **words, **sizes}


def mark_origin(body: dict) -> None:
    """Every entity, relationship and chunk of a query answer gets `origin`; a studied product adds one `notice` (node step 590-1)."""
    tasks: list = []
    for part in ("entities", "relationships", "chunks"):
        for item in body.get(part) or []:
            if not isinstance(item, dict):
                continue
            found = EXTERNAL.findall(str(item.get("file_path") or ""))
            item["origin"] = "external-study" if found else "node"
            tasks += [task for task in found if task not in tasks]
    if tasks:
        body["notice"] = NOTICE.format(tasks=", ".join(tasks[:5]))


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
    try:
        e = embeddings_status()
        embeddings = {"model": e.get("model"), "dims": e.get("dims"), "ready": bool(e.get("ready"))}
    except RuntimeError as error:
        embeddings = {"ready": False, "error": str(error)[:200]}
    return answer({
        "ok": True, **counts, "lightrag": importlib.metadata.version("lightrag-hku"), "embedModel": embeddings.get("model"),
        "embedDims": embeddings.get("dims"), "embeddings": embeddings, "busy": bool(LOCK_FILE.exists()),
    })


async def work(op: str, request: dict) -> int:
    import aiohttp
    import numpy as np
    from lightrag import LightRAG, QueryParam
    from lightrag.utils import EmbeddingFunc

    session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60))

    async def embed(texts: list, **_kwargs):
        vectors = []
        for start in range(0, len(texts), 256):  # the door takes at most 256 texts a call
            async with session.post(f"{EMBEDDINGS_URL}/api/embed", headers={"X-Node-Key": NODE_KEY},
                                    json={"texts": list(texts[start:start + 256])}) as reply:
                body = await reply.json(content_type=None)
                if reply.status != 200:
                    reason = body.get("reason", "") if isinstance(body, dict) else str(body)
                    raise RuntimeError(f"embeddings answered {reply.status}: {str(reason)[:200]}")
            vectors += body["vectors"]
        COUNTS["embedCalls"] += 1
        COUNTS["embedTexts"] += len(texts)
        return np.array(vectors, dtype=np.float32)

    async def no_llm(*_args, **_kwargs):
        COUNTS["llmCalls"] += 1
        raise RuntimeError("the graph element calls no language model: send a ready graph, and keywords with a question")

    DATA.mkdir(parents=True, exist_ok=True)
    await take_lock()
    try:
        model = embeddings_status()
        if not model.get("model") or not isinstance(model.get("dims"), int):
            raise RuntimeError("the embeddings element named no model")
        set_aside_other_model(model["model"], model["dims"])
        WORK.mkdir(parents=True, exist_ok=True)
        strict = {"cosine_better_than_threshold": request["threshold"]} if op == "query" and "threshold" in request else {}
        # max_token_size stays 8192: LightRAG reads it as the limit for summarizing descriptions, and a smaller one would make it call a
        # language model this element does not have; the embeddings element cuts every text at its model's 128 tokens itself.
        rag = LightRAG(working_dir=str(WORK), llm_model_func=no_llm,
                       embedding_func=EmbeddingFunc(embedding_dim=model["dims"], max_token_size=8192, func=embed), **strict)
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
            mark_origin(body)
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
    try:
        request = json.loads(sys.stdin.buffer.read().decode("utf-8") or "{}")
    except ValueError as error:
        return refusal("json", str(error)[:200])
    # 596-1: the shared graph or the caller's own space — decided once, here, for every operation below.
    global WORK
    where, problem = store_of(request)
    if problem:
        return refusal("request", problem)
    WORK = where
    if op == "status":
        return status()
    shaped = shape_graph(request) if op == "insert" else shape_query(request)
    if isinstance(shaped, str):
        return refusal("request", shaped)
    # 654-4: a question to a space nobody has written into is answered «nothing», and no folder is made for it — a read never creates
    # a store (✗ 2026-11-05 on the owner's node: an empty `spaces/memory` was left by a query).
    if op == "query" and request.get("space") is not None and not WORK.exists():
        return answer({"ok": True, "found": False, "message": "no such space yet", "entities": [], "relationships": [], "chunks": [],
                       **COUNTS}, 0)
    try:
        body, code = asyncio.run(work(op, shaped))
    except Exception as error:  # what the store kept is kept; the caller sees the reason
        reason = str(error)
        # LightRAG wraps the embedding failure in its own words; the cause a person can fix gets its own name.
        kind = "embeddings_unavailable" if ("embeddings" in reason and ("did not answer" in reason or "answered" in reason or "EMBEDDINGS_URL" in reason or "named no model" in reason)) else op
        return refusal(kind, reason[:300])
    return answer(body, code)


if __name__ == "__main__":
    sys.exit(main())
