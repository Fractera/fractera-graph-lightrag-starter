"use client"

import { useEffect, useRef, useState } from "react"
import s from "./landing-agent.module.css"

// ОСТРОВОК «МАГИСТРАЛЬ НУЛЕВОГО ДНЯ» (секция «Fractera vs LLM», владелец 2026-09-30, выбор «Карта магистрали»): схема метро —
// главный хаб и ветки к станциям-субдоменам. Без JavaScript схема стоит нарисованной целиком (сервер отдаёт тот же SVG).
// Ожив, островок один раз прорисовывает ветки, когда карта въезжает в экран, и только потом пускает огни поездов; ушла с
// экрана — поезда на паузе. При «уменьшить движение» остаётся неподвижная схема, поездов нет. Квадрат 600×600, как схема
// слева (владелец 2026-09-30: экраны одной высоты).
// КОЛЬЦО «БЕСКОНЕЧНЫЙ ЦИКЛ AGI» (владелец 2026-09-30): оранжевая окружность почти касается краёв картинки, схема хаба стоит в
// центре, и каждая ветка кончается на одном расстоянии от кольца (RI) — оттуда пересадка по диагонали на станцию кольца
// («shop.domain» → «AGI shops»), как переход между линиями метро. Ещё шесть станций кольца к хабу пока не подключены. Все
// подписи — внутри круга: так кольцо может стоять вплотную к краю.

const R = 276
const RI = 212
const rad = (a: number) => (a * Math.PI) / 180
const on = (r: number, a: number): [number, number] => [300 + r * Math.cos(rad(a)), 300 + r * Math.sin(rad(a))]

type Line = { d: string; tone: "go" | "poster" | "chalk"; dashed?: boolean; a: number; tag: "left" | "right"; dy: number }
// Порядок веток = порядок станций в данных: crm, ai-support, shop и строящаяся ветка. Конец каждой — на диагонали, на RI.
const LINES: Line[] = [
  { d: "M300 300 H390 L450 240 V150", tone: "go", a: -45, tag: "left", dy: -24 },
  { d: "M300 300 L340 340 H450 V450", tone: "poster", a: 45, tag: "left", dy: -80 },
  { d: "M300 300 H210 L150 240 V150", tone: "chalk", a: -135, tag: "right", dy: -24 },
  { d: "M300 300 L260 340 H150 V450", tone: "poster", dashed: true, a: 135, tag: "right", dy: -18 },
]
// Станции кольца без связи с хабом: угол и где табличка (сбоку — к центру; над/под станцией — со сдвигом от веток).
const FREE: { a: number; pos: "side" | "above" | "below"; dx: number }[] = [
  { a: -22.5, pos: "below", dx: -45 },
  { a: 0, pos: "side", dx: 0 },
  { a: 67.5, pos: "above", dx: -10 },
  { a: 112.5, pos: "above", dx: 10 },
  { a: 180, pos: "side", dx: 0 },
  { a: 202.5, pos: "below", dx: 45 },
]
const CHAR = 9.1
const PAD = 8
const width = (...t: string[]) => Math.round(Math.max(...t.map((x) => x.length)) * CHAR + PAD * 2)
// Дуга для названия кольца: верх круга, от 235° до 305°, чуть внутри линии.
const [ax, ay] = on(250, 235)
const [bx, by] = on(250, 305)
const ARC = `M${ax} ${ay} A250 250 0 0 1 ${bx} ${by}`
const RING = `M${300 - R} 300 A${R} ${R} 0 1 1 ${300 + R} 300 A${R} ${R} 0 1 1 ${300 - R} 300`

export type Ring = { name: string; stations: string[]; free: string[] }

export function TransitMap({ hub, here, stations, ring, label }: { hub: string; here?: string; stations: string[]; ring?: Ring; label: string }) {
  const sp = hub.indexOf(" ")
  const hubLines = sp > 0 ? [hub.slice(0, sp), hub.slice(sp + 1)] : [hub]
  const hereW = here ? Math.round(here.length * 9.1 + 50) : 0
  const ref = useRef<SVGSVGElement>(null)
  const [play, setPlay] = useState<"0" | "1" | null>(null)
  const [trains, setTrains] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = el.getBoundingClientRect()
    const seen = r.top < window.innerHeight && r.bottom > 0
    // Уже на экране при оживлении — не стираем нарисованное, только пускаем поезда.
    if (seen) setTrains(true)
    else setPlay("0")
    let drawn = seen
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!drawn) { drawn = true; setPlay("1"); setTrains(true) }
          el.unpauseAnimations()
        } else el.pauseAnimations()
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <svg ref={ref} className={s.map} viewBox="0 0 600 600" role="img" aria-label={label} data-play={play ?? undefined}>
      {ring && (
        <g className={s.mapRing}>
          <circle cx={300} cy={300} r={R} />
          <path id="agi-ring-arc" d={ARC} fill="none" stroke="none" />
          <text>
            <textPath href="#agi-ring-arc" startOffset="50%" textAnchor="middle">{ring.name}</textPath>
          </text>
        </g>
      )}
      {LINES.map((l, i) => (
        <path
          key={i}
          d={l.d}
          pathLength={1}
          className={`${s.mapLine} ${l.dashed ? s.mapLineDashed : ""}`}
          data-tone={l.tone}
          style={{ ["--d" as string]: `${i * 0.18}s` }}
        />
      ))}
      {ring && LINES.map((l, i) => {
        const [x1, y1] = on(RI, l.a)
        const [x2, y2] = on(R, l.a)
        return (
          <g key={i} className={s.mapTransfer} style={{ ["--d" as string]: `${0.9 + i * 0.18}s` }}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
          </g>
        )
      })}
      {trains && (
        <>
          {LINES.filter((l) => !l.dashed).map((l, i) => (
            <circle key={i} r={4.5} className={s.mapTrain}>
              <animateMotion dur={`${3.4 + i * 0.7}s`} repeatCount="indefinite" path={l.d} />
            </circle>
          ))}
          {ring && (
            <circle r={5} className={s.mapRingTrain}>
              <animateMotion dur="14s" repeatCount="indefinite" path={RING} />
            </circle>
          )}
        </>
      )}
      {/* Хаб как «вы находитесь здесь» на карте (владелец 2026-09-30): название в две строки слева от точки, от точки вверх —
          сноска с меткой места. Пульс вокруг точки — только у ожившей страницы и не при «уменьшить движение». */}
      <g className={s.mapHub}>
        {here && (
          <g className={s.mapHere}>
            <line x1={300} y1={280} x2={300} y2={214} />
            <rect x={300 - hereW / 2} y={184} width={hereW} height={30} rx={15} />
            <path d={`M${300 - hereW / 2 + 20} 207 c-5 -6 -8 -9.5 -8 -13 a8 8 0 0 1 16 0 c0 3.5 -3 7 -8 13z`} className={s.mapHerePin} />
            <circle cx={300 - hereW / 2 + 20} cy={194} r={3} className={s.mapHereDot} />
            <text x={300 - hereW / 2 + 36} y={204}>{here}</text>
          </g>
        )}
        {trains && <circle cx={300} cy={300} r={19} className={s.mapHubPulse} />}
        <circle cx={300} cy={300} r={19} />
        <circle cx={300} cy={300} r={7} className={s.mapHubCore} />
        <text x={here ? 276 : 300} y={here ? 250 : 264} textAnchor={here ? "end" : "middle"}>
          {here ? hubLines.map((w, i) => <tspan key={i} x={276} dy={i ? 22 : 0}>{w}</tspan>) : hub}
        </text>
      </g>
      {LINES.map((l, i) => {
        const [x1, y1] = on(RI, l.a)
        const [x2, y2] = on(R, l.a)
        const name = stations[i]
        const agi = ring?.stations[i]
        const w = width(...[name, agi].filter((t): t is string => !!t))
        const left = l.tag === "left" ? x1 - 18 - w : x1 + 18
        const top = y1 + l.dy
        return (
          <g key={i} className={s.mapStop} data-pending={l.dashed ? "" : undefined} style={{ ["--d" as string]: `${0.9 + i * 0.18}s` }}>
            <circle cx={x1} cy={y1} r={9} />
            {ring && <circle cx={x2} cy={y2} r={9} className={s.mapRingStop} />}
            {name && (
              <g className={s.mapTag}>
                <rect x={left} y={top} width={w} height={agi ? 48 : 26} rx={3} />
                <text x={left + PAD} y={top + 19}>{name}</text>
                {agi && <text x={left + PAD} y={top + 39} className={s.mapTagAgi}>{agi}</text>}
              </g>
            )}
          </g>
        )
      })}
      {ring && FREE.map((f, i) => {
        const name = ring.free[i]
        if (!name) return null
        const [x, y] = on(R, f.a)
        const w = width(name)
        const left = f.pos === "side" ? (Math.cos(rad(f.a)) > 0 ? x - 18 - w : x + 18) : x - w / 2 + f.dx
        const top = f.pos === "side" ? y - 13 : f.pos === "above" ? y - 44 : y + 18
        return (
          <g key={i} className={`${s.mapStop} ${s.mapFree}`} style={{ ["--d" as string]: `${1.3 + i * 0.12}s` }}>
            <circle cx={x} cy={y} r={8} />
            <g className={s.mapTag}>
              <rect x={left} y={top} width={w} height={26} rx={3} />
              <text x={left + PAD} y={top + 18}>{name}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
