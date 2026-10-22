// Types of lib/graph/run.mjs (node step 540-5) for the TypeScript doors.
export type GraphRun = { code: number; body: Record<string, unknown> }
export type DoorAnswer = { status: number; body: Record<string, unknown> }
export function installed(): { uv: string; python: string; lightrag: string; lock: string; at: string } | null
export function runGraph(op: 'insert' | 'query', request: unknown): Promise<GraphRun>
export function graphStatus(): Promise<GraphRun>
export function toHttp(run: GraphRun): DoorAnswer
