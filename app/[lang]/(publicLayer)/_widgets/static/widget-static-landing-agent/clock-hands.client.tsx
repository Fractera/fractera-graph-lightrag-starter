"use client"

import { useEffect, useState } from "react"
import s from "./landing-agent.module.css"

// СТРЕЛКИ ВОКЗАЛЬНЫХ ЧАСОВ ЗАЛА ОЖИДАНИЯ (владелец 2026-10-01: «часы … должны показывать реальное время»). Время — часы
// посетителя. Страница предрендерена, поэтому до оживления стрелок нет вовсе (иначе HTML показал бы время сборки); после — раз в
// секунду, как секундная стрелка вокзальных часов, только пока страница открыта.
export function ClockHands({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (!now) return null
  const sec = now.getSeconds()
  const min = now.getMinutes() + sec / 60
  const hour = (now.getHours() % 12) + min / 60
  const hand = (deg: number, len: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return `M${cx} ${cy} L${(cx + Math.cos(a) * len).toFixed(1)} ${(cy + Math.sin(a) * len).toFixed(1)}`
  }
  return (
    <g>
      <path className={s.clockHand} d={hand(hour * 30, r * 0.5)} />
      <path className={s.clockHand} d={hand(min * 6, r * 0.75)} />
      <path className={s.clockSecond} d={hand(sec * 6, r * 0.8)} />
    </g>
  )
}
