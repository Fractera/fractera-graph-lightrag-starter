"use client"

// THE WIDGET «graph search» (node step 540-5) — the island of the page «Knowledge graph» (`_pages/graph`).
// It reads the size of the graph and searches it through the branch's own door `/<lang>/admin/api/graph` (architect only).
// The graph runs one operation per call (owner 2026-10-22, «На каждый вызов»), so a search takes about two seconds: the button says
// so while it waits. When the door fails or the computer is off, the island keeps its frame and names the reason in words.
import { useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { H4, Metric, P, Small } from "@/components/ui/typography"
import type { GraphSearchUi } from "./ui.i18n"

type Status = {
  installed: boolean
  entities?: number
  relationships?: number
  chunks?: number
  lightrag?: string
  python?: string
  embedModel?: string
  keyFound?: boolean
}
type Entity = { entity_name: string; entity_type?: string; description?: string }
type Link = { src_id: string; tgt_id: string; description?: string }
type Chunk = { content: string }
type Found = { found: boolean; entities: Entity[]; relationships: Link[]; chunks: Chunk[] }

const doorOf = (lang: string) => `/${lang}/admin/api/graph`
const fill = (words: string, values: Record<string, string | number | undefined>) =>
  words.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""))

export function GraphSearch({ lang, ui }: { lang: string; ui: GraphSearchUi }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [statusFailed, setStatusFailed] = useState(false)
  const [text, setText] = useState("")
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<Found | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(doorOf(lang), { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        return (await r.json()) as Status
      })
      .then((s) => { if (alive) setStatus(s) })
      .catch(() => { if (alive) setStatusFailed(true) })
    return () => { alive = false }
  }, [lang])

  const explain = (code: unknown, reason: unknown) => {
    if (code === "no_key") return ui.noKey
    if (code === "key_refused") return ui.keyRefused
    if (code === "not_installed") return ui.notInstalled
    if (code === "busy") return ui.busy
    return fill(ui.failed, { reason: typeof reason === "string" ? reason : "" })
  }

  const search = async () => {
    const question = text.trim()
    if (!question || searching) return
    if (question.length > 300) { setResult(null); setError(ui.tooLong); return }
    setSearching(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch(doorOf(lang), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: question }),
        cache: "no-store",
      })
      const body = await r.json().catch(() => null)
      if (r.ok && body?.ok) {
        setResult({ found: Boolean(body.found), entities: body.entities ?? [], relationships: body.relationships ?? [], chunks: body.chunks ?? [] })
      } else {
        setError(explain(body?.error, body?.reason))
      }
    } catch {
      setError(ui.unreachable)
    } finally {
      setSearching(false)
    }
  }

  const counts = [
    { label: ui.entities, value: status?.entities },
    { label: ui.relationships, value: status?.relationships },
    { label: ui.chunks, value: status?.chunks },
  ]

  return (
    <div data-block="y5fzy" className="flex flex-col gap-6">
      <div data-block="dbrrc" className="rounded-lg border p-4">
        <H4 data-block="zyra7" variant="ui">{ui.statusTitle}</H4>
        {statusFailed ? (
          <Small data-block="vr263" className="mt-3 text-muted-foreground">{ui.unreachable}</Small>
        ) : status && !status.installed ? (
          <Small data-block="pza35" className="mt-3">{ui.notInstalled}</Small>
        ) : (
          <>
            <div data-block="vuicc" className="mt-3 grid grid-cols-3 gap-3">
              {counts.map((c) => (
                <div data-block="lw90g" key={c.label} className="rounded-md border p-3">
                  {status ? <Metric>{c.value ?? 0}</Metric> : <Skeleton className="h-7 w-12" />}
                  <Small data-block="n9les" className="text-muted-foreground">{c.label}</Small>
                </div>
              ))}
            </div>
            <Small data-block="oou5g" className="mt-3 text-muted-foreground">
              {status ? fill(ui.versions, { lightrag: status.lightrag, python: status.python, embedModel: status.embedModel }) : ui.loading}
            </Small>
            {status && status.keyFound === false && <Small data-block="g8bew" className="mt-2">{ui.noKey}</Small>}
          </>
        )}
      </div>

      <div data-block="e0nua" className="rounded-lg border p-4">
        <H4 data-block="piqic" variant="ui">{ui.searchTitle}</H4>
        <div data-block="nbx8z" className="mt-3 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void search() }}
            placeholder={ui.placeholder}
            aria-label={ui.searchTitle}
          />
          <Button onClick={() => void search()} disabled={searching || !text.trim()}>
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {searching ? ui.searching : ui.find}
          </Button>
        </div>
        <Small data-block="ffthv" className="mt-2 text-muted-foreground">{ui.hint}</Small>

        {error && <P data-block="ijb7m" role="alert" className="mt-4">{error}</P>}
        {result && !result.found && <P data-block="ooiza" className="mt-4">{ui.nothing}</P>}
        {result && result.found && (
          <div data-block="umu2j" className="mt-4 flex flex-col gap-4">
            <Small data-block="hha4i" className="text-muted-foreground">
              {fill(ui.foundLine, { entities: result.entities.length, relationships: result.relationships.length, chunks: result.chunks.length })}
            </Small>
            {result.entities.length > 0 && (
              <div data-block="gvjek">
                <H4 data-block="s3ufe" variant="ui">{ui.entities}</H4>
                <ul data-block="e7h9f" className="mt-2 flex flex-col gap-2">
                  {result.entities.map((e) => (
                    <li data-block="clgil" key={e.entity_name} data-graph-entity={e.entity_name}>
                      <P data-block="mbo5f" className="font-medium">
                        {e.entity_name} {e.entity_type && <Badge data-block="xcfl0" variant="secondary">{e.entity_type}</Badge>}
                      </P>
                      {e.description && <Small data-block="qt8i5" className="text-muted-foreground">{e.description}</Small>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.relationships.length > 0 && (
              <div data-block="pldfo">
                <H4 data-block="nptid" variant="ui">{ui.relationships}</H4>
                <ul data-block="n4acq" className="mt-2 flex flex-col gap-2">
                  {result.relationships.map((l) => (
                    <li data-block="t5hea" key={`${l.src_id}→${l.tgt_id}`}>
                      <P data-block="uy8a6" className="font-medium">{l.src_id} → {l.tgt_id}</P>
                      {l.description && <Small data-block="ffbkf" className="text-muted-foreground">{l.description}</Small>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.chunks.length > 0 && (
              <div data-block="z0qi4">
                <H4 data-block="wbqjg" variant="ui">{ui.chunks}</H4>
                <ul data-block="spj6e" className="mt-2 flex flex-col gap-2">
                  {result.chunks.slice(0, 5).map((c, i) => (
                    <li data-block="p0ad2" key={i}><Small data-block="atwj1" className="text-muted-foreground">{c.content.slice(0, 400)}</Small></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
