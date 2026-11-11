import type { PageItem } from '@/lib/content/page-items'
import type { ReactNode } from 'react'
import type { Tone } from '@/lib/content/tone'

// Карточка: рамка и заливка тона; внутри — любые части страницы.
export type CardProps = { tone?: Tone; children?: ReactNode }

const TONE_FILL: Record<Tone, string> = {
  data: 'border-tone-data/25 bg-gradient-to-b from-tone-data/10 to-transparent',
  reach: 'border-tone-reach/25 bg-gradient-to-b from-tone-reach/10 to-transparent',
  access: 'border-tone-access/25 bg-gradient-to-b from-tone-access/10 to-transparent',
  code: 'border-tone-code/25 bg-gradient-to-b from-tone-code/10 to-transparent',
  muted: 'border-border bg-gradient-to-b from-muted/60 to-transparent',
}

export function Card({ tone, children }: CardProps) {
  return <div data-block="doxvz" className={`flex w-full flex-1 flex-col gap-3 rounded-2xl border p-6 ${tone ? TONE_FILL[tone] : 'border-border'}`}>{children}</div>
}

// 717-2: the set (`components/sections/index.ts`) reads this section by these names — the component, its fields in page data
// and its words in the Markdown twin (`./markdown.ts`).
export { Card as Section }
export type Shape = { tone?: string; children: PageItem[] }
export { markdown } from './markdown'
