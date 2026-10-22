// Samples of the door graph-status (`npm run test:graph-status`): exit code 1 on any miss.
// The counts depend on the graph of this computer, so the sample checks the shape of the answer, not its numbers.
import { handle } from './graph-status.mjs'

let failures = 0
const check = (label, ok, got) => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     got  ${JSON.stringify(got)}`}`)
}

const got = await handle({})
const b = got.body ?? {}
check('answers 200', got.status === 200, got)
check('says whether the Python part is installed', typeof b.installed === 'boolean', got)
if (b.installed) {
  check('counts are numbers', ['entities', 'relationships', 'chunks'].every((k) => Number.isInteger(b[k]) && b[k] >= 0), got)
  check('names the LightRAG and Python versions', typeof b.lightrag === 'string' && typeof b.python === 'string', got)
  check('says whether an embeddings key was found', typeof b.keyFound === 'boolean', got)
} else {
  check('names the reason when not installed', typeof b.reason === 'string' && b.reason.length > 0, got)
}

if (failures) { console.error(`===TEST_GRAPH_STATUS_FAILED=== ${failures}`); process.exit(1) }
console.log('===TEST_GRAPH_STATUS_OK===')
