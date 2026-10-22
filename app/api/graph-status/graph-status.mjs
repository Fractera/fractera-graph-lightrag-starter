// The work of the door GET /api/graph-status: tell whether the graph is installed and how big it is (node step 540-5).
// Read from the files, without opening LightRAG: { installed, entities, relationships, chunks, lightrag, python, embedModel,
// keyFound, busy }. Not installed is an answer (installed false, the reason), not an error.
import { graphStatus, toHttp } from '../../../lib/graph/run.mjs'

// The route passes the query string as an object; the status needs none of it.
export async function handle(_input) {
  return toHttp(await graphStatus())
}
