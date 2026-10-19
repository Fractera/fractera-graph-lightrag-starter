"use client"

import { useEffect, useRef } from "react"
import { DRUM, drumRow, drumSteps } from "./drum"
import s from "./landing-agent.module.css"

// ОСТРОВОК ТАБЛО SPLIT-FLAP (Solari): ячейка — барабан флапов на оси, шаг — верхний флап падает на нижнюю половину.
// Четыре слоя ячейки: неподвижная верхняя половина СЛЕДУЮЩЕГО флапа, неподвижная нижняя половина ТЕКУЩЕГО, падающий флап
// (лицо — верхняя половина текущего, изнанка — нижняя половина следующего), линия оси. Буквы рисует CSS из `data-c`, поэтому
// слоёв текста в разметке нет. Все ячейки стартуют разом, каждая встаёт на свою букву — слово оседает волной. Один цикл
// `requestAnimationFrame` на слово и никакого состояния React на кадр: шаги считаются от времени старта. Старт — когда табло
// видно; ушло с экрана — сброс на пустые флапы; несколько слов — после паузы тот же перебор к следующему. Без JavaScript
// стоит первое слово; при «уменьшить движение» — тоже, сразу, без перебора.

const STEP = 65
const HOLD = 3200

type Parts = { top: HTMLElement; bottom: HTMLElement; leaf: HTMLElement; face: HTMLElement; back: HTMLElement }

export function SplitFlap({ words, className, announce = false }: { words: string[]; className?: string; announce?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const n = Math.max(1, ...words.map((w) => Array.from(w).length))
  const first = drumRow(words[0] ?? "", n)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const targets = words.map((w) => drumRow(w, n))
    const cells: Parts[] = Array.from(root.children, (c) => {
      const [top, bottom, leaf] = Array.from(c.children) as HTMLElement[]
      const [face, back] = Array.from(leaf.children) as HTMLElement[]
      return { top, bottom, leaf, face, back }
    })
    const board = announce ? root.closest<HTMLElement>("[data-board]") : null
    const cur = new Array<number>(n).fill(0)
    const start = new Array<number>(n).fill(0)
    const total = new Array<number>(n).fill(0)
    const drawn = new Array<number>(n).fill(-1)
    let k = 0, t0 = 0, frame = 0, hold = 0, running = false

    const put = (el: HTMLElement, i: number) => el.setAttribute("data-c", DRUM[i % DRUM.length])
    const paint = (p: Parts, a: number, b: number) => { put(p.top, b); put(p.bottom, a); put(p.face, a); put(p.back, b) }
    const rest = (p: Parts, a: number) => { paint(p, a, a); p.leaf.style.transform = "" }
    const show = (i: number) => board?.setAttribute("data-shown", String(i))

    const tick = (now: number) => {
      const t = now - t0
      let busy = false
      cells.forEach((p, i) => {
        if (total[i] === 0) return
        const done = Math.floor(t / STEP)
        if (done >= total[i]) {
          cur[i] = (start[i] + total[i]) % DRUM.length
          total[i] = 0
          rest(p, cur[i])
          return
        }
        busy = true
        const a = start[i] + done
        if (drawn[i] !== done) { paint(p, a, a + 1); drawn[i] = done }
        const f = (t - done * STEP) / STEP
        p.leaf.style.transform = `rotateX(${(-180 * f * f).toFixed(1)}deg)`
      })
      if (busy) { frame = requestAnimationFrame(tick); return }
      frame = 0
      if (targets.length > 1) hold = window.setTimeout(() => go((k + 1) % targets.length), HOLD)
    }

    const go = (next: number) => {
      k = next
      show(k)
      cells.forEach((_, i) => {
        start[i] = cur[i]
        total[i] = drumSteps(cur[i], targets[k][i])
        drawn[i] = -1
      })
      t0 = performance.now()
      frame = requestAnimationFrame(tick)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
      clearTimeout(hold)
      frame = 0
      cur.fill(0)
      total.fill(0)
      cells.forEach((p) => rest(p, 0))
      show(0)
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cells.forEach((p, i) => rest(p, first[i]))
      root.setAttribute("data-live", "")
      return
    }

    cells.forEach((p) => rest(p, 0))
    root.setAttribute("data-live", "")
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; go(0) }
      else if (!e.isIntersecting && running) stop()
    }, { threshold: 0.4 })
    io.observe(root)
    return () => { io.disconnect(); cancelAnimationFrame(frame); clearTimeout(hold) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <span ref={ref} className={`${s.drum} ${className ?? ""}`} style={{ ["--n" as string]: n }} aria-hidden="true">
      {first.map((c, i) => {
        const ch = DRUM[c]
        return (
          <span key={i} className={s.cell}>
            <span className={`${s.half} ${s.top}`} data-c={ch} />
            <span className={`${s.half} ${s.bottom}`} data-c={ch} />
            <span className={s.leaf}>
              <span className={`${s.half} ${s.face}`} data-c={ch} />
              <span className={`${s.half} ${s.back}`} data-c={ch} />
            </span>
            <span className={s.axle} />
          </span>
        )
      })}
    </span>
  )
}
