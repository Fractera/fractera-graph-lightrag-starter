// @api read the size of this element's graph and search it, for the architect
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { graphStatus, runGraph, toHttp } from "@/lib/graph/run.mjs"

// THE DOOR OF THE PAGE «Knowledge graph» (node step 540-5): the island `_widgets/dynamic/widget-dynamic-graph-search` reads the size
// of the graph (GET) and searches it (POST { text }). Only the architect: the graph holds what the node's agents learned. The search
// takes the person's words as its keywords, so no language model runs (owner 2026-10-22: the subscription wherever it can be).
// The other elements of the node use the node-key doors /api/graph-insert, /api/graph-query, /api/graph-status instead.
export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

async function architect(req: NextRequest): Promise<200 | 401 | 403> {
  const s = await getSession(req)
  if (!s) return 401
  return s.roles?.includes("architect") ? 200 : 403
}

export async function GET(req: NextRequest) {
  const a = await architect(req)
  if (a !== 200) return NextResponse.json({ ok: false }, { status: a, headers: NO_STORE })
  const { status, body } = toHttp(await graphStatus())
  return NextResponse.json(body, { status, headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const a = await architect(req)
  if (a !== 200) return NextResponse.json({ ok: false }, { status: a, headers: NO_STORE })
  let text = ""
  try {
    const body = (await req.json()) as { text?: unknown }
    text = typeof body?.text === "string" ? body.text.trim() : ""
  } catch {
    /* an empty text answers below */
  }
  if (!text || text.length > 300) {
    return NextResponse.json({ error: "bad_request", reason: "text: 1 to 300 characters" }, { status: 400, headers: NO_STORE })
  }
  const { status, body } = toHttp(await runGraph("query", { query: text, mode: "mix", ll_keywords: [text], hl_keywords: [text] }))
  return NextResponse.json(body, { status, headers: NO_STORE })
}
