import { getLocale } from '$lib/paraglide/runtime'

type MediaTitleInput = {
  title: string
  originalTitle?: string | null
}

const hasCyrillic = (value: string) => /\p{Script=Cyrillic}/u.test(value)
const hasJapanese = (value: string) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value)
const hasHan = (value: string) => /\p{Script=Han}/u.test(value)

const prefersOriginalForLocale = (originalTitle: string, locale: string) => {
  if (locale.startsWith('ru')) return hasCyrillic(originalTitle)

  if (locale.startsWith('ja')) return hasJapanese(originalTitle)

  if (locale.startsWith('zh')) return hasHan(originalTitle)

  return false
}

export const getMediaTitlePair = ({ title, originalTitle }: MediaTitleInput) => {
  const fallback = title.trim()
  const original = originalTitle?.trim()

  if (!original || original === fallback) return { primary: fallback, secondary: null as string | null }

  const locale = getLocale().toLowerCase()

  if (prefersOriginalForLocale(original, locale)) return { primary: original, secondary: fallback }

  return { primary: fallback, secondary: original }
}
