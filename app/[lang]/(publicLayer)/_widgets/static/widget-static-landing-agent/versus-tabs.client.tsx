"use client"

import { useState, type ReactNode } from "react"
import s from "./landing-agent.module.css"
import { Button } from "@/components/ui/button"

// ПЕРЕКЛЮЧАТЕЛЬ «Claude / LLM ⇄ Fractera AGI» (владелец 2026-09-30: на телефоне карточки сравнения «уходят в бесконечность» —
// «сделать вверху переключатель … в одном случае показывает левую колонку, в другом правую»). Только до 900 px: стрелочный
// перевод с двумя лампами, ползунок цвета табло едет на выбранную сторону, показывается одна карточка. По умолчанию — Fractera.
// Шире — переключателя нет, обе карточки рядом. Обе карточки всегда в HTML: поиск видит обе.

export function VersusTabs({ labels, children }: { labels: [string, string]; children: ReactNode }) {
  const [show, setShow] = useState<"off" | "on">("on")
  return (
    <div data-block="ixjec" className={s.versusTabs} data-show={show}>
      <div data-block="t9xec" className={s.versusSwitch} role="tablist" aria-label={`${labels[0]} / ${labels[1]}`}>
        {(["off", "on"] as const).map((tone, i) => (
          <Button variant="bare" size="bare"
            key={tone}
            type="button"
            role="tab"
            aria-selected={show === tone}
            className={s.versusOption}
            data-tone={tone}
            onClick={() => setShow(tone)}
          >
            <span className={s.lamp} aria-hidden="true" />
            {labels[i]}
          </Button>
        ))}
        <span className={s.versusThumb} aria-hidden="true" />
      </div>
      {children}
    </div>
  )
}
