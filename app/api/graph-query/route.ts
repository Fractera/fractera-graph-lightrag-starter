// @api find entities, relationships and chunks by the caller's keywords
import { NextRequest, NextResponse } from "next/server"
import { needNodeKey, nodeKeyOk, NO_STORE } from "@/lib/node-key"
import { handle } from "./graph-query.mjs"

// DOOR graph-query — made by `npm run door:add` (node step 548-16). The other elements of the node call it on the machine's loopback
// (http://127.0.0.1:<port>/api/graph-query) with the header X-Node-Key; the gate of proxy.ts lets the loopback through, the key decides
// here. The work is `handle()` in ./graph-query.mjs — this file only checks the key and turns JSON in and out.
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!nodeKeyOk(req.headers.get("x-node-key"))) return needNodeKey()
  let input: unknown
  try { input = await req.json() } catch {
    return NextResponse.json({ error: "bad_request", reason: "the body must be JSON" }, { status: 400, headers: NO_STORE })
  }
  const { status, body } = await handle(input)
  return NextResponse.json(body, { status, headers: NO_STORE })
}
