import { Separator } from "@/components/ui/separator"

// A visible boundary between two parts of a page (owner, 2026-09-25: «не видно границ блоков»).
export function SectionSeparator() {
  return <Separator className="my-8" />
}

// 717-2: the set (`components/sections/index.ts`) reads this section by these names — the component, its fields in page data
// and its words in the Markdown twin (`./markdown.ts`).
export { SectionSeparator as Section }
export type Shape = {  }
export { markdown } from './markdown'
