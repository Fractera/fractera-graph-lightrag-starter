import type { ReactNode } from 'react'
import { H2, Lead } from '@/components/ui/typography'
import { badgeClass } from '@/lib/blocks/tone'

// Шапка секции: ярлык, заголовок, подзаголовок — одна у всех секций с заголовком.
export function SectionHead({ id, badge, title, note }: { id: string; badge?: string; title: string; note?: ReactNode }) {
  return (
    <div data-block="drg4g" className="flex flex-col">
      {badge && <span className={`mb-4 self-start ${badgeClass('data')}`}>{badge}</span>}
      <H2 data-block="djjrc" id={id}>{title}</H2>
      {note && <Lead data-block="zic30" className="mt-3 max-w-2xl">{note}</Lead>}
    </div>
  )
}
