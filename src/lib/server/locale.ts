import { getLocale } from '$lib/paraglide/runtime'

/** Set during `withEnrichLocale` so provider calls use the request UI language. */
let localeOverride: string | null = null

const effectiveLocale = (): string => localeOverride ?? getLocale()

/** Runs the callback with a fixed Paraglide locale for all `locale.ts` pickers and TMDB/TVDB language. */
export const withEnrichLocale = async <T>(locale: string, run: () => Promise<T>): Promise<T> => {
  const previous = localeOverride

  localeOverride = locale

  try {
    return await run()
  } finally {
    localeOverride = previous
  }
}

// Maps Paraglide locale codes to TMDB language codes (BCP-47 region-specific).
// Falls back to 'en-US' for unknown locales.
const TMDB_LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ja: 'ja-JP',
  ru: 'ru-RU',
  zh: 'zh-CN',
}

export const getTmdbLanguage = (): string => TMDB_LANGUAGE_MAP[effectiveLocale()] ?? 'en-US'

/** BCP-47 (region) for TheTVDB / other APIs that use Accept-Language. */
export const getAcceptLanguageHeader = (): string => `${getTmdbLanguage()},en;q=0.8`

// Returns true when the current locale is Japanese (for preferring native/romaji titles).
export const isJapaneseLocale = (): boolean => effectiveLocale() === 'ja'

// Returns true when the current locale is English.
export const isEnglishLocale = (): boolean => effectiveLocale() === 'en'

export const isRuLocale = (): boolean => effectiveLocale() === 'ru'

const firstNonEmpty = (candidates: (string | null | undefined)[]): string | undefined => {
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return c.trim()
  }

  return undefined
}

type AniListTitle = { romaji?: string; english?: string; native?: string }

/** AniList exposes only en/romaji/native — no RU. Prefer English for non-ja UIs, then romaji, then native. */
export const pickAnilistStyleTitle = (t: AniListTitle | Record<string, string | undefined>): string => {
  const o = t as AniListTitle

  if (isJapaneseLocale()) {
    return firstNonEmpty([o.native, o.romaji, o.english]) ?? 'Untitled'
  }

  return firstNonEmpty([o.english, o.romaji, o.native]) ?? 'Untitled'
}

type JikanTitleEntry = { type?: string; title?: string }

export type JikanTitleRaw = {
  titles?: JikanTitleEntry[]
  title?: string
  title_japanese?: string
  title_english?: string
}

const findJikanByType = (raw: JikanTitleRaw, type: string) =>
  (raw.titles as JikanTitleEntry[] | undefined)?.find((x) => x.type === type)?.title

/** MAL (Jikan) has multiple `titles[]` + main `title` — pick by UI locale. No RU field in API. */
export const pickJikanDisplayTitle = (
  raw: JikanTitleRaw | Record<string, unknown>,
): { title: string; originalTitle: string | null } => {
  const r = raw as JikanTitleRaw
  const native = r.title_japanese ?? findJikanByType(r, 'Japanese')

  if (isJapaneseLocale()) {
    const t =
      firstNonEmpty([
        native,
        findJikanByType(r, 'Default'),
        findJikanByType(r, 'English'),
        findJikanByType(r, 'Synonym'),
        r.title_english,
        r.title,
      ]) ?? 'Untitled'

    return { title: t, originalTitle: native ?? null }
  }

  const t =
    firstNonEmpty([
      findJikanByType(r, 'English'),
      r.title_english,
      findJikanByType(r, 'Default'),
      findJikanByType(r, 'Synonym'),
      r.title,
      native,
    ]) ?? 'Untitled'

  return { title: t, originalTitle: native ?? null }
}

type KitsuTitleBlock = Record<string, string | undefined>

/** Kitsu: `en`, `en_jp`, `ja_jp` (no RU in typical responses). */
export const pickKitsuTitle = (titles: KitsuTitleBlock, canonical: string | undefined) => {
  if (isJapaneseLocale()) {
    return firstNonEmpty([titles.ja_jp, titles.en_jp, titles.en, canonical]) ?? 'Untitled'
  }

  return firstNonEmpty([titles.en, titles.en_jp, titles.ja_jp, canonical]) ?? 'Untitled'
}

/** Comma list for wikibase:label (order = preference / fallback). */
export const getWikidataLabelLanguages = (): string => {
  const loc = effectiveLocale()

  if (loc === 'ru') {
    return 'ru,en,fr,de,ja'
  }

  if (loc === 'fr') {
    return 'fr,en,de,es,ja'
  }

  if (loc === 'ja') {
    return 'ja,en'
  }

  if (loc === 'zh') {
    return 'zh,en,ja,fr'
  }

  return 'en,de,fr,es,ja,pt,pt-BR,pt-PL,pt-PT,ca,no,ru,uk,ar,he,zh,zh-hans,zh-hant,zh-mo,zh-sg,zh-hk'
}

/** Shikimori: `russian` only for RU-UI; others use `name` (romaji) so we do not show Cyrillic in EN/FR/ja. */
export const pickShikimoriTitle = (russian: string | undefined, name: string) => {
  if (isRuLocale() && russian && russian.trim() !== '') {
    return { title: russian.trim(), originalTitle: name || null }
  }

  return { title: name, originalTitle: name || null }
}
