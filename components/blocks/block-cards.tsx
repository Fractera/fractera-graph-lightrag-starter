import { Children, type ReactNode } from 'react'
import { inline } from '@/lib/blocks/inline'
import { SectionHead } from '@/components/blocks/block-section-head'

// Секция карточек: шапка и сетка в 2 или 3 колонки; внутри — любые блоки (обычно `card`).
export type CardsProps = { blockKey?: string; badge?: string; title: string; note?: string; cols?: 2 | 3; children?: ReactNode }

const COLS: Record<2 | 3, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }

export function Cards({ blockKey: k = 'cards', badge, title, note, cols = 3, children }: CardsProps) {
  return (
    <section aria-labelledby={`${k}-t`} className="my-10">
      <SectionHead id={`${k}-t`} badge={badge} title={title} note={note ? inline(note, `${k}-n`) : undefined} />
      <ul className={`mt-8 grid list-none gap-6 p-0 ${COLS[cols]}`}>
        {Children.toArray(children).map((child, i) => <li key={`${k}-${i}`} className="flex">{child}</li>)}
      </ul>
    </section>
  )
}
