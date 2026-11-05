// @api tell whether the graph is installed and how big it is
import { NextRequest, NextResponse } from "next/server"
import { NO_STORE } from "@/lib/node-key"
import { refusal } from "@/lib/graph/door"
import { callerOf } from "@/lib/graph/whose.mjs"
import { handle, handleElement } from "./graph-status.mjs"

// DOOR graph-status — made by `npm run door:add` (node step 548-16). The node and the elements call it on the machine's loopback
// (http://127.0.0.1:<port>/api/graph-status); the gate of proxy.ts lets the loopback through, the key decides here. 654-4: the node's
// data key (X-Data-Secret) gets the shared graph as before; an element's own key (X-Element-Key) gets the counts of its own spaces only;
// X-Node-Key opens it no more. The work is in ./graph-status.mjs — this file checks the caller and turns JSON in and out.
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const caller = callerOf(req.headers)
  if ("refused" in caller) return refusal(caller.refused)
  const { status, body } = caller.scope === "element"
    ? await handleElement(caller.id)
    : await handle(Object.fromEntries(req.nextUrl.searchParams))
  return NextResponse.json(body, { status, headers: NO_STORE })
}
