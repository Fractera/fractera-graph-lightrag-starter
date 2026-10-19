"use client"

import { useEffect, useRef, useState } from "react"
import s from "./landing-agent.module.css"

// ПАССАЖИРЫ ВОКЗАЛА (владелец 2026-09-30, «да, делай»): экран простоял 10 с без прокрутки — у нижней кромки окна поднимается
// группа тёмных силуэтов, выходящая из-за края окна, (хакер с рюкзаком и ноутбуком, Web3-билдер с тележкой и чемоданами, вайб-кодер в наушниках с сумкой)
// и идёт к тому краю, на чьей стороне курсор; курсор перешёл — группа разворачивается. Ушли за край — ждём следующие 10 с покоя.
// Без курсора (телефон) идут слева направо.
// 🔒 Поиску не мешает: до оживления островок ничего не рисует (в HTML силуэтов нет), `aria-hidden`, `pointer-events: none`,
// `position: fixed` — вёрстку не двигает. При «уменьшить движение» не появляется вовсе. Один цикл кадров, только пока идут.

const IDLE = 10_000
const SPEED = 80
const DOG_SPEED = 128

function Leg({ x, back }: { x: number; back?: boolean }) {
  return <path className={s.walkLeg} data-back={back ? "" : undefined} d={`M${x} 56 V96`} />
}

function Hacker() {
  return (
    <svg className={s.walker} viewBox="0 0 60 100">
      <rect x={12} y={27} width={11} height={22} rx={3} />
      <Leg x={29} back />
      <Leg x={31} />
      <path d="M22 26 Q30 20 38 26 L39 57 H21 Z" />
      <circle cx={30} cy={14} r={8} />
      <path d="M20 17 Q20 3 30 3 Q41 3 40 17 L38 24 H22 Z" />
      <rect x={33} y={37} width={20} height={13} rx={1.5} />
      <path className={s.walkLimb} d="M32 29 L40 43" />
    </svg>
  )
}

function Builder() {
  return (
    <svg className={s.walker} viewBox="0 0 88 100">
      <Leg x={21} back />
      <Leg x={23} />
      <path d="M14 26 Q22 20 30 26 L31 57 H13 Z" />
      <circle cx={22} cy={14} r={8} />
      <path className={s.walkLimb} d="M25 30 L44 44" />
      <path className={s.walkRail} d="M44 44 L50 48 V92 H82" />
      <rect x={53} y={60} width={26} height={29} rx={3} />
      <rect x={57} y={43} width={18} height={16} rx={2} />
      <circle cx={54} cy={95} r={4.5} />
      <circle cx={78} cy={95} r={4.5} />
    </svg>
  )
}

function Vibe() {
  return (
    <svg className={s.walker} viewBox="0 0 60 100">
      <Leg x={29} back />
      <Leg x={31} />
      <path d="M22 26 Q30 20 38 26 L39 57 H21 Z" />
      <circle cx={30} cy={14} r={8} />
      <path className={s.walkLimb} d="M20 15 Q20 2 30 2 Q40 2 40 15" />
      <rect x={17} y={11} width={5} height={8} rx={2} />
      <rect x={38} y={11} width={5} height={8} rx={2} />
      <path className={s.walkStrap} d="M36 26 L22 50" />
      <rect x={13} y={45} width={16} height={13} rx={2.5} />
      <path className={s.walkLimb} d="M31 29 L37 47" />
    </svg>
  )
}

function Dog() {
  return (
    <svg className={s.dog} viewBox="0 0 70 46">
      <path className={s.dogLeg} data-back="" d="M16 30 V44" />
      <path className={s.dogLeg} d="M22 30 V44" />
      <path className={s.dogLeg} data-back="" d="M44 30 V44" />
      <path className={s.dogLeg} d="M50 30 V44" />
      <path className={s.walkLimb} d="M12 22 Q3 14 6 6" />
      <rect x={10} y={16} width={46} height={17} rx={8.5} />
      <path d="M50 18 L54 8 L60 7 L66 12 L66 18 L58 22 Z" />
      <path d="M55 8 L57 0 L61 7 Z" />
    </svg>
  )
}

export function Walkers() {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMounted(true)
  }, [])

  useEffect(() => {
    const el = ref.current
    const pup = dogRef.current
    if (!mounted || !el || !pup) return
    let idle = 0, frame = 0, x = 0, dir = 1, last = 0, walked = 0
    let group = false, dog = false, dogDue = false, dx = 0
    let mouse: number | null = null
    const W = () => window.innerWidth
    const out = (pos: number, w: number) => pos > W() + 24 || pos < -w - 24

    // Разворот по курсору — общий для группы и собаки (владелец 2026-09-30).
    const aim = () => {
      dir = mouse === null ? 1 : mouse < W() / 2 ? -1 : 1
      el.dataset.dir = pup.dataset.dir = dir > 0 ? "r" : "l"
    }
    const wait = () => {
      window.clearTimeout(idle)
      if (!group && !dog) idle = window.setTimeout(spawn, IDLE)
    }
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      if (group) {
        x += dir * SPEED * dt
        walked += SPEED * dt
        el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
        // Собака — с заметным отставанием: выбегает, когда группа прошла больше половины пути, из-за края позади неё.
        if (dogDue && walked > (W() + el.offsetWidth) / 2) {
          dogDue = false
          dog = true
          dx = dir > 0 ? -pup.offsetWidth - 12 : W() + 12
          pup.dataset.on = "1"
        }
        if (out(x, el.offsetWidth)) { group = false; el.dataset.on = "0" }
      }
      if (dog) {
        dx += dir * DOG_SPEED * dt
        pup.style.transform = `translate3d(${dx.toFixed(1)}px,0,0)`
        if (!group && out(dx, pup.offsetWidth)) { dog = false; pup.dataset.on = "0" }
      }
      if (group || dog) frame = requestAnimationFrame(tick)
      else wait()
    }
    function spawn() {
      if (document.hidden) return wait()
      // Выходят из-за края с противоположной курсору стороны (владелец 2026-09-30).
      aim()
      group = true
      dogDue = true
      walked = 0
      x = dir > 0 ? -el!.offsetWidth - 12 : W() + 12
      el!.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
      el!.dataset.on = "1"
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    const onMove = (e: MouseEvent) => {
      mouse = e.clientX
      if (group || dog) aim()
    }

    window.addEventListener("scroll", wait, { passive: true })
    window.addEventListener("touchmove", wait, { passive: true })
    window.addEventListener("mousemove", onMove, { passive: true })
    wait()
    return () => {
      window.clearTimeout(idle)
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", wait)
      window.removeEventListener("touchmove", wait)
      window.removeEventListener("mousemove", onMove)
    }
  }, [mounted])

  if (!mounted) return null
  return (
    <div data-block="qv1wz" className={s.walkers} aria-hidden="true">
      <div data-block="qsqvl" ref={ref} className={s.walkGroup} data-on="0" data-dir="r">
        <Hacker />
        <Builder />
        <Vibe />
      </div>
      {/* Собака (владелец 2026-09-30): догоняет группу, выбегая позже, с того же края. */}
      <div data-block="jkk91" ref={dogRef} className={s.walkGroup} data-on="0" data-dir="r">
        <Dog />
      </div>
    </div>
  )
}
