import s from "./landing-agent.module.css"

// «ПЕШИЙ МАРШРУТ» (секция «Fractera vs LLM»). Владелец 2026-09-30: чаты Claude.ai хороши на коротком маршруте, но части
// проекта из разных мест не связать — «внутри существует ещё одна железная дорога, которая какую-то часть идёт параллельно
// основной, а потом соединяется с ней в одну, и в момент, когда соединяются, они заходят в тупик». Две станции-чата, два пути
// параллельно, слияние — и сразу красный упор. Квадрат 600×600, как карта справа, чтобы экраны были одной высоты. Неподвижна
// намеренно: движение секции — у магистрали справа. Рисует сервер.
// Правка владельца того же дня: после слияния путь разрушается (рельсы гнутся и рвутся, шпалы разбросаны), и только потом знак
// тупика; четыре оранжевые сноски — продукты Claude, которыми идут по этому пути. Иконки свои (не знак Claude), цвет — `--claude`.

// Слияние у x=350: общий путь идёт целым до 408, дальше разрушение нарастает к знаку тупика (526).
const MAIN = "M40 232 H350"
const SIDE = "M40 472 H170 C280 472 250 232 350 232"
const MERGED = "M350 232 H408"
// Обломки пути после слияния: отрезок и поворот вокруг его середины — чем дальше, тем сильнее.
const BROKEN: { d: string; turn: number; cx: number; cy: number }[] = [{ d: "M412 233 H432", turn: 3, cx: 422, cy: 233 }]
// Дальше пути как целого нет: рельсы по одному — разошлись, потом один торчит вверх, другой упал.
const RAILS: [number, number, number, number][] = [
  [438, 227, 462, 223],
  [440, 240, 460, 248],
  [470, 226, 486, 206],
  [468, 252, 490, 268],
]
// Шпалы, ещё лежащие поперёк разошедшихся рельсов.
const LOOSE_TIES: { x: number; turn: number }[] = [
  { x: 440, turn: 12 },
  { x: 452, turn: -20 },
]
// Разбросанные шпалы и щебень.
const DEBRIS: { x: number; y: number; w: number; turn: number }[] = [
  { x: 478, y: 236, w: 14, turn: 40 },
  { x: 494, y: 214, w: 12, turn: -60 },
  { x: 498, y: 256, w: 15, turn: 75 },
  { x: 462, y: 272, w: 10, turn: -15 },
  { x: 424, y: 258, w: 9, turn: 20 },
]
const GRAVEL: [number, number, number][] = [
  [506, 240, 2.5],
  [488, 226, 2],
  [515, 232, 1.8],
  [476, 280, 2],
]

type Icon = "chat" | "code" | "cowork" | "platform"
// Иконки 24×24 вокруг нуля — рисуются линией цвета табло внутри светлого кружка.
const ICON: Record<Icon, React.ReactNode> = {
  chat: <path d="M-8 -7 h16 a3 3 0 0 1 3 3 v8 a3 3 0 0 1 -3 3 h-7 l-5 4 v-4 h-4 a3 3 0 0 1 -3 -3 v-8 a3 3 0 0 1 3 -3z" />,
  code: (
    <>
      <rect x={-10} y={-8} width={20} height={16} rx={2.5} />
      <path d="M-6 -3 l3.5 3 -3.5 3 M0 3.5 h5" />
    </>
  ),
  cowork: <path d="M-10 -6 h7 l2 2.5 h11 v10.5 h-20z M4 -10 v4 M2 -8 h4" />,
  // Claude Platform (platform.claude.com — агенты и приложения на API): стопка слоёв.
  platform: <path d="M0 -10 L10 -5 L0 0 L-10 -5z M-10 0 L0 5 L10 0 M-10 4.5 L0 9.5 L10 4.5" />,
}
// Сноски по порядку данных: где табличка, из какой её стороны идёт линия и в какую точку пути она указывает.
const CALLOUTS: { box: [number, number]; from: "bottom" | "top" | "left" | "right"; pt: [number, number] }[] = [
  { box: [40, 60], from: "right", pt: [300, 232] },
  { box: [300, 70], from: "bottom", pt: [378, 232] },
  { box: [322, 392], from: "left", pt: [264, 352] },
  { box: [40, 524], from: "top", pt: [120, 472] },
]
const H = 40

function Track({ d, turn }: { d: string; turn?: { a: number; cx: number; cy: number } }) {
  return (
    <g transform={turn ? `rotate(${turn.a} ${turn.cx} ${turn.cy})` : undefined}>
      <path className={s.lostTies} d={d} />
      <path className={s.lostRail} d={d} />
      <path className={s.lostGauge} d={d} />
    </g>
  )
}

export type Product = { name: string; icon: Icon }

export function LostRoute({ stations, deadEnd, products, label }: { stations: [string, string]; deadEnd: string; products?: Product[]; label: string }) {
  return (
    <svg className={s.lost} viewBox="0 0 600 600" role="img" aria-label={label}>
      {[172, 412].map((y, i) => (
        <g key={y} className={s.lostPlatform}>
          <rect x={40} y={y} width={170} height={38} rx={3} />
          <text x={125} y={y + 25} textAnchor="middle">{stations[i]}</text>
        </g>
      ))}
      <Track d={SIDE} />
      <Track d={MAIN} />
      <Track d={MERGED} />
      {BROKEN.map((b) => <Track key={b.d} d={b.d} turn={{ a: b.turn, cx: b.cx, cy: b.cy }} />)}
      <g className={s.lostLooseTies}>
        {LOOSE_TIES.map((t) => <rect key={t.x} x={t.x} y={222} width={5} height={26} transform={`rotate(${t.turn} ${t.x + 2.5} 235)`} />)}
      </g>
      <g className={s.lostBrokenRail}>
        {RAILS.map(([x1, y1, x2, y2]) => <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      <g className={s.lostDebris}>
        {DEBRIS.map((t) => (
          <rect key={`${t.x}-${t.y}`} x={t.x} y={t.y} width={t.w} height={5} transform={`rotate(${t.turn} ${t.x + t.w / 2} ${t.y + 2.5})`} />
        ))}
        {GRAVEL.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
      </g>
      <g className={s.lostStop}>
        <rect x={526} y={208} width={10} height={48} />
        <rect x={562} y={208} width={10} height={48} />
        <rect x={518} y={216} width={62} height={13} />
        <text x={549} y={290} textAnchor="middle">{deadEnd}</text>
      </g>
      {products?.slice(0, CALLOUTS.length).map((p, i) => {
        const c = CALLOUTS[i]
        const [x, y] = c.box
        const w = Math.round(p.name.length * 9.6 + 56)
        const [ax, ay] =
          c.from === "bottom" ? [x + w / 2, y + H] : c.from === "top" ? [x + w / 2, y] : c.from === "left" ? [x, y + H / 2] : [x + w, y + H / 2]
        return (
          <g key={p.name} className={s.lostCallout}>
            <line x1={ax} y1={ay} x2={c.pt[0]} y2={c.pt[1]} />
            <circle cx={c.pt[0]} cy={c.pt[1]} r={6} className={s.lostCalloutPin} />
            <rect x={x} y={y} width={w} height={H} rx={H / 2} />
            <circle cx={x + 22} cy={y + H / 2} r={15} className={s.lostIconBg} />
            <g transform={`translate(${x + 22} ${y + H / 2})`} className={s.lostIcon}>{ICON[p.icon]}</g>
            <text x={x + 44} y={y + 26}>{p.name}</text>
          </g>
        )
      })}
    </svg>
  )
}
