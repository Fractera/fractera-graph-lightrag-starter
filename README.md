# Fractera Graph — the knowledge graph of the node

The node's shared knowledge graph on LightRAG: elements store what they learn and ask it later. Since **v1.0.0** (node step 549-4)
this element is built on the Fractera native element template (before: a copy of the custom element roman). Its own content is the
home page approved by the owner on 2026-10-19 (`app/[lang]/(publicLayer)/_data/`, 14 blocks in en and ru) and the blocks it needs —
`block-cards`, `block-card`, `block-flow`, `block-metrics`, `block-section-separator` (from the node blocks). The LightRAG server itself is a
separate step (owner 2026-10-21: «Элемент графа сейчас, LightRAG — отдельно»).

---

## In the Fractera project

The node's knowledge graph on LightRAG: elements store what they learn and ask it later. The LightRAG server itself is a separate program.

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
