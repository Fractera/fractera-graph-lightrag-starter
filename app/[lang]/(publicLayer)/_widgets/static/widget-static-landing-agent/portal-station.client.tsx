"use client"

import { useEffect, useRef, useState } from "react"
import s from "./landing-agent.module.css"
import { Button } from "@/components/ui/button"

// ПОРТАЛ НА СТАНЦИИ ПЕРЕСАДКИ (узел, шаг 342; слово владельца 2026-09-30): из центра средней станции «Маршрут построен» —
// пульс, затухающий к радиусу 80 px; наведение — за 3 с из точки раскрывается вращающийся портал («как будто в фильмах,
// когда люди совершают квантовый скачок»), внутри — круглая кнопка «Жми» (ведёт на подписку). На телефоне — по нажатию.
//
// Островок поверх статического близнеца: без JavaScript точка станции стоит, как стояла, а кнопка «Жми» — обычная ссылка
// внутри портала, раскрываемого наведением или фокусом (CSS). JavaScript добавляет только одно — открытие нажатием там, где
// наведения нет (`data-open`), и закрытие нажатием мимо. Цвета — отношения к `--primary` страницы (токены «Дизайна»).

export function PortalStation({ href, label, aria }: { href: string; label: string; aria: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [open])

  return (
    <span ref={ref} className={s.portal} data-open={open ? "" : undefined}>
      <span className={s.portalPulse} aria-hidden="true" />
      <span className={s.portalPulse} aria-hidden="true" />
      <span className={s.portalPulse} aria-hidden="true" />
      {/* Нажатие на точку там, где нет наведения (телефон), открывает портал; на мыши портал открывает наведение. */}
      <Button variant="bare" size="bare"
        type="button"
        className={s.portalCore}
        aria-label={aria}
        aria-expanded={open}
        onPointerUp={(e) => { if (e.pointerType !== "mouse") setOpen(true) }}
        onClick={(e) => { if (e.detail === 0) setOpen((v) => !v) }}
      />
      <span className={s.portalHole} aria-hidden="true">
        <span className={s.portalSwirl} />
        <span className={s.portalSwirl} />
        <span className={s.portalRim} />
      </span>
      <a href={href} className={s.portalGo} aria-label={aria}>{label}</a>
    </span>
  )
}
