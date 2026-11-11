# Migration «block → section» — 2026-11-11

Node step 717-2: one word, «section», for a designed part of a page; a section is one folder `components/sections/<kind>/`; a page's
list is `body`. «Block» keeps one meaning — the address of a container (`data-block`, `#block=`, `npm run blocks:ids`).
Script `scripts/migrate-sections.mjs`, map `scripts/migrate-sections.map.json`.

## Done (2)

- rewritten `app/[lang]/(publicLayer)/_data/en.json`
- rewritten `app/[lang]/(publicLayer)/_data/ru.json`

## For your eye (8)

Each line: change the sense «section» to «section» (in Russian «секция»), keep the address; a line that is right as it is stays.

- `README.md:5` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «home page approved by the owner on 2026-10-19 ('app/[lang]/(publicLayer)/_data/', 14 blocks in en and ru) and the blocks it needs —»
- `README.md:6` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «'section-cards', 'section-card', 'section-flow', 'section-metrics', 'section-separator' (from the node blocks). Since **v1.1.6** LightRAG itself»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-graph-landing/README.md:7` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «is drawn by the common view, which also draws catalogue blocks ('section-metrics', 'section-cards', 'section-faq') through the element's»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-graph-landing/index.tsx:20` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// одобренной владельцем 2026-10-19, перенесён: её метрики, карточки и вопросы — блоки каталога в общем виде раздела.»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-graph-landing/index.tsx:279` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «/** Раздел с незнакомым 'id' — общим видом: текст колонкой для чтения, блоки каталога (метрики, карточки, вопросы) во всю ширину.»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-graph-landing/index.tsx:280` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «*  Раздел, который открывает блок со своим заголовком, второго заголовка не получает (650-4). */»
- `components/sections/section-card/index.tsx:4` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// Карточка: рамка и заливка тона; внутри — любые блоки.»
- `components/sections/section-cards/index.tsx:5` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// Секция карточек: шапка и сетка в 2 или 3 колонки; внутри — любые блоки (обычно 'card').»

## Then

`npm run prebuild`, `npx tsc --noEmit`, the build, `npm run eyes` on a page with sections, one commit.
