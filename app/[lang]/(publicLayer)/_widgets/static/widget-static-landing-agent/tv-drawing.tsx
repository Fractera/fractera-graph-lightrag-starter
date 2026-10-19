import s from "./landing-agent.module.css"

// РИСУНОК ЛАМПОВОГО ТЕЛЕВИЗОРА — ОДИН НА ДВА МЕСТА (владелец 2026-10-01). Кнопка-телевизор широкого экрана (`tv-set.client.tsx`)
// рисует им все фазы; узкий экран — неподвижный телевизор с play с самого начала («убери кнопку включить, пусть на нём всегда горит
// иконка YouTube»), его отдаёт сервер. Чистая функция без состояния — годится и серверу, и островку.
// 🛑 Цвета таблицы — цвета настоящей тестовой таблицы (SMPTE), а не роли «Дизайна»: это изображение предмета, узнаётся по ним.

export type TvPhase = "off" | "noise" | "bars" | "play"
const TOP = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"]
const MID = ["#0000c0", "#131313", "#c000c0", "#131313", "#00c0c0", "#131313", "#c0c0c0"]

export function TvDrawing({ uid, phase, seed = 1 }: { uid: string; phase: TvPhase; seed?: number }) {
  const isOn = phase !== "off"
  const W = 144 / 7
  return (
    <svg viewBox="0 0 260 270" className={s.tvSvg} aria-hidden="true">
      <defs>
        <clipPath id={`clip${uid}`}><rect x={34} y={64} width={144} height={122} rx={18} /></clipPath>
        <filter id={`noise${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="table" tableValues="1 1" /></feComponentTransfer>
        </filter>
      </defs>
      {/* «Рожки» антенны */}
      <path className={s.tvLine} d="M130 40 L98 6 M130 40 L166 10" />
      <circle className={s.tvBody} cx={130} cy={40} r={7} />
      {/* Ножки */}
      <path className={s.tvLine} d="M56 206 L40 262 M204 206 L220 262" />
      <rect className={s.tvBody} x={10} y={40} width={240} height={172} rx={20} />
      <rect className={s.tvBezel} x={24} y={54} width={164} height={142} rx={24} />
      <g clipPath={`url(#clip${uid})`}>
        <rect className={s.tvGlass} x={34} y={64} width={144} height={122} />
        {phase === "noise" && <rect x={34} y={64} width={144} height={122} filter={`url(#noise${uid})`} className={s.tvNoise} />}
        {phase === "bars" && (
          <g className={s.tvBars}>
            {TOP.map((c, i) => <rect key={c} x={34 + i * W} y={64} width={W + 0.5} height={82} fill={c} />)}
            {MID.map((c, i) => <rect key={`m${i}`} x={34 + i * W} y={146} width={W + 0.5} height={10} fill={c} />)}
            <rect x={34} y={156} width={26} height={30} fill="#00214c" />
            <rect x={60} y={156} width={26} height={30} fill="#ffffff" />
            <rect x={86} y={156} width={26} height={30} fill="#32006a" />
            <rect x={112} y={156} width={66} height={30} fill="#131313" />
          </g>
        )}
        {phase === "play" && (
          <g className={s.tvPlay}>
            <rect className={s.tvPlayBox} x={78} y={103} width={56} height={40} rx={11} />
            <path className={s.tvPlayArrow} d="M100 113 L117 123 L100 133 Z" />
          </g>
        )}
        {/* Блик выпуклого стекла */}
        <path className={s.tvShine} d="M44 76 Q70 66 104 68 Q66 74 48 96 Z" />
      </g>
      {/* Ручки, лампа, решётка динамика */}
      <circle className={s.tvLamp} cx={219} cy={62} r={4} data-on={isOn ? "" : undefined} />
      <circle className={s.tvKnob} cx={219} cy={96} r={12} />
      <path className={s.tvKnobMark} d={isOn ? "M219 96 L228 88" : "M219 96 L219 84"} />
      <circle className={s.tvKnob} cx={219} cy={134} r={12} />
      <path className={s.tvKnobMark} d="M219 134 L211 126" />
      <path className={s.tvGrille} d="M204 160 H234 M204 168 H234 M204 176 H234 M204 184 H234 M204 192 H234" />
    </svg>
  )
}
