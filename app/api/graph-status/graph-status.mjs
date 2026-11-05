// The work of the door GET /api/graph-status: tell whether the graph is installed and how big it is (node step 540-5).
// Read from the files, without opening LightRAG: { installed, entities, relationships, chunks, lightrag, python, embedModel, embedDims,
// embeddings: { model, dims, ready } or { ready: false, error }, busy } (626-5: the vectors come from the node's embeddings element).
// Not installed is an answer (installed false, the reason), not an error.
// 654-4: an element's own key gets the counts of its own spaces only — `spaces: [{ space, entities, relationships, chunks }]` by its own
// names (`null` for its home space `el-<id>`), the totals summed over them; the shared graph's counts never reach it.
import { graphStatus, toHttp } from '../../../lib/graph/run.mjs'
import { ownName, ownSpaces } from '../../../lib/graph/whose.mjs'

// The route passes the query string as an object; the status needs none of it.
export async function handle(_input) {
  return toHttp(await graphStatus())
}

/** The status as an element sees it: the graph's state and the counts of its own spaces. */
export async function handleElement(id) {
  const spaces = ownSpaces(id)
  if (spaces === null) return { status: 503, body: { error: 'setup', reason: 'SERVICE_DATA_DIR must be an absolute path' } }
  const base = await graphStatus()
  if (base.code !== 0 || base.body?.installed === false) return toHttp(base)
  const own = []
  for (const space of spaces) {
    const run = await graphStatus(space)
    if (run.code !== 0) return toHttp(run)
    own.push({ space: ownName(id, space), entities: run.body.entities, relationships: run.body.relationships, chunks: run.body.chunks })
  }
  const sum = (part) => own.reduce((n, s) => n + (Number(s[part]) || 0), 0)
  return toHttp({ code: 0, body: { ...base.body, entities: sum('entities'), relationships: sum('relationships'), chunks: sum('chunks'), spaces: own } })
}
