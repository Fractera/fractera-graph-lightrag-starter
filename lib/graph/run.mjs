// THE GRAPH'S RUNS (node step 540-5). Every door of this element that touches the graph calls services/graph/graph.py — one
// operation per run, the mode the owner chose on 2026-10-22: «На каждый вызов (Рекомендую)». One run holds ~200 MB, two at once
// held 327 MB (measured, node step 540-4), so the callers take turns HERE: one Python process of the graph at a time inside this
// element's process. The lock file of graph.py guards the files against other callers; this queue guards the memory.
//
// 🔒 The element's folder is ELEMENT_DIR (an absolute path written by the node's installer): the standalone server works from
// inside its build, so process.cwd() is not the element there (node law 259-260).
// 🔒 The child gets windowsHide and an environment without the labels of a Next server or the core (node law 280-6).
// 🔒 The limit of one run kills only a run that hangs; nothing here starts by itself — every run answers a call.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ELEMENT = process.env.ELEMENT_DIR || process.cwd()
const PY = process.platform === 'win32' ? join(ELEMENT, '.venv', 'Scripts', 'python.exe') : join(ELEMENT, '.venv', 'bin', 'python')
const SCRIPT = join(ELEMENT, 'services', 'graph', 'graph.py')
const MARK = join(ELEMENT, '.venv', '.graph-python.json')
const RUN_LIMIT_MS = 180_000
const QUEUE = Symbol.for('fractera.graph.queue') // one queue for every route bundle of the server

/** What scripts/graph-python.mjs installed (uv, python, lightrag versions), or null when the Python part is missing. */
export function installed() {
  try {
    return existsSync(PY) ? JSON.parse(readFileSync(MARK, 'utf8')) : null
  } catch {
    return null
  }
}

function childEnv() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(__NEXT|NEXT_|AGI_)/.test(k)) env[k] = v
  return env
}

function once(op, request) {
  return new Promise((resolve) => {
    if (!installed() || !existsSync(SCRIPT)) {
      resolve({ code: 3, body: { ok: false, error: 'not_installed', detail: 'the Python part of the graph is not installed here: npm run graph:python' } })
      return
    }
    const child = spawn(PY, ['-I', SCRIPT, op], { cwd: ELEMENT, env: childEnv(), windowsHide: true })
    let out = ''
    let err = ''
    const limit = setTimeout(() => child.kill(), RUN_LIMIT_MS)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.stdin.on('error', () => { /* the run ended before it read its request — its answer says why */ })
    child.on('error', (e) => {
      clearTimeout(limit)
      resolve({ code: 3, body: { ok: false, error: 'spawn', detail: e.message } })
    })
    child.on('close', (code) => {
      clearTimeout(limit)
      const line = out.trim().split('\n').pop() ?? ''
      try {
        resolve({ code: code ?? 1, body: JSON.parse(line) })
      } catch {
        resolve({ code: code ?? 1, body: { ok: false, error: 'no_answer', detail: (err.trim().split('\n').pop() ?? '').slice(0, 300) } })
      }
    })
    child.stdin.end(JSON.stringify(request ?? {}))
  })
}

/** insert | query — through the queue: one run of the graph at a time. */
export function runGraph(op, request) {
  const state = (globalThis[QUEUE] ??= { tail: Promise.resolve() })
  const run = state.tail.then(() => once(op, request))
  state.tail = run.catch(() => {})
  return run
}

/** status — reads the counts from the files without LightRAG (~30 MB for a fraction of a second), so it does not wait its turn. */
export async function graphStatus() {
  const mark = installed()
  if (!mark) return { code: 0, body: { ok: true, installed: false, reason: 'the Python part of the graph is not installed here: npm run graph:python' } }
  const run = await once('status', {})
  return run.code === 0
    ? { code: 0, body: { ...run.body, installed: true, python: mark.python, uv: mark.uv } }
    : run
}

/** A run's answer as an HTTP answer of a door: 200 · 400 the request · 503 not ready (no_key too) · 502 the run failed
 *  (key_refused — OpenAI refused the key; graph_failed — anything else). */
export function toHttp({ code, body }) {
  if (code === 0) return { status: 200, body }
  const reason = body?.detail ?? 'the graph run failed'
  if (body?.error === 'request' || body?.error === 'json') return { status: 400, body: { error: 'bad_request', reason } }
  if (['not_installed', 'setup', 'busy', 'no_key'].includes(body?.error)) return { status: 503, body: { error: body.error, reason } }
  if (body?.error === 'key_refused') return { status: 502, body: { error: 'key_refused', reason } }
  return { status: 502, body: { error: 'graph_failed', reason } }
}
