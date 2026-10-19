// @api transcribe a short visitor voice question for the information desk
import { NextRequest, NextResponse } from "next/server"
import { openAiKey } from "@/lib/openai-key"
import { HELP_DESK_VOICE_MODEL, VOICE_MAX_BYTES, allowRequest } from "@/app/[lang]/(publicLayer)/_libs/help-desk"

// ГОЛОС СПРАВОЧНОГО БЮРО (узел, шаг 350). Слово владельца 2026-09-30: «Голосовой набор это тоже расточительное услуга запускаю
// её тоже через самую дешёвую модель и ограничь запись в 20 секунд». Модель — самая дешёвая расшифровка OpenAI
// (`gpt-4o-mini-transcribe`, 0,003 $ за минуту — developers.openai.com/api/docs/pricing); запись обрывается на 20 секундах в
// браузере (`_tools/tool-voice-input/client/use-voice-recorder.ts`, `maxSeconds`), а здесь отказ для файла больше предела. Свой счёт: 40 расшифровок в час с
// адреса, отдельно от сообщений. Расшифровка встаёт в поле — отправляет её человек, и тогда она считается сообщением.

// 422: только POST — Next не делает его статическим; `force-dynamic` в публичном слое запрещён сторожами (check-static, check-content).

export async function POST(req: NextRequest) {
  const key = openAiKey()
  if (!key) return NextResponse.json({ ok: false, reason: "no-key" }, { status: 503 })
  const address = req.headers.get("cf-connecting-ip") ?? "local"
  if (!allowRequest(`voice:${address}`)) return NextResponse.json({ ok: false, reason: "rate-limit" }, { status: 429 })

  const form = await req.formData().catch(() => null)
  const audio = form?.get("audio")
  const lang = form?.get("lang") === "ru" ? "ru" : "en"
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ ok: false, reason: "no-audio" }, { status: 400 })
  if (audio.size > VOICE_MAX_BYTES) return NextResponse.json({ ok: false, reason: "too-long" }, { status: 413 })

  const upstream = new FormData()
  upstream.append("file", audio, audio.name || "speech.webm")
  upstream.append("model", HELP_DESK_VOICE_MODEL)
  upstream.append("language", lang)
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: upstream })
  if (!r.ok) return NextResponse.json({ ok: false, reason: "failed", status: r.status }, { status: 502 })
  const d = (await r.json()) as { text?: string }
  return NextResponse.json({ ok: true, text: (d.text ?? "").trim() })
}
