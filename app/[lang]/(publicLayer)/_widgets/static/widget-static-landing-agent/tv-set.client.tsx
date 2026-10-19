"use client"

import { useEffect, useId, useRef, useState } from "react"
import s from "./landing-agent.module.css"
import { TvDrawing, type TvPhase } from "./tv-drawing"
import { Button } from "@/components/ui/button"

// ЛАМПОВЫЙ ТЕЛЕВИЗОР ЗАЛА ОЖИДАНИЯ — ШИРОКИЙ ЭКРАН (владелец 2026-10-01): «когда телевизор включается … несколько секунд идут серые
// помехи … потом появляется цветная стандартная … таблица … держится 2 секунды … проявляется значок play». Весь телевизор — одна
// кнопка (`aria-pressed`). До оживления сервер отдаёт его выключенным. Помехи — `feTurbulence`, у которого раз в 70 мс меняется
// зерно, только пока идут помехи; при «уменьшить движение» зерно стоит. Рисунок — `tv-drawing.tsx` (общий с узким экраном).

const NOISE_MS = 3000
const BARS_MS = 2000

export function TvSet({ on, off, label }: { on: string; off: string; label: string }) {
  const [phase, setPhase] = useState<TvPhase>("off")
  const [seed, setSeed] = useState(1)
  const timers = useRef<number[]>([])
  const uid = useId().replace(/:/g, "")

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clear, [])

  useEffect(() => {
    if (phase !== "noise" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setInterval(() => setSeed((n) => (n % 97) + 1), 70)
    return () => window.clearInterval(t)
  }, [phase])

  function toggle() {
    clear()
    if (phase !== "off") return setPhase("off")
    setPhase("noise")
    timers.current.push(window.setTimeout(() => setPhase("bars"), NOISE_MS))
    timers.current.push(window.setTimeout(() => setPhase("play"), NOISE_MS + BARS_MS))
  }

  const isOn = phase !== "off"
  return (
    <Button variant="bare" size="bare" type="button" className={s.tv} aria-pressed={isOn} aria-label={`${label}: ${isOn ? off : on}`} onClick={toggle} data-phase={phase}>
      <TvDrawing uid={uid} phase={phase} seed={seed} />
      <span className={s.tvCaption}>{isOn ? off : on}</span>
    </Button>
  )
}
