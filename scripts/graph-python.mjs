// npm run graph:python — the Python part of the graph (node step 540-3): uv, the Python it manages and the LightRAG library,
// all inside this element's folder and outside git (`/.uv/`, `/.venv/` in .gitignore). Nothing goes into the system.
//
// Owner 2026-10-19 (plan 540, «select 1»): Python for LightRAG lives inside the element, and the download from the internet
// happens only by this plan. Pinned: uv UV_VERSION (GitHub release, sha256 checked), Python PY_VERSION (managed by that uv),
// the packages — exactly the lock services/graph/requirements.txt, generated from requirements.in by `-- --lock`.
//
//   npm run graph:python            install or check; already installed → one line and exit 0
//   npm run graph:python -- --soft  the same, but a failure prints ===GRAPH_PYTHON_FAILED=== and exits 0: prebuild calls it so,
//                                   because the site builds and works without the graph service (the status names what is missing)
//   npm run graph:python -- --lock  regenerate services/graph/requirements.txt from requirements.in (a developer, needs network)
//
// Every child process gets windowsHide (otherwise Windows opens a console window per run) and an environment without the
// labels of a Next server or the core (__NEXT*, NEXT_*, AGI_*): the node's installer runs this through prebuild (law 280-6).
// The tiktoken encodings LightRAG counts tokens with are fetched HERE into .uv/tiktoken, so the running service never downloads.
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UV_VERSION = '0.12.23'
const PY_VERSION = '3.12'
const LIGHTRAG = 'lightrag-hku'
const UV_DIR = join(ROOT, '.uv')
const BIN_DIR = join(UV_DIR, 'bin')
const VENV = join(ROOT, '.venv')
const IS_WIN = process.platform === 'win32'
const UV = join(BIN_DIR, IS_WIN ? 'uv.exe' : 'uv')
const PY = IS_WIN ? join(VENV, 'Scripts', 'python.exe') : join(VENV, 'bin', 'python')
const REQ_IN = 'services/graph/requirements.in'
const REQ = 'services/graph/requirements.txt'
const MARK = join(VENV, '.graph-python.json')
const ENCODINGS = ['o200k_base', 'cl100k_base']
const SOFT = process.argv.includes('--soft')
const LOCK = process.argv.includes('--lock')

const say = (m) => console.log(m)
const tail = (out) => out.trim().split('\n').slice(-6).join(' | ').slice(0, 600)
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

function childEnv() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!/^(__NEXT|NEXT_|AGI_)/.test(k)) env[k] = v
  return {
    ...env,
    UV_CACHE_DIR: join(UV_DIR, 'cache'),
    UV_PYTHON_INSTALL_DIR: join(UV_DIR, 'python'),
    UV_PYTHON_PREFERENCE: 'only-managed',
    UV_NO_CONFIG: '1',
    UV_NO_PROGRESS: '1',
    TIKTOKEN_CACHE_DIR: join(UV_DIR, 'tiktoken'),
  }
}

function run(cmd, args, timeout = 20 * 60 * 1000) {
  const r = spawnSync(cmd, args, { cwd: ROOT, env: childEnv(), encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024, timeout })
  return { rc: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? String(r.error.message) : ''}` }
}

function uvAsset() {
  const arch = process.arch === 'x64' ? 'x86_64' : process.arch === 'arm64' ? 'aarch64' : null
  if (!arch) return null
  if (process.platform === 'win32') return `uv-${arch}-pc-windows-msvc.zip`
  if (process.platform === 'darwin') return `uv-${arch}-apple-darwin.tar.gz`
  if (process.platform === 'linux') {
    const glibc = process.report?.getReport?.()?.header?.glibcVersionRuntime
    return `uv-${arch}-unknown-linux-${glibc ? 'gnu' : 'musl'}.tar.gz`
  }
  return null
}

function findFile(dir, name) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) { const f = findFile(p, name); if (f) return f } else if (n === name) return p
  }
  return null
}

async function fetchBytes(url) {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

async function ensureUv() {
  if (existsSync(UV) && run(UV, ['--version']).out.includes(UV_VERSION)) return
  const asset = uvAsset()
  if (!asset) throw new Error(`uv has no build for ${process.platform}/${process.arch}`)
  const url = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${asset}`
  // A fresh empty folder for the download: an archive from the internet is data until its checksum matches.
  const tmp = join(UV_DIR, `download-${Date.now()}`)
  mkdirSync(tmp, { recursive: true })
  try {
    say(`  uv ${UV_VERSION}: downloading ${asset}`)
    const body = await fetchBytes(url)
    const expected = (await fetchBytes(`${url}.sha256`)).toString('utf8').trim().split(/\s+/)[0].toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(expected) || expected !== sha256(body)) throw new Error(`uv ${UV_VERSION}: checksum does not match`)
    const archive = join(tmp, asset)
    writeFileSync(archive, body)
    // Windows 10+ ships bsdtar, which unpacks zip; Git's GNU tar earlier in PATH cannot, so the system one is named in full.
    const tar = IS_WIN ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
    const x = run(tar, ['-xf', archive, '-C', tmp])
    if (x.rc !== 0) throw new Error(`uv: unpack failed — ${tail(x.out)}`)
    const found = findFile(tmp, IS_WIN ? 'uv.exe' : 'uv')
    if (!found) throw new Error('uv: the archive has no uv binary')
    mkdirSync(BIN_DIR, { recursive: true })
    copyFileSync(found, UV)
    if (!IS_WIN) chmodSync(UV, 0o755)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  if (!run(UV, ['--version']).out.includes(UV_VERSION)) throw new Error('uv: the installed binary does not answer its version')
}

function lightragVersion() {
  const r = run(PY, ['-I', '-c', `import importlib.metadata as m; print(m.version("${LIGHTRAG}"))`])
  return r.rc === 0 ? r.out.trim() : null
}

async function install() {
  const lockHash = sha256(readFileSync(join(ROOT, REQ)))
  const mark = (() => { try { return JSON.parse(readFileSync(MARK, 'utf8')) } catch { return null } })()
  if (mark && mark.uv === UV_VERSION && mark.lock === lockHash && existsSync(PY) && existsSync(UV)) {
    say(`===GRAPH_PYTHON_OK=== already installed: uv ${mark.uv}, python ${mark.python}, ${LIGHTRAG} ${mark.lightrag}`)
    return
  }
  await ensureUv()
  say(`  python ${PY_VERSION}: install (managed by uv, inside .uv/python)`)
  const p = run(UV, ['python', 'install', PY_VERSION])
  if (p.rc !== 0) throw new Error(`python ${PY_VERSION}: ${tail(p.out)}`)
  if (!existsSync(PY)) {
    rmSync(VENV, { recursive: true, force: true })
    const v = run(UV, ['venv', VENV, '--python', PY_VERSION])
    if (v.rc !== 0) throw new Error(`virtual environment: ${tail(v.out)}`)
  }
  say(`  packages: exactly ${REQ}`)
  const s = run(UV, ['pip', 'sync', '--python', PY, REQ])
  if (s.rc !== 0) throw new Error(`packages: ${tail(s.out)}`)
  const t = run(PY, ['-I', '-c', `import tiktoken\nfor e in ${JSON.stringify(ENCODINGS)}: tiktoken.get_encoding(e)`], 5 * 60 * 1000)
  if (t.rc !== 0) throw new Error(`tiktoken encodings: ${tail(t.out)}`)
  const python = run(PY, ['-I', '-c', 'import platform; print(platform.python_version())']).out.trim()
  const lightrag = lightragVersion()
  if (!lightrag) throw new Error(`${LIGHTRAG} does not import after the install`)
  writeFileSync(MARK, JSON.stringify({ uv: UV_VERSION, python, lightrag, lock: lockHash, at: new Date().toISOString() }, null, 2) + '\n')
  say(`===GRAPH_PYTHON_OK=== uv ${UV_VERSION}, python ${python}, ${LIGHTRAG} ${lightrag}`)
}

async function lock() {
  await ensureUv()
  const c = run(UV, ['pip', 'compile', REQ_IN, '--universal', '--python-version', PY_VERSION, '-o', REQ,
    '--custom-compile-command', 'npm run graph:python -- --lock'])
  if (c.rc !== 0) throw new Error(`lock: ${tail(c.out)}`)
  say(`===GRAPH_PYTHON_LOCKED=== ${REQ}`)
}

try {
  await (LOCK ? lock() : install())
} catch (e) {
  say(`===GRAPH_PYTHON_FAILED=== ${e instanceof Error ? e.message : String(e)}`)
  process.exit(SOFT ? 0 : 1)
}
