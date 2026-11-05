// THE REFUSAL OF A GRAPH DOOR (node step 654-4): the same JSON, no-store, and a 401 that names the two keys that open the graph — the
// node's data key `X-Data-Secret` and an element's own key `X-Element-Key` (`whose.mjs`). The node key `X-Node-Key` is not one of them.
import { NextResponse } from "next/server"
import { NO_STORE } from "@/lib/node-key"

export function refusal({ status, body }: { status: number; body: unknown }) {
  const headers: Record<string, string> = { ...NO_STORE }
  if (status === 401) headers["WWW-Authenticate"] = 'ApiKey header="X-Data-Secret", ApiKey header="X-Element-Key"'
  return NextResponse.json(body, { status, headers })
}
