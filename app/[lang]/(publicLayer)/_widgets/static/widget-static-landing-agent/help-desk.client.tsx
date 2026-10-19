"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ArrowLeftRight, Github, Info, Mic, SendHorizontal, TrainFront } from "lucide-react"
import s from "./landing-agent.module.css"
import { useVoiceRecorder, type VoiceStrings } from "@/_tools/tool-voice-input/client/use-voice-recorder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// 350: запись не длиннее 20 секунд (слово владельца); та же граница стоит в двери `/<lang>/api/help-desk/voice` (размер файла).
const VOICE_SECONDS = 20

// СПРАВОЧНОЕ БЮРО ВОКЗАЛА (узел, шаги 348–349; слово владельца 2026-09-30: «оформлена вроде имитации киоска снаружи которого могло
// бы быть написано справочная бюро … открыто 24 часа … в центре у нас будет работать чат … мы будем использовать библиотеку
// готового чата от Vesel … кнопки быстрых ответов … на широкой версии по бокам киоска … как вывески … чуть-чуть в разном стиле …
// чуть-чуть наклонённые … внизу область ввода текста с микрофоном … на телефоне стандартный чат с быстрыми кнопками»).
// Дизайн — навык impeccable, мир страницы (вокзал, табло). Чат — `useChat` (Vercel AI SDK) → дверь `/<lang>/api/help-desk`.
//
// 🔒 «ОТПРАВЛЕНИЕ» — ГЛАВНАЯ ВЫВЕСКА (слово владельца: «ты забыл самую главную кнопку на обоих цепочках табличек … последнюю
// кнопку нарисуй: отправление. Она запустила сценарий описывающей последовательность запуска примерно как был в чате с анной»):
// последняя в обеих цепочках, красная; спрашивает бюро о запуске по шагам — ответ по фактам `(publicLayer)/_libs/help-desk.ts`.
// 🔒 ВЫВЕСКИ И БЫСТРЫЕ КНОПКИ ОТВЕЧАЮТ ГОТОВЫМ ТЕКСТОМ, НАБРАННОЕ — МОДЕЛЬЮ (слово владельца 2026-09-30: «ответы в чат можно
// пробрасывать любой момент а вот уже сообщения у нас будет лимитированы»): вопрос и ответ вывески кладутся в ленту на странице —
// мгновенно, без двери, без предела и даже при выключенном компьютере; набранное уходит в `/<lang>/api/help-desk` (40 в час с адреса).
// Предел превышен (429) — бюро просит вернуться позже; дверь молчит — «бюро сейчас закрыто». Микрофон (шаг 350): нажал — запись, нажал ещё раз или прошло 20 с — расшифровка самой дешёвой
// моделью в поле ввода; отправляет её человек.

export type HelpDeskWords = {
  title: string
  hours: string
  greeting: string
  who: string
  you: string
  placeholder: string
  send: string
  mic: string
  questions: string[]
  /** Готовые ответы вывесок — по порядку `questions` (факты `(publicLayer)/_libs/help-desk.ts`, утверждены владельцем). */
  answers: string[]
  departure: { label: string; question: string; answer: string }
  /** Владелец: «одну кнопку отправления слева а другую кнопку назовём пересадки в пути … измени красный цвет … на другой». */
  transfer: { label: string; question: string; answer: string }
  /** Владелец: «кнопка GitHub справа от микрофона» — открывает репозиторий проекта в новой вкладке. */
  github: { label: string; href: string }
  thinking: string
  limit: string
  closed: string
}

const textOf = (m: { parts?: { type: string; text?: string }[] }) =>
  (m.parts ?? []).filter((p) => p.type === "text").map((p) => p.text ?? "").join("")

// Ссылки в ответе бюро: итог процедуры — репозиторий на GitHub и его Fork (слово владельца), поэтому адреса github.com и
// claude.com кликабельны; прочие адреса остаются текстом.
const LINK_HOSTS = ["github.com", "claude.com"]
function Linked({ text }: { text: string }) {
  return <>{text.split(/(https:\/\/[^\s,)]+)/g).map((p, i) => {
    if (!p.startsWith("https://")) return p
    const url = p.replace(/[.;:»]+$/, "")
    let host = ""
    try { host = new URL(url).hostname.replace(/^www\./, "") } catch { /* не адрес */ }
    return LINK_HOSTS.includes(host)
      ? <span key={i}><a href={url} target="_blank" rel="noopener noreferrer">{url.replace("https://", "")}</a>{p.slice(url.length)}</span>
      : p
  })}</>
}

export function HelpDesk({ w, lang, voiceWords }: { w: HelpDeskWords; lang: string; voiceWords: VoiceStrings }) {
  const [text, setText] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const transport = useMemo(() => new DefaultChatTransport({ api: `/${lang}/api/help-desk`, body: { lang } }), [lang])
  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({ transport })
  const busy = status === "submitted" || status === "streaming"
  const voiceExtra = useMemo(() => ({ lang }), [lang])
  const voice = useVoiceRecorder({ targetRef: input, value: text, onChange: setText, lang, apiUrl: `/${lang}/api/help-desk/voice`, maxSeconds: VOICE_SECONDS, extra: voiceExtra, strings: voiceWords })
  // Расшифровка встаёт в поле сразу: само поле и есть проверка перед «Отправить».
  useEffect(() => { if (voice.draft) voice.accept() }, [voice.draft]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }) }, [messages, status, error])

  // Набранный вопрос — модели (дверь, предел).
  const ask = (q: string) => {
    const t = q.trim()
    if (!t || busy) return
    if (error) clearError()
    void sendMessage({ text: t })
  }
  // Вывеска — готовый ответ прямо в ленту.
  const quick = (q: string, answer: string) => {
    if (busy) return
    if (error) clearError()
    const n = Date.now().toString(36)
    setMessages((prev) => [
      ...prev,
      { id: `q-${n}`, role: "user", parts: [{ type: "text", text: q }] },
      { id: `a-${n}`, role: "assistant", parts: [{ type: "text", text: answer }] },
    ])
  }
  const submit = () => {
    const t = text.trim()
    if (!t) { input.current?.focus(); return }
    setText("")
    ask(t)
  }
  const failure = error ? (/429|rate-limit/i.test(error.message) ? w.limit : w.closed) : null

  const half = Math.ceil(w.questions.length / 2)
  const sign = (q: string, i: number) => (
    <li data-block="hd3s1" key={q} className={s.deskSign} data-look={i % 3}>
      <span className={s.deskSignRods} aria-hidden="true" />
      <Button variant="bare" size="bare" type="button" className={s.deskSignPlate} onClick={() => quick(q, w.answers[i] ?? "")} disabled={busy}>{q}</Button>
    </li>
  )
  // Главные вывески низа цепочек: слева «Отправление» (красный сигнал), справа «Пересадки в пути» (оранжевый — цвет кольца пересадок).
  const main = (block: string, look: "go" | "transfer", item: { label: string; question: string; answer: string }) => (
    <li data-block={block} className={s.deskSign} data-look={look}>
      <span className={s.deskSignRods} aria-hidden="true" />
      <Button variant="bare" size="bare" type="button" className={s.deskSignPlate} onClick={() => quick(item.question, item.answer)} disabled={busy}>
        {look === "go" ? <TrainFront className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <ArrowLeftRight className="size-5" strokeWidth={2.4} aria-hidden="true" />}
        {item.label}
      </Button>
    </li>
  )

  return (
    <div data-block="hd3g1" className={s.deskGrid}>
      <ul data-block="hd3l1" className={s.deskSigns} data-side="left">
        {w.questions.slice(0, half).map((q, i) => sign(q, i))}
        {main("hd3d1", "go", w.departure)}
      </ul>

      <div data-block="hd3k1" className={s.kiosk}>
        <div data-block="hd3r1" className={s.kioskRoof}>
          <h2 data-block="hd3t1" className={s.kioskPlate}>
            <span className={s.kioskPlateMark} aria-hidden="true"><Info className="size-5" strokeWidth={2.6} /></span>
            {w.title}
          </h2>
          <p data-block="hd3h1" className={s.kioskHours}><span className={s.kioskLamp} aria-hidden="true" />{w.hours}</p>
        </div>

        <div data-block="hd3b1" className={s.kioskBody}>
          <div data-block="hd3w1" ref={log} className={s.kioskWindow} aria-live="polite">
            <p data-block="hd3m1" className={s.kioskMsg}>
              <span className={s.kioskWho}>{w.who}</span>
              {w.greeting}
            </p>
            {messages.map((m) => (
              <p data-block="hd3m2" key={m.id} className={s.kioskMsg} data-me={m.role === "user" ? "" : undefined}>
                <span className={s.kioskWho}>{m.role === "user" ? w.you : w.who}</span>
                <Linked text={textOf(m)} />
              </p>
            ))}
            {status === "submitted" && (
              <p data-block="hd3m3" className={s.kioskMsg} data-wait="">
                <span className={s.kioskWho}>{w.who}</span>
                {w.thinking}
              </p>
            )}
            {failure && (
              <p data-block="hd3m4" className={s.kioskMsg} data-fail="">
                <span className={s.kioskWho}>{w.who}</span>
                {failure}
              </p>
            )}
          </div>

          <ul data-block="hd3c1" className={s.kioskChips}>
            <li data-block="hd3c3"><Button variant="bare" size="bare" type="button" className={s.kioskChip} data-go="" onClick={() => quick(w.departure.question, w.departure.answer)} disabled={busy}>{w.departure.label}</Button></li>
            <li data-block="hd3c4"><Button variant="bare" size="bare" type="button" className={s.kioskChip} data-transfer="" onClick={() => quick(w.transfer.question, w.transfer.answer)} disabled={busy}>{w.transfer.label}</Button></li>
            {w.questions.map((q, i) => (
              <li data-block="hd3c2" key={q}><Button variant="bare" size="bare" type="button" className={s.kioskChip} onClick={() => quick(q, w.answers[i] ?? "")} disabled={busy}>{q}</Button></li>
            ))}
          </ul>

          <form data-block="hd3f1" className={s.kioskCounter} onSubmit={(e) => { e.preventDefault(); submit() }}>
            <Input
              ref={input}
              className={s.kioskInput}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={w.placeholder}
              aria-label={w.placeholder}
              maxLength={1000}
            />
            <Button variant="bare" size="bare"
              type="button"
              className={s.kioskMic}
              aria-label={w.mic}
              title={w.mic}
              aria-pressed={voice.recording}
              data-rec={voice.recording ? "" : undefined}
              data-busy={voice.busy ? "" : undefined}
              disabled={!voice.supported || voice.busy}
              onClick={() => (voice.recording ? voice.stop() : voice.start())}
            >
              {voice.recording ? <span className={s.kioskMicTime}>{voice.elapsed.slice(3)}</span> : <Mic className="size-5" strokeWidth={2.2} aria-hidden="true" />}
            </Button>
            <a href={w.github.href} target="_blank" rel="noopener noreferrer" className={s.kioskMic} aria-label={w.github.label} title={w.github.label}>
              <Github className="size-5" strokeWidth={2.2} aria-hidden="true" />
            </a>
            <Button variant="bare" size="bare" type="submit" className={s.kioskSend} disabled={busy} aria-label={w.send}>
              <span className={s.kioskSendText}>{w.send}</span>
              <SendHorizontal className="size-5" strokeWidth={2.2} aria-hidden="true" />
            </Button>
          </form>
          {voice.note && <p data-block="hd3v1" className={s.kioskVoiceNote} role="status">{voice.note}</p>}
        </div>
      </div>

      <ul data-block="hd3l2" className={s.deskSigns} data-side="right">
        {w.questions.slice(half).map((q, i) => sign(q, i + half))}
        {main("hd3d2", "transfer", w.transfer)}
      </ul>
    </div>
  )
}
