# `widget-dynamic-graph-search` — status and search of the knowledge graph

Node step 540-5. The island of the page `_pages/graph` («Knowledge graph»), architect only.

- **What it shows:** how many entities, links and fragments the graph holds, the LightRAG and Python versions, whether an OpenAI key
  was found; a search field that sends the person's words to the graph and lists the entities, links and fragments it finds.
- **Its door:** `../../../api/graph/route.ts` → `/<lang>/admin/api/graph` — `GET` the status, `POST { text }` the search. The door
  checks the architect role by session and calls `lib/graph/run.mjs` (one graph run at a time, `services/graph/graph.py`).
- **No language model:** the person's words become the keywords of the query (`ll_keywords` and `hl_keywords`), so only the vectors
  are computed (OpenAI embeddings, the core's key first, then the element's).
- **Words:** `ui.i18n.ts` (en, ru); the server passes them as props from `_widgets/index.tsx`.
- **When the door fails** (the computer is off, the graph did not answer): the frame stays and one line names the reason —
  no key, the key refused (401), not installed, busy, or did not answer.
