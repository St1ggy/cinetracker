import { getLocale } from '$lib/paraglide/runtime'
import { MEDIA_TYPE_META } from '$shared/config/domain'

import type { ListVisibility, MediaType, WatchStatus } from '$shared/config/domain'

type VisibilityMessages = {
  visibility_private: () => string
  visibility_unlisted: () => string
  visibility_public: () => string
}

type StatusMessages = {
  status_watched: () => string
  status_in_progress: () => string
  status_plan_to_watch: () => string
}

export const getVisibilityLabel = (messages: VisibilityMessages, value: ListVisibility) => {
  if (value === 'PRIVATE') return messages.visibility_private()

  if (value === 'UNLISTED') return messages.visibility_unlisted()

  return messages.visibility_public()
}

export const getWatchStatusLabels = (messages: StatusMessages): Record<WatchStatus, string> => ({
  WATCHED: messages.status_watched(),
  IN_PROGRESS: messages.status_in_progress(),
  PLAN_TO_WATCH: messages.status_plan_to_watch(),
})

export const getMediaTypeMeta = (mediaType: string) => MEDIA_TYPE_META[mediaType as MediaType] ?? MEDIA_TYPE_META.OTHER

const countryFlagEmoji = (code: string): string => {
  const upper = code.toUpperCase()

  if (upper.length !== 2) return ''

  // U+1F1E6 (Regional Indicator Letter A) minus 65 (char code of 'A')
  const REGIONAL_OFFSET = 127_397

  return [...upper].map((c) => String.fromCodePoint(REGIONAL_OFFSET + (c.codePointAt(0) ?? 65))).join('')
}

let displayNamesCache: { locale: string; instance: Intl.DisplayNames } | null = null

const getDisplayNames = (locale: string): Intl.DisplayNames => {
  if (displayNamesCache?.locale === locale) return displayNamesCache.instance

  const instance = new Intl.DisplayNames([locale, 'en'], { type: 'region' })

  displayNamesCache = { locale, instance }

  return instance
}

export const formatCountry = (code: string): string => {
  const locale = getLocale()
  const flag = countryFlagEmoji(code)

  try {
    const name = getDisplayNames(locale).of(code.toUpperCase()) ?? code

    return flag ? `${flag} ${name}` : name
  } catch {
    return flag ? `${flag} ${code}` : code
  }
}
