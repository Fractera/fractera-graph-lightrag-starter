# Fractera Graph — the knowledge graph of the node

The node's shared knowledge graph on LightRAG: elements store what they learn and ask it later. Since **v1.0.0** (node step 549-4)
this element is built on the Fractera native element template (before: a copy of the custom element roman). Its own content is the
home page approved by the owner on 2026-10-19 (`app/[lang]/(publicLayer)/_data/`, 14 blocks in en and ru) and the blocks it needs —
`block-cards`, `block-card`, `block-flow`, `block-metrics`, `block-section-separator` (from the node blocks). The LightRAG server itself is a
separate step (owner 2026-10-21: «Элемент графа сейчас, LightRAG — отдельно»).

---

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
