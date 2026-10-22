// Samples of the door graph-insert (`npm run test:graph-insert`): exit code 1 on any miss.
// Only refusals: they end in graph.py before LightRAG opens, so no sample ever writes into the live graph of the node.
import { handle } from './graph-insert.mjs'

let failures = 0
const expect = async (label, input, want) => {
  const got = await handle(input)
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`)
}

await expect('an empty graph is refused', {}, { status: 400, body: { error: 'bad_request', reason: 'nothing to insert' } })
await expect('a list instead of an object', [], { status: 400, body: { error: 'bad_request', reason: 'the request must be an object' } })
await expect('an entity without a description names the field',
  { chunks: [{ content: 'Alice Morgan studies quantum computing.', source_id: 'doc-1' }], entities: [{ entity_name: 'Alice Morgan', source_id: 'doc-1' }] },
  { status: 400, body: { error: 'bad_request', reason: 'entities[0].description must be a non-empty string' } })

if (failures) { console.error(`===TEST_GRAPH_INSERT_FAILED=== ${failures}`); process.exit(1) }
console.log('===TEST_GRAPH_INSERT_OK===')
