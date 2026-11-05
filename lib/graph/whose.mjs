// WHO CALLS THE GRAPH AND IN WHOSE SPACE (node step 654-4).
//
// The owner of the node, 2026-11-05: «объектное хранилище должно быть обновлено не только для использования глубинной памятью но и для
// использования просто внутри элемента» — the same rule for every store of the node, in both node types («В обоих типах»), and the
// node's master key of the memory family is `DATA_SECRET` alone («DATA_SECRET сейчас, другой — 655»).
//
// 🔒 THE THREE GRAPH DOORS OPEN WITH THE STORE KEYS, NOT THE NODE KEY. `X-Data-Secret` (the node's `DATA_SECRET`) is the node — the
// core, the deep memory, the main agent: the shared graph and every space under its full name. `X-Element-Key` (`<id>.<mac>`,
// `../element-key.mjs`, word for word the stores' copy) is that element alone. `X-Node-Key` (`SETTINGS_SECRET`) opens these doors no
// more: every custom element holds it until step 655, so a graph that took it would stay open to every element. The other doors of
// this element keep the node key (`lib/node-key.ts`). A presented element key is always checked first: a bad one is 401, never «the
// node».
//
// 🔒 AN ELEMENT'S SPACE: no `space` → `el-<id>`; `space: "<name>"` → `el-<id>.<name>`. The dot is in no element id and in no name, so
// no space of one element is ever another's. ✗ The plan wrote `el-<id>--<name>`: an id of the registry may hold `--`, and element `a`'s
// space `b` would have been element `a--b`'s own. An element never reaches the shared graph, a space of the node (`memory`,
// `memory-root`) or another element's; its `memory-root` is its own `el-<id>.memory-root`. The node never WRITES under `el-`: a record
// of the node there would be found by an element as its own.
import { timingSafeEqual } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { elementOf } from '../element-key.mjs'

/** A name a caller gives its space — the graph's rule of 596-1 (it becomes a folder name). */
export const NAME = /^[a-z][a-z0-9-]{0,31}$/
const EL = 'el-'

function same(given, expected) {
  if (!given || !expected) return false
  const a = Buffer.from(String(given))
  const b = Buffer.from(String(expected))
  return a.length === b.length && timingSafeEqual(a, b)
}

const refuse = (status, error, reason) => ({ refused: { status, body: { error, reason } } })

/** Who calls: `{ scope: 'node' }` · `{ scope: 'element', id }` · `{ refused: { status, body } }`. `headers` — a Headers object. */
export function callerOf(headers) {
  const presented = headers.get('x-element-key')
  if (presented) {
    const id = elementOf(presented, process.env.DATA_SECRET)
    if (!id) return refuse(401, 'bad_element_key', 'X-Element-Key is <element id>.<mac>, written to the element by the node installer; this one does not match')
    return { scope: 'element', id }
  }
  if (same(headers.get('x-data-secret'), process.env.DATA_SECRET)) return { scope: 'node' }
  return refuse(401, 'bad_key',
    'the graph opens with the node data key in X-Data-Secret (the node: every space) or an element\'s own key in X-Element-Key (its own spaces); X-Node-Key opens it no more (node step 654-4)')
}

/**
 * The space of a call: `{ space }` (undefined — the node's shared graph) or `{ refused }`. `op` — insert | query.
 * An element's `space` is its own name; the node's — the full name, as before.
 */
export function spaceOf(caller, op, input) {
  const asked = input && typeof input === 'object' && !Array.isArray(input) ? input.space : undefined
  if (caller.scope === 'element') {
    const home = `${EL}${caller.id}`
    if (asked === undefined || asked === null || asked === '') return { space: home }
    // A full name (`el-root.proof`) first: the answer tells what to send instead.
    if (typeof asked === 'string' && asked.startsWith(EL)) {
      return refuse(400, 'reserved-prefix', 'an element names its own space without "el-": the graph keeps it under el-<element id>. by itself')
    }
    if (typeof asked !== 'string' || !NAME.test(asked)) {
      return refuse(400, 'bad_request', 'space must match ^[a-z][a-z0-9-]{0,31}$ — the name of a space of your own')
    }
    return { space: `${home}.${asked}` }
  }
  if (op === 'insert' && typeof asked === 'string' && asked.startsWith(EL)) {
    return refuse(400, 'reserved-prefix', 'spaces beginning with "el-" are the elements\' own; the node keeps its graph under other names')
  }
  return { space: asked }
}

/** The request as the graph runs it: the caller's own space put in (an element's `space` replaced by its full name). */
export function withSpace(input, space) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? { ...input } : {}
  if (space === undefined) delete body.space
  else body.space = space
  return body
}

/** An element's spaces on the disk — the folders `el-<id>` and `el-<id>.<name>` under `<SERVICE_DATA_DIR>/spaces`. */
export function ownSpaces(id) {
  const data = process.env.SERVICE_DATA_DIR ?? ''
  if (!isAbsolute(data)) return null
  const dir = join(data, 'spaces')
  if (!existsSync(dir)) return []
  const home = `${EL}${id}`
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (d.name === home || d.name.startsWith(`${home}.`)))
    .map((d) => d.name)
    .sort()
}

/** The element's own name of one of its spaces: `null` for `el-<id>`, `<name>` for `el-<id>.<name>`. */
export function ownName(id, space) {
  const home = `${EL}${id}`
  return space === home ? null : space.slice(home.length + 1)
}
