// БАРАБАН ТАБЛО — УПОРЯДОЧЕННЫЙ НАБОР ФЛАПОВ ОДНОЙ ЯЧЕЙКИ (impeccable-on-design.md, «Split-flap letters»). Данные, не код:
// пустой флап первым, затем кириллица А–Я с Ё на своём месте, латиница A–Z, цифры, несколько знаков. Барабан вращается
// только вперёд, поэтому шагов от текущего флапа до цели — `(цель − текущий + длина) mod длина`: от «А» до «Б» один шаг,
// от «Б» до «А» — весь барабан. Символа нет на барабане — ячейка встаёт на пустой флап; добавьте символ сюда.

export const DRUM: readonly string[] = [
  " ",
  ...Array.from("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"),
  ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
  ...Array.from("0123456789"),
  ".", ",", "-", ":", "/", "&", "?", "!",
]

const AT = new Map(DRUM.map((ch, i) => [ch, i]))

/** Место символа на барабане; флапы только заглавные, чужой символ — пустой флап (0). */
export function drumIndex(ch: string): number {
  return AT.get(ch.toLocaleUpperCase()) ?? 0
}

/** Слово как ряд флапов ширины `n`: короткое слово добивается пустыми флапами справа. */
export function drumRow(word: string, n: number): number[] {
  const row = Array.from(word).map(drumIndex)
  while (row.length < n) row.push(0)
  return row.slice(0, n)
}

/** Сколько шагов барабана от флапа `from` до флапа `to` — только вперёд. */
export function drumSteps(from: number, to: number): number {
  return (to - from + DRUM.length) % DRUM.length
}
