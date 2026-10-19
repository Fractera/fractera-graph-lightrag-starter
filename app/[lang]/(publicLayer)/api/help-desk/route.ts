// @api answer landing visitors from the information desk kiosk chat
import { NextRequest, NextResponse } from "next/server"
import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { openAiKey } from "@/lib/openai-key"
import { HELP_DESK_MODEL, allowRequest, helpDeskSystem } from "@/app/[lang]/(publicLayer)/_libs/help-desk"

// ДВЕРЬ СПРАВОЧНОГО БЮРО (узел, шаг 349): чат киоска на лендинге (`components/landing-agent/help-desk.client.tsx`, `useChat`).
// Открыта посетителям без входа (`PUBLIC_API_PREFIXES` в `proxy.ts`) — поэтому предел с одного адреса и короткие ответы
// (решение владельца 2026-09-30). Адрес — `cf-connecting-ip` (через туннель и копию Cloudflare), иначе «local».
// Ответы — только по фактам `(publicLayer)/_libs/help-desk.ts`.

// 422: только POST — Next не делает его статическим; `force-dynamic` в публичном слое запрещён сторожами (check-static, check-content).

const MAX_MESSAGES = 12
const MAX_CHARS = 1000

type Body = { messages?: UIMessage[]; lang?: string }

export async function POST(req: NextRequest) {
  const key = openAiKey()
  if (!key) return NextResponse.json({ ok: false, reason: "no-key" }, { status: 503 })
  const address = req.headers.get("cf-connecting-ip") ?? "local"
  if (!allowRequest(address)) return NextResponse.json({ ok: false, reason: "rate-limit" }, { status: 429 })

  const body = (await req.json().catch(() => null)) as Body | null
  const lang = body?.lang === "ru" ? "ru" : "en"
  // Только последние реплики и только ЧИСТЫЙ текст, каждая не длиннее MAX_CHARS: чужой длинный ввод не превращается в счёт.
  // ✗ Замерено 2026-09-30 (владелец: «ответ приходит только один раз а потом … бюро сейчас закрыто»): useChat возвращает в истории
  // ответ модели с пометками OpenAI (`providerMetadata.openai.itemId` текста и шаг рассуждения). Шаг рассуждения отбрасывался, а
  // ссылка на него оставалась — OpenAI отклонял второй запрос. Поэтому из частей берётся только `text`, без метаданных.
  const messages = (Array.isArray(body?.messages) ? body.messages : []).slice(-MAX_MESSAGES)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: String(m.id ?? ""),
      role: m.role,
      parts: (m.parts ?? []).filter((p) => p.type === "text").map((p) => ({ type: "text" as const, text: String((p as { text?: string }).text ?? "").slice(0, MAX_CHARS) })),
    }))
    .filter((m) => m.parts.some((p) => p.text.trim())) as UIMessage[]
  if (messages.length === 0) return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 })

  const openai = createOpenAI({ apiKey: key })
  const result = streamText({
    model: openai(HELP_DESK_MODEL),
    system: helpDeskSystem(lang),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 300,
  })
  return result.toUIMessageStreamResponse()
}
