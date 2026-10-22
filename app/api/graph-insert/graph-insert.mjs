// The work of the door POST /api/graph-insert: add a ready graph of entities, relationships and chunks (node step 540-5).
// The shape of a graph and its checks live once — in services/graph/graph.py; this door only queues the run and maps its answer:
// 200 with the counts · 400 { error: 'bad_request', reason } naming the field · 503 not installed or busy · 502 the run failed.
import { runGraph, toHttp } from '../../../lib/graph/run.mjs'

export async function handle(input) {
  return toHttp(await runGraph('insert', input))
}
