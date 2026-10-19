import s from "./landing-agent.module.css"
import { TvSet } from "./tv-set.client"
import { ClockHands } from "./clock-hands.client"
import { TvDrawing } from "./tv-drawing"

// ЗАЛ ОЖИДАНИЯ (владелец 2026-10-01): «изобразить ожидание … схематическое плоское кресло слева, окно и занавеска, убранная книзу и
// развёрнутая сверху (асимметричная драпировка гардины с кокилье), справа телевизор на ножках, старый ламповый». Домысел агента в мире
// вокзала (DIRECTION.md): это зал ожидания станции — над креслом и окном висят круглые вокзальные часы, под креслом ковёр.
// Неподвижная сцена — серверная разметка (видна без JavaScript); живой только телевизор (`tv-set.client.tsx`). Цвета — роли макета.
export function WaitingRoom({ on, off, tv, scene }: { on: string; off: string; tv: string; scene: string }) {
  return (
    <div data-block="gbreq" className={s.room}>
      <svg viewBox="0 0 1000 400" className={s.roomSvg} role="img" aria-label={scene}>
        <rect className={s.roomFloor} x={0} y={338} width={1000} height={62} />
        <path className={s.roomSkirt} d="M0 338 H1000" />

        {/* Окно: стекло, переплёт, карниз */}
        <rect className={s.roomGlass} x={170} y={44} width={230} height={226} />
        <path className={s.roomFrame} d="M170 44 H400 V270 H170 Z M285 44 V270 M170 156 H400" />
        <path className={s.roomSill} d="M156 274 H414" />
        <path className={s.roomRod} d="M128 28 H446" />
        <circle className={s.roomRodEnd} cx={126} cy={28} r={6} />
        <circle className={s.roomRodEnd} cx={448} cy={28} r={6} />
        {/* Левая штора: идёт с карниза, собрана подхватом внизу и расходится к полу */}
        <path className={s.roomCurtain} d="M138 32 L204 34 Q214 150 190 250 Q222 292 206 338 L126 338 Q150 292 164 250 Q136 150 138 32 Z" />
        <path className={s.roomFold} d="M168 40 Q176 150 176 248 M180 260 Q190 300 176 336" />
        <rect className={s.roomTie} x={160} y={242} width={40} height={11} rx={5} transform="rotate(-8 180 247)" />
        {/* Ламбрекен с фестонами по верху окна */}
        <path className={s.roomCurtain} d="M132 28 H442 V64 Q404 102 366 68 Q326 104 287 68 Q248 104 208 68 Q170 102 132 64 Z" />
        {/* Кокилье — каскад складок справа */}
        <path className={s.roomCurtain} d="M404 60 H444 V176 L432 160 L424 174 L416 158 L408 170 L404 162 Z" />

        {/* Вокзальные часы */}
        <path className={s.roomRodLine} d="M560 20 V48" />
        <circle className={s.clockFace} cx={560} cy={92} r={44} />
        <path className={s.clockTicks} d="M560 54 V62 M560 122 V130 M522 92 H530 M590 92 H598" />
        {/* Стрелки — реальное время посетителя (островок); в HTML до оживления их нет. */}
        <ClockHands cx={560} cy={92} r={44} />
        <circle className={s.clockPin} cx={560} cy={92} r={4} />

        {/* Ковёр и кресло */}
        <ellipse className={s.roomRug} cx={236} cy={352} rx={190} ry={13} />
        <rect className={s.chairBack} x={112} y={196} width={196} height={104} rx={30} />
        <rect className={s.chairSeat} x={108} y={280} width={204} height={38} rx={14} />
        <rect className={s.chairArm} x={80} y={248} width={48} height={82} rx={20} />
        <rect className={s.chairArm} x={292} y={248} width={48} height={82} rx={20} />
        <path className={s.chairLeg} d="M100 330 V348 M320 330 V348" />
      </svg>
      <div data-block="cycgu" className={s.roomTv}>
        <TvSet on={on} off={off} label={tv} />
      </div>
      {/* Узкий экран (владелец 2026-10-01): «диван и окно убери, поставь телевизор в центр, убери кнопку включить, пусть на нём
          всегда горит иконка YouTube с самого начала». Сцена выше скрыта стилем, здесь — неподвижный телевизор с play от сервера. */}
      <div data-block="tvmob" className={s.roomMobile} role="img" aria-label={tv}>
        <TvDrawing uid="tvm" phase="play" />
      </div>
    </div>
  )
}
