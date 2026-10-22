// Words of the widget «graph search» (node step 540-5) — its own, en and ru. The server picks the language in `_widgets/index.tsx`
// and passes them as props: the island never imports this dictionary (check:lang-delivery).
export type GraphSearchUi = {
  statusTitle: string
  loading: string
  entities: string
  relationships: string
  chunks: string
  /** {lightrag} {python} {embedModel} */
  versions: string
  notInstalled: string
  noKey: string
  keyRefused: string
  busy: string
  unreachable: string
  searchTitle: string
  placeholder: string
  find: string
  searching: string
  hint: string
  tooLong: string
  nothing: string
  /** {entities} {relationships} {chunks} */
  foundLine: string
  /** {reason} */
  failed: string
}

const DICT: Record<string, GraphSearchUi> = {
  en: {
    statusTitle: 'What the graph holds',
    loading: 'Reading the graph…',
    entities: 'Entities',
    relationships: 'Links',
    chunks: 'Fragments',
    versions: 'LightRAG {lightrag} on Python {python}. Vectors are computed by {embedModel}.',
    notInstalled: 'The Python part of the graph is not installed on this computer, so the graph cannot store or search anything yet.',
    noKey: 'There is no OpenAI key. The graph needs it to compute vectors: add it on the node\'s «Environment variables» page.',
    keyRefused: 'OpenAI refused the key (401). Replace it on the node\'s «Environment variables» page, then search again.',
    busy: 'The graph is busy with another call. Try again in a moment.',
    unreachable: 'The graph did not answer. The rest of the page still works; try again in a minute.',
    searchTitle: 'Search the graph',
    placeholder: 'Who works on quantum computing?',
    find: 'Find',
    searching: 'Searching…',
    hint: 'Your words go to the graph as you typed them. No language model runs here; OpenAI only turns the words into vectors.',
    tooLong: 'Keep the question under 300 characters.',
    nothing: 'Nothing in the graph matches these words.',
    foundLine: 'Found {entities} entities, {relationships} links and {chunks} fragments.',
    failed: 'The search failed: {reason}',
  },
  ru: {
    statusTitle: 'Что сейчас в графе',
    loading: 'Читаю граф…',
    entities: 'Сущности',
    relationships: 'Связи',
    chunks: 'Фрагменты',
    versions: 'LightRAG {lightrag} на Python {python}. Векторы считает {embedModel}.',
    notInstalled: 'На этом компьютере не установлена Python-часть графа, поэтому он пока ничего не хранит и не ищет.',
    noKey: 'Нет ключа OpenAI. Без него граф не считает векторы: добавьте ключ на странице узла «Переменные окружения».',
    keyRefused: 'OpenAI отклонил ключ (401). Замените его на странице узла «Переменные окружения» и повторите поиск.',
    busy: 'Граф занят другим вызовом. Повторите через минуту.',
    unreachable: 'Граф не ответил. Остальная страница работает, попробуйте через минуту.',
    searchTitle: 'Поиск по графу',
    placeholder: 'Кто занимается квантовыми вычислениями?',
    find: 'Найти',
    searching: 'Ищу…',
    hint: 'Ваши слова уходят в граф так, как вы их написали. Языковая модель здесь не работает, OpenAI только переводит слова в векторы.',
    tooLong: 'Вопрос должен быть короче 300 знаков.',
    nothing: 'В графе нет ничего по этим словам.',
    foundLine: 'Нашлось: сущностей {entities}, связей {relationships}, фрагментов {chunks}.',
    failed: 'Поиск не удался: {reason}',
  },
}

export function graphSearchUi(lang: string): GraphSearchUi {
  return DICT[lang] ?? DICT.en
}
