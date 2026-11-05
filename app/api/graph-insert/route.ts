// @api add a ready graph of entities, relationships and chunks
import { NextRequest, NextResponse } from "next/server"
import { NO_STORE } from "@/lib/node-key"
import { refusal } from "@/lib/graph/door"
import { callerOf, spaceOf, withSpace } from "@/lib/graph/whose.mjs"
import { handle } from "./graph-insert.mjs"

// DOOR graph-insert — made by `npm run door:add` (node step 548-16). The node and the elements call it on the machine's loopback
// (http://127.0.0.1:<port>/api/graph-insert); the gate of proxy.ts lets the loopback through, the key decides here. 654-4: the key is
// the node's data key (X-Data-Secret — the shared graph or a space by its full name, never under «el-») or an element's own key
// (X-Element-Key — only its own spaces, `lib/graph/whose.mjs`); X-Node-Key opens it no more. The work is `handle()` in
// ./graph-insert.mjs — this file checks the caller, puts its space in and turns JSON in and out.
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const caller = callerOf(req.headers)
  if ("refused" in caller) return refusal(caller.refused)
  let input: unknown
  try { input = await req.json() } catch {
    return NextResponse.json({ error: "bad_request", reason: "the body must be JSON" }, { status: 400, headers: NO_STORE })
  }
  const where = spaceOf(caller, "insert", input)
  if ("refused" in where) return refusal(where.refused)
  const { status, body } = await handle(withSpace(input, where.space))
  return NextResponse.json(body, { status, headers: NO_STORE })
}
