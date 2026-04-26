import { UI_BASE_LOCALE, type UiLocale, isUiLocale } from '$lib/ui-locales'

import type { CanonicalMedia } from './providers/types'
import type { Genre, Media, MediaCastI18n, MediaI18n, Person } from '@prisma/client'

type MediaTextFields = {
  title: string
  originalTitle: string | null
  tagline: string | null
  status: string | null
  director: string | null
  overview: string | null
}

export const toGenreLocalizations = (
  normalized: Pick<CanonicalMedia, 'genres' | 'genreLocalizations'>,
): { slug: string; name: string }[] => {
  if (normalized.genreLocalizations && normalized.genreLocalizations.length > 0) {
    return normalized.genreLocalizations
  }

  return normalized.genres.map((name) => ({
    slug: name
      .toLowerCase()
      .trim()
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^a-z0-9-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-|-$/g, ''),
    name,
  }))
}

const pickI18nRow = <T extends { locale: string }>(rows: T[], locale: string, fallback: string): T | null =>
  rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === fallback) ?? null

const normalizeRequestLocale = (locale: string): UiLocale | typeof UI_BASE_LOCALE => {
  if (isUiLocale(locale)) {
    return locale
  }

  return UI_BASE_LOCALE
}

export const resolveMediaTextFields = (
  media: Pick<Media, 'title' | 'originalTitle' | 'tagline' | 'status' | 'director' | 'overview'>,
  i18n: Pick<MediaI18n, 'locale' | 'title' | 'originalTitle' | 'tagline' | 'status' | 'director' | 'overview'>[],
  requestedLocale: string,
): MediaTextFields => {
  const loc = normalizeRequestLocale(requestedLocale)
  const row = pickI18nRow(i18n, loc, UI_BASE_LOCALE)

  if (row) {
    return {
      title: row.title,
      originalTitle: row.originalTitle,
      tagline: row.tagline,
      status: row.status,
      director: row.director,
      overview: row.overview,
    }
  }

  return {
    title: media.title,
    originalTitle: media.originalTitle,
    tagline: media.tagline,
    status: media.status,
    director: media.director,
    overview: media.overview,
  }
}

export const resolveGenreDisplayNameFromRows = (
  genre: Pick<Genre, 'name' | 'slug'>,
  rows: { locale: string; name: string }[],
  requestedLocale: string,
): string => {
  const loc = normalizeRequestLocale(requestedLocale)
  const row = pickI18nRow(rows, loc, UI_BASE_LOCALE)

  if (row) {
    return row.name
  }

  return genre.name
}

export const resolvePersonName = (
  person: Pick<Person, 'name'>,
  i18nRows: { locale: string; name: string }[],
  requestedLocale: string,
): string => {
  const loc = normalizeRequestLocale(requestedLocale)
  const row = pickI18nRow(i18nRows, loc, UI_BASE_LOCALE)

  if (row) {
    return row.name
  }

  return person.name
}

export const resolveMediaCastRole = (
  i18nRows: Pick<MediaCastI18n, 'locale' | 'role'>[],
  requestedLocale: string,
): string | null => {
  const loc = normalizeRequestLocale(requestedLocale)

  return (
    i18nRows.find((r) => r.locale === loc)?.role ??
    i18nRows.find((r) => r.locale === UI_BASE_LOCALE)?.role ??
    i18nRows[0]?.role ??
    null
  )
}
