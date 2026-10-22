"""The graph service of this element (node step 540-3): LightRAG over its SDK, on the loopback address of this computer only.

Owner 2026-10-22 (540 resumed by «Сначала LightRAG»): the subscription wherever it can be — the graph takes READY graphs from
agents (insert_custom_kg) and answers a question with the agent's own keywords, so no language model is ever called here.
OpenAI does one thing: the vectors (embeddings) of entities, relationships, chunks and of a question.

Doors, all JSON:
  GET  /health          alive — pid, startedAt, LightRAG version, counters of model calls; needs no key
  POST /insert   key    a ready graph: {chunks: [{content, source_id}],
                          entities: [{entity_name, entity_type, description, source_id}],
                          relationships: [{src_id, tgt_id, description, keywords, weight?, source_id}]}
  POST /query    key    {query, mode?, hl_keywords?, ll_keywords?, top_k?, chunk_top_k?} → entities, relationships, chunks
                        (aquery_data: retrieval without generation); every mode but `naive` needs keywords from the caller
The key travels in the header X-Graph-Key; its value is <SERVICE_DATA_DIR>/lightrag-service.key, written here on the first start.
Where it listens: <SERVICE_DATA_DIR>/lightrag-service.json {port, pid, startedAt}. The system picks the port at every start, so a
caller asks that file and never remembers a number. The graph itself: <SERVICE_DATA_DIR>/lightrag/ (absolute, outside every build).
"""

import asyncio
import importlib.metadata
import json
import logging
import os
import secrets
import signal
import socket
import sys
import time
from pathlib import Path

ELEMENT_DIR = Path(__file__).resolve().parents[2]
NODE_DIR = ELEMENT_DIR.parents[2]  # an element lives at <node>/WEB4-ITEMS/<kind>/<id>


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
if not DATA_DIR or not Path(DATA_DIR).is_absolute():
    # A relative path would put the graph inside a build and lose it at the next rebuild (node law 259-260).
    print("graph service: SERVICE_DATA_DIR must be an absolute path (.env.local of the element) — not started", file=sys.stderr)
    sys.exit(2)
DATA = Path(DATA_DIR)
WORK = DATA / "lightrag"
STATE_FILE = DATA / "lightrag-service.json"
KEY_FILE = DATA / "lightrag-service.key"
PORT = int(ENV.get("GRAPH_SERVICE_PORT") or 0)
# tiktoken reads this at call time; scripts/graph-python.mjs put the encodings there, so the service never downloads them.
os.environ.setdefault("TIKTOKEN_CACHE_DIR", str(ELEMENT_DIR / ".uv" / "tiktoken"))

import aiohttp  # noqa: E402
import numpy as np  # noqa: E402
from aiohttp import web  # noqa: E402
from lightrag import LightRAG, QueryParam  # noqa: E402
from lightrag.utils import EmbeddingFunc  # noqa: E402

logging.getLogger("lightrag").setLevel(logging.WARNING)

# The vectors of a live graph cannot change model or size: every stored vector would have to be made again.
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIMS = 1536
# Any OpenAI-compatible embeddings address (a local model, a probe). The OpenAI key goes to OpenAI only; another address gets
# its own GRAPH_EMBED_KEY, or no key at all.
OPENAI_URL = "https://api.openai.com/v1"
EMBED_URL = (ENV.get("GRAPH_EMBED_URL") or OPENAI_URL).rstrip("/")
MODES = {"local", "global", "hybrid", "naive", "mix"}
LIMITS = {"chunks": 2000, "entities": 5000, "relationships": 10000, "text": 50000}
STARTED = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
VERSION = importlib.metadata.version("lightrag-hku")
COUNTS = {"llmCalls": 0, "embedCalls": 0, "embedTexts": 0}


def openai_key() -> str:
    # Node law 336: the core's key first, otherwise the element's own. Read at every call, so a key saved on the node's screen
    # works from the next request without a restart.
    files = ([NODE_DIR / ".env.local"] if (NODE_DIR / "WEB4-ITEMS").is_dir() else []) + [ELEMENT_DIR / ".env.local"]
    for f in files:
        key = read_env_file(f).get("OPENAI_API_KEY", "")
        if key:
            return key
    return os.environ.get("OPENAI_API_KEY", "")


_session = None


async def embed(texts: list, **_kwargs) -> np.ndarray:
    global _session
    key = openai_key() if EMBED_URL == OPENAI_URL else ENV.get("GRAPH_EMBED_KEY", "")
    if EMBED_URL == OPENAI_URL and not key:
        raise RuntimeError("no OpenAI key: save it on the node's screen, or in this element's .env.local")
    if _session is None:
        _session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60))
    async with _session.post(
        f"{EMBED_URL}/embeddings",
        headers={"Authorization": f"Bearer {key}"} if key else {},
        json={"model": EMBED_MODEL, "input": list(texts)},
    ) as answer:
        body = await answer.json(content_type=None)
        if answer.status != 200:
            raise RuntimeError(f"embeddings answered {answer.status}: {str(body)[:200]}")
    COUNTS["embedCalls"] += 1
    COUNTS["embedTexts"] += len(texts)
    rows = sorted(body["data"], key=lambda row: row["index"])
    return np.array([row["embedding"] for row in rows], dtype=np.float32)


async def no_llm(*_args, **_kwargs):
    COUNTS["llmCalls"] += 1
    raise RuntimeError("the graph element calls no language model: send a ready graph, and keywords with a question")


rag = LightRAG(
    working_dir=str(WORK),
    llm_model_func=no_llm,
    embedding_func=EmbeddingFunc(embedding_dim=EMBED_DIMS, max_token_size=8192, func=embed),
)


def write_atomic(path: Path, text: str, private: bool = False) -> None:
    tmp = path.with_name(path.name + f".tmp-{os.getpid()}")
    tmp.write_text(text, encoding="utf-8")
    if private and os.name != "nt":
        os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def load_or_create_key() -> str:
    try:
        key = KEY_FILE.read_text(encoding="utf-8").strip()
        if len(key) >= 32:
            return key
    except OSError:
        pass
    key = secrets.token_urlsafe(32)
    write_atomic(KEY_FILE, key, private=True)
    return key


KEY = ""


def refused(request) -> bool:
    got = request.headers.get("X-Graph-Key", "")
    return not (got and secrets.compare_digest(got, KEY))


def bad(error: str, detail: str = "", status: int = 400):
    return web.json_response({"ok": False, "error": error, **({"detail": detail} if detail else {})}, status=status)


def text(value) -> bool:
    return isinstance(value, str) and value.strip() != "" and len(value) <= LIMITS["text"]


def shape_graph(body):
    """Only the documented fields of a ready graph pass on to LightRAG; anything else is a refusal that names the place."""
    if not isinstance(body, dict):
        return "body must be an object"
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


routes = web.RouteTableDef()


@routes.get("/health")
async def health(_request):
    return web.json_response({"ok": True, "pid": os.getpid(), "startedAt": STARTED, "lightrag": VERSION, **COUNTS})


@routes.post("/insert")
async def insert(request):
    if refused(request):
        return bad("key", status=401)
    try:
        body = await request.json()
    except Exception:
        return bad("json")
    graph = shape_graph(body)
    if isinstance(graph, str):
        return bad("graph", graph)
    try:
        await rag.ainsert_custom_kg(graph)
    except Exception as error:  # the store keeps what it wrote; the caller sees the reason
        return bad("insert", str(error)[:300], status=500)
    return web.json_response({"ok": True, **{part: len(rows) for part, rows in graph.items()}, **COUNTS})


@routes.post("/query")
async def query(request):
    if refused(request):
        return bad("key", status=401)
    try:
        body = await request.json()
    except Exception:
        return bad("json")
    if not isinstance(body, dict) or not text(body.get("query")):
        return bad("query", "query must be a non-empty string")
    mode = body.get("mode", "mix")
    if mode not in MODES:
        return bad("mode", f"one of {sorted(MODES)}")
    words = {}
    for name in ("hl_keywords", "ll_keywords"):
        value = body.get(name, [])
        if not isinstance(value, list) or not all(text(word) for word in value):
            return bad(name, "a list of non-empty strings")
        words[name] = value
    if mode != "naive" and not (words["hl_keywords"] or words["ll_keywords"]):
        return bad("keywords", "the graph calls no language model: send hl_keywords and/or ll_keywords, or use mode naive")
    param = QueryParam(mode=mode, enable_rerank=False, **words)
    for name in ("top_k", "chunk_top_k"):
        if isinstance(body.get(name), int) and 0 < body[name] <= 200:
            setattr(param, name, body[name])
    try:
        result = await rag.aquery_data(body["query"], param)
    except Exception as error:
        return bad("query", str(error)[:300], status=500)
    data = result.get("data") or {}
    return web.json_response({
        "ok": result.get("status") == "success",
        "message": result.get("message", ""),
        "entities": data.get("entities", []),
        "relationships": data.get("relationships", []),
        "chunks": data.get("chunks", []),
        **COUNTS,
    })


async def main() -> None:
    global KEY
    WORK.mkdir(parents=True, exist_ok=True)
    KEY = load_or_create_key()
    await rag.initialize_storages()
    app = web.Application(client_max_size=8 * 1024 * 1024)
    app.add_routes(routes)
    runner = web.AppRunner(app, access_log=None)
    await runner.setup()
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", PORT))
    await web.SockSite(runner, listener).start()
    port = listener.getsockname()[1]
    write_atomic(STATE_FILE, json.dumps({"port": port, "pid": os.getpid(), "startedAt": STARTED, "lightrag": VERSION}, indent=2) + "\n")
    print(f"===GRAPH_SERVICE_READY=== 127.0.0.1:{port} lightrag {VERSION}", flush=True)

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for name in ("SIGINT", "SIGTERM", "SIGBREAK"):
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), lambda *_: loop.call_soon_threadsafe(stop.set))
    try:
        await stop.wait()
    finally:
        await runner.cleanup()
        await rag.finalize_storages()
        if _session is not None:
            await _session.close()
        try:
            if json.loads(STATE_FILE.read_text(encoding="utf-8")).get("pid") == os.getpid():
                STATE_FILE.unlink()
        except (OSError, ValueError):
            pass


if __name__ == "__main__":
    asyncio.run(main())
