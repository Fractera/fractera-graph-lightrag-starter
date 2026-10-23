import { Metric, Small } from '@/components/ui/typography'
import { inline } from '@/lib/blocks/inline'

// Ряд мер: три-четыре ячейки, в каждой ЧИСЛО и то, к чему оно относится. `value` не переводится, `label` — да.
export type MetricsProps = { blockKey?: string; items: { value: string; label: string }[] }

export function Metrics({ blockKey: k = 'metrics', items }: MetricsProps) {
  return (
    <dl data-block="id19j" className="my-8 grid divide-y divide-border overflow-hidden rounded-2xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item, i) => (
        <div data-block="uymab" key={`${k}-${i}`} className="flex flex-col items-center gap-2 px-5 py-7 text-center">
          <dt data-block="c8xhm"><Metric className="text-primary">{item.value}</Metric></dt>
          <dd data-block="nefrz"><Small data-block="z6bam">{inline(item.label, `${k}-${i}-l`)}</Small></dd>
        </div>
      ))}
    </dl>
  )
}
