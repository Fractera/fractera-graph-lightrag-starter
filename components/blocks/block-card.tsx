import type { ReactNode } from 'react'
import type { Tone } from '@/lib/blocks/tone'

// Карточка: рамка и заливка тона; внутри — любые блоки.
export type CardProps = { tone?: Tone; children?: ReactNode }

const TONE_FILL: Record<Tone, string> = {
  data: 'border-tone-data/25 bg-gradient-to-b from-tone-data/10 to-transparent',
  reach: 'border-tone-reach/25 bg-gradient-to-b from-tone-reach/10 to-transparent',
  access: 'border-tone-access/25 bg-gradient-to-b from-tone-access/10 to-transparent',
  code: 'border-tone-code/25 bg-gradient-to-b from-tone-code/10 to-transparent',
  muted: 'border-border bg-gradient-to-b from-muted/60 to-transparent',
}

export function Card({ tone, children }: CardProps) {
  return <div className={`flex w-full flex-1 flex-col gap-3 rounded-2xl border p-6 ${tone ? TONE_FILL[tone] : 'border-border'}`}>{children}</div>
}
