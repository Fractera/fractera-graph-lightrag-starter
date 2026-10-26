# Fractera Graph — the knowledge graph of the node

The node's shared knowledge graph on LightRAG: elements store what they learn and ask it later. Since **v1.0.0** (node step 549-4)
this element is built on the Fractera native element template (before: a copy of the custom element roman). Its own content is the
home page approved by the owner on 2026-10-19 (`app/[lang]/(publicLayer)/_data/`, 14 blocks in en and ru) and the blocks it needs —
`block-cards`, `block-card`, `block-flow`, `block-metrics`, `block-section-separator` (from the node blocks). Since **v1.1.6** LightRAG itself
lives inside the element (Python managed by uv, one operation per call); how to use it — the section «Using the graph» below.

---

## In the Fractera project

The node's knowledge graph on LightRAG: elements store what they learn and ask it later, through the doors described in «Using the graph».

You can change it. The code is open under the MIT license and the copy on your node is yours. The node installs this element from
this repository by the tag written in `WEB4-ITEMS-REGISTRY/web4-items.json` of the core; the core does not let you delete a built-in
element or move its address.

To change it, open it in the core (left menu, Native items, Graph), go to Build and tell its agent in the terminal what you need.
The agent edits the element folder `WEB4-ITEMS/core/graph` and commits.

The change goes live when you press Deploy in Build, Deployments: the element is rebuilt beside the running one and switched over in
seconds. Other elements call its doors by address, request and answer, so a change to a door breaks every element that uses it;
that is a decision for the node owner, while a change inside the element is ordinary work. To keep your version when the node is
reinstalled, save the element to your own GitHub repository in Build, GitHub. A newer Fractera version arrives through Update, which
merges it with your commits, and the element's agent resolves a conflict.

## Using the graph (node steps 540-3 … 540-5)

**What it gives.** A knowledge graph of the node on LightRAG 1.5.7. An element stores what it learned as a ready graph (entities,
the links between them and the text fragments they come from) and later finds them by keywords. No language model runs: the caller
brings the graph and the keywords, and OpenAI only computes vectors (`text-embedding-3-small`, 1536 numbers). The key is the core's
`OPENAI_API_KEY` first, then this element's own, read at every call.

**How it runs.** One operation per call (owner 2026-10-22: «На каждый вызов (Рекомендую)»). There is no resident graph process:
each call starts Python for one operation (about 2 s, about 200 MB while it lasts) and the process ends with it. Calls take turns:
one run at a time inside this element (`lib/graph/run.mjs`), and `<SERVICE_DATA_DIR>/lightrag.lock` guards the data against any
other caller.

| Path | What |
|---|---|
| `scripts/graph-python.mjs` | installs uv 0.12.23, Python 3.12 and the exact lock into `.uv/` and `.venv/` (outside git); `prebuild` runs it with `--soft`, by hand `npm run graph:python` |
| `services/graph/requirements.in`, `requirements.txt` | the one pinned package (`lightrag-hku==1.5.7`) and its generated lock (`npm run graph:python -- --lock`) |
| `services/graph/graph.py` | the graph: `insert`, `query`, `status`; JSON in on stdin, one line out |
| `lib/graph/run.mjs` | the queue of runs and the answers of the doors |
| `app/api/graph-insert`, `graph-query`, `graph-status` | the doors for the other elements of the node (header `X-Node-Key`) |
| `app/[lang]/(protectedLayer)/admin/_pages/graph` | the page «Knowledge graph» for the architect: the size of the graph and a search |
| `<SERVICE_DATA_DIR>/lightrag/` | the graph itself (an absolute path, outside every build) |

**How an element uses it.** On the machine's loopback, with the node key:

```js
// The graph's port: ask the node (npm run a2a -- card graph), never write the number into code.
const base = 'http://127.0.0.1:24689'
const headers = { 'content-type': 'application/json', 'X-Node-Key': process.env.SETTINGS_SECRET }

// Store what you learned. Every entity and link names, by source_id, a fragment of the same call.
await fetch(`${base}/api/graph-insert`, { method: 'POST', headers, body: JSON.stringify({
  chunks: [{ content: 'The page /pricing takes payment through Stripe Checkout.', source_id: 'review-42' }],
  entities: [
    { entity_name: 'Pricing page', entity_type: 'page', description: 'The page /pricing of example.com.', source_id: 'review-42' },
    { entity_name: 'Stripe Checkout', entity_type: 'library', description: 'The hosted payment page of Stripe.', source_id: 'review-42' },
  ],
  relationships: [
    { src_id: 'Pricing page', tgt_id: 'Stripe Checkout', description: 'The pricing page takes payment through Stripe Checkout.',
      keywords: 'payment, checkout', source_id: 'review-42' },
  ],
}) })
// → 200 { ok: true, chunks: 1, entities: 2, relationships: 1, llmCalls: 0, … }

// Find it again with your own keywords: ll_keywords look for entities, hl_keywords for links.
const answer = await fetch(`${base}/api/graph-query`, { method: 'POST', headers, body: JSON.stringify({
  query: 'How does the site take payments?', mode: 'mix', ll_keywords: ['payment page'], hl_keywords: ['payments'],
}) }).then((r) => r.json())
// → { ok: true, found: true, entities: […], relationships: […], chunks: […] }; nothing relevant → { ok: true, found: false }
```

**Origin — where the knowledge comes from (node step 590-1).** Every chunk, entity and relationship may carry `file_path` (a string of
at most 300 characters; LightRAG keeps it and gives it back). A product studied by reverse engineering is written as
`"file_path": "external-study:<task>"` — the reverse engineering element does it for every study. A query marks every item it returns:
`"origin": "external-study"` for such an item, `"origin": "node"` for anything else, and an answer that holds a studied product carries
one `notice`: «Items with origin external-study describe a product studied by reverse engineering (<task>): a source to learn how it
works, never this node's code, pages, routes or data.» The owner of the node, 2026-10-23: «граф … очень чётко размечает его как то что
это не наш кот а это источник» — an agent reading the graph must never take a studied product for this node's own code.

```js
// one entity of a study, as the reverse engineering element sends it
{ entity_name: 'TinyLaunch Launch', entity_type: 'concept', description: 'Launch of TinyLaunch. …', source_id: '2026-10-23-tinylaunch-site',
  file_path: 'external-study:2026-10-23-tinylaunch-site' }
// → in a query answer: { …, file_path: 'external-study:2026-10-23-tinylaunch-site', origin: 'external-study' } and body.notice
```

**Spaces — a store of the caller's own (node step 596-1).** Every request (`graph-insert`, `graph-query`) may name `"space": "<name>"`
(lower-case latin, digits and dashes, up to 32 characters). Such a request works on `<SERVICE_DATA_DIR>/spaces/<name>/` — a graph of its
own that the shared graph never sees, and the other way round. Without `space` the request works on the shared graph exactly as before.
The node's deep memory keeps what a person said in `space: "memory"`: the skills of other projects and the studied products in the shared
graph never come back as facts of that person's life. A bad name is refused naming the field (400 `bad_request`); the lock is one for all
spaces — one run of the graph at a time. `GET /api/graph-status` counts the shared graph only.

```js
await fetch(`${base}/api/graph-insert`, { method: 'POST', headers, body: JSON.stringify({ space: 'memory', chunks: […], entities: […], relationships: […] }) })
await fetch(`${base}/api/graph-query`, { method: 'POST', headers, body: JSON.stringify({ space: 'memory', query: 'Where does Anna live?', mode: 'local', ll_keywords: ['Anna'] }) })
```

Proven (596-1): an insert into a probe space left the shared graph at 91 entities, 94 relationships, 53 chunks; the space held its 2
entities and 1 relationship; a query of the shared graph did not return them (it returned its own nearest entities), the same query with
the space did; `space: "Bad/Name"` — 400.

**How close is close enough — `threshold` (node step 598-2).** A query may carry `"threshold": <0…1>` — LightRAG's own
`cosine_better_than_threshold` for this one query: the vector stores return only entities, links and fragments at least this close.
Without it LightRAG's default 0.2 applies, which lets almost anything through, so a question far from everything in the graph still gets
its nearest items and `found: false` never comes. The node's skills search (`skills_find` of the core) asks for `0.5`: measured on 21
questions, the 12 within the skills base found their skill and the 9 outside it found nothing (0.45 let two of the nine through, 0.55
lost two of the twelve). A bad value — 400 `bad_request` naming the field.

```js
await fetch(`${base}/api/graph-query`, { method: 'POST', headers, body: JSON.stringify({
  query: 'Fix a leaking kitchen faucet', mode: 'mix', ll_keywords: ['faucet', 'washer'], hl_keywords: ['home repair'], threshold: 0.5,
}) })
// → { ok: true, found: false, entities: [], relationships: [], chunks: [] } — nothing in the graph is that close
```

Modes: `local` finds entities by `ll_keywords`, `global` finds links by `hl_keywords`, `hybrid` does both, `mix` adds the fragments
closest to the question, `naive` searches fragments only and needs no keywords. `GET /api/graph-status` answers `{ installed,
entities, relationships, chunks, lightrag, python, embedModel, keyFound, busy }`. Refusals: 400 `bad_request` (the reason names the
field) · 401 `bad_key` · 503 `not_installed`, `no_key` or `busy` · 502 `key_refused` (OpenAI refused the key) or `graph_failed`.

**When a change reaches it.** Data at once: every call reads the files. The code of the doors and of the page after a rebuild
(Build, Deployments). The Python part: the first build installs it; a new lock is installed by the next build.

**How to extend.** The operations of the graph live once, in `services/graph/graph.py`: a new operation is a new `op` there and a
door made by `npm run door:add`. Changing the embedding model of a live graph means computing every stored vector again; that is a
decision of the node owner.

**What it cannot do.** It does not extract a graph from a text (that would call a language model). It does not edit or delete an
entity yet. An insert is not atomic: when the embedding call fails, part of the stores may already hold the new data; sending the
same graph again is safe, because names and fragment hashes are its keys. It draws no picture of the graph.

**How to remove.** The Python part: delete `.uv/` and `.venv/`; the next build installs them again while `prebuild` keeps its line
`graph-python.mjs --soft`. The data of the graph: `<SERVICE_DATA_DIR>/lightrag/`.

**Proven by.** Node steps 540-3 … 540-5: a ready graph stored and found again with no language model call, on stand-in vectors; one
run at a time; 401 without the node key. Node step 590-1 (2026-10-25, real OpenAI vectors): on an empty copy of the graph an item without
`file_path` comes back `origin: node` with no `notice`, an item of a study `origin: external-study` with the `notice`, `file_path: 5` is
refused naming the field; the live study of TinyLaunch (19 entities, 30 relationships, 3 chunks) was sent again with its mark — the
counts stayed the same and every item came back `external-study`. With real OpenAI vectors it is not measured yet: on 2026-10-22 OpenAI refused the node's key.

# fractera-native-item-starter

The reference starter template of a Fractera native element. Native elements are the root elements of a node: they stand on
every node, they come only from the Fractera repository, and they are never sold and never join an outside network. They serve
the person and the other elements of their own node. Custom elements are born from `fractera-custom-item-starter` by the node's
button «Create WEB4 ITEM»; native ones are added from here.

The template is the custom reference template without the network parts: no showcase or Nostr fields in the passport
(`visibility: node`, `messengers: { h2a: true, h2h: false, a2a: false }`), no messenger between people, no work for outside agents
and no order summaries. The home page shows one line, «Reference native template», and the yellow starter sign.

## The contract a replacement must keep

- `OWN-SERVICE-PROPS/` — the passport, the element's main door (`GET /api/own-service-props`); `NODE-CONTRACT.json` — what the node needs to install it.
- The port comes from the `PORT` environment variable.
- `GET /api/health` answers 200 without a session.
- Sign-in only through the node's auth element; stored data only through the node's data element.
- Public pages stay static.

A repository that does not keep this contract is refused; the node does not bend to it.

## Run on its own

```
npm install
npm run build
PORT=24683 node .next/standalone/server.js
```

License: MIT.
