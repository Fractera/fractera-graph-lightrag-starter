import type { CSSProperties } from 'react'
import { H3, P } from '@/components/ui/typography'
import { inline } from '@/lib/content/inline'
import { SectionHead } from '@/components/sections/section-head'

// Как это работает: три шага, одно вытекает из другого. Стили `.flow*` — в дизайн-системе (globals.css).
type Step = { title: string; text: string }
export type FlowProps = { itemKey?: string; badge?: string; title: string; note?: string; steps: [Step, Step, Step] }

export function Flow({ itemKey: k = 'flow', badge, title, note, steps }: FlowProps) {
  return (
    <section data-block="i1sd2" aria-labelledby={`${k}-t`} className="my-10">
      <SectionHead id={`${k}-t`} badge={badge} title={title} note={note ? inline(note, `${k}-n`) : undefined} />
      <ol data-block="o8bzk" className="flow relative mt-8 grid list-none gap-8 p-0 md:gap-6" style={{ '--flow-n': steps.length } as CSSProperties}>
        {steps.map((s, i) => (
          <li data-block="m7pcr" key={`${k}-${i}`} className="flow-step relative flex flex-col gap-4" style={{ '--flow-i': i } as CSSProperties}>
            <span aria-hidden className="flow-node relative z-10 flex size-14 self-center items-center justify-center rounded-full border font-semibold">{i + 1}</span>
            <div data-block="nka8h" className="flow-card w-full flex-1 rounded-2xl border p-5">
              <H3 data-block="vnxwk">{s.title}</H3>
              <P data-block="y4wf0" className="mt-2">{inline(s.text, `${k}-${i}-b`)}</P>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// 717-2: the set (`components/sections/index.ts`) reads this section by these names — the component, its fields in page data
// and its words in the Markdown twin (`./markdown.ts`).
export { Flow as Section }
export type Shape = { title: string; badge?: string; note?: string; itemKey?: string; steps: [{ title: string; text: string }, { title: string; text: string }, { title: string; text: string }] }
export { markdown } from './markdown'
