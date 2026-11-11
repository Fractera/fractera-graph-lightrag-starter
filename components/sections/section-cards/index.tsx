import type { PageItem } from '@/lib/content/page-items'
import { Children, type ReactNode } from 'react'
import { inline } from '@/lib/content/inline'
import { SectionHead } from '@/components/sections/section-head'

// Секция карточек: шапка и сетка в 2 или 3 колонки; внутри — любые части страницы (обычно `card`).
export type CardsProps = { itemKey?: string; badge?: string; title: string; note?: string; cols?: 2 | 3; children?: ReactNode }

const COLS: Record<2 | 3, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }

export function Cards({ itemKey: k = 'cards', badge, title, note, cols = 3, children }: CardsProps) {
  return (
    <section data-block="za3bq" aria-labelledby={`${k}-t`} className="my-10">
      <SectionHead id={`${k}-t`} badge={badge} title={title} note={note ? inline(note, `${k}-n`) : undefined} />
      <ul data-block="z2a8h" className={`mt-8 grid list-none gap-6 p-0 ${COLS[cols]}`}>
        {Children.toArray(children).map((child, i) => <li data-block="hel9w" key={`${k}-${i}`} className="flex">{child}</li>)}
      </ul>
    </section>
  )
}

// 717-2: the set (`components/sections/index.ts`) reads this section by these names — the component, its fields in page data
// and its words in the Markdown twin (`./markdown.ts`).
export { Cards as Section }
export type Shape = { title: string; badge?: string; note?: string; cols?: 2 | 3; itemKey?: string; children: PageItem[] }
export { markdown } from './markdown'
