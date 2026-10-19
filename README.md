# fractera-graph-lightrag-starter

The graph element of a Fractera node: a LightRAG knowledge graph for the node's elements. It is a service element, one of the
native elements that work for the node itself instead of showing a site to visitors.

Its first version, `v0.1.0`, is the standard service element: a copy of the standard custom element (roman, the reference behind
`fractera-item-starter`) with its own history. It keeps every function of the custom element for now; the ones a service element
does not need will be removed in a later step. The passport, the site settings and the development documents are the seed versions
of `fractera-item-starter`, not roman's own. The versions after it add the graph.

A service element is a **replaceable element**, like the node's auth and data elements: its own repository, its own port, a pinned
tag in the node's `WEB4-ITEMS-REGISTRY/web4-items.json`. The node's core is not touched when one element replaces another.

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
PORT=24689 node .next/standalone/server.js
```

License: MIT.
