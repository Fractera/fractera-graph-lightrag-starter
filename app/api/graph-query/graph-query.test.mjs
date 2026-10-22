// Samples of the door graph-query (`npm run test:graph-query`): exit code 1 on any miss.
// Only refusals: they end in graph.py before LightRAG opens and before any embedding is asked for.
import { handle } from './graph-query.mjs'

let failures = 0
const expect = async (label, input, want) => {
  const got = await handle(input)
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`)
}

await expect('a question without keywords is refused: no language model here', { query: 'Who researches quantum computing?', mode: 'local' },
  { status: 400, body: { error: 'bad_request', reason: 'the graph calls no language model: send hl_keywords and/or ll_keywords, or use mode naive' } })
await expect('an unknown mode', { query: 'quantum computing', mode: 'bypass', ll_keywords: ['quantum computing'] },
  { status: 400, body: { error: 'bad_request', reason: "mode must be one of ['global', 'hybrid', 'local', 'mix', 'naive']" } })
await expect('an empty question', { query: '  ', ll_keywords: ['quantum computing'] },
  { status: 400, body: { error: 'bad_request', reason: 'query must be a non-empty string' } })

if (failures) { console.error(`===TEST_GRAPH_QUERY_FAILED=== ${failures}`); process.exit(1) }
console.log('===TEST_GRAPH_QUERY_OK===')
