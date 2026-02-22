import { getLocale } from '$lib/paraglide/runtime'

// Maps Paraglide locale codes to TMDB language codes (BCP-47 region-specific).
// Falls back to 'en-US' for unknown locales.
const TMDB_LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ja: 'ja-JP',
  ru: 'ru-RU',
  zh: 'zh-CN',
}

export const getTmdbLanguage = (): string => TMDB_LANGUAGE_MAP[getLocale()] ?? 'en-US'

// Returns true when the current locale is Japanese (for preferring native/romaji titles).
export const isJapaneseLocale = (): boolean => getLocale() === 'ja'

// Returns true when the current locale is English.
export const isEnglishLocale = (): boolean => getLocale() === 'en'
