// The work of the door POST /api/graph-query: find entities, relationships and chunks by the caller's keywords (node step 540-5).
// No language model is called: the caller brings hl_keywords and/or ll_keywords (or uses mode naive). The checks live once — in
// services/graph/graph.py; this door queues the run and maps its answer: 200 { found, entities, relationships, chunks } · 400 · 503 · 502.
import { runGraph, toHttp } from '../../../lib/graph/run.mjs'

export async function handle(input) {
  return toHttp(await runGraph('query', input))
}
