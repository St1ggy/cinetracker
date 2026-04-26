import { prisma } from '$lib/server/prisma'
import { type MediaI18nTextPayload, mediaRepository } from '$lib/server/repositories/media.repository'
import { UI_BASE_LOCALE, UI_LOCALES, type UiLocale } from '$lib/ui-locales'

import type { TmdbCredentials } from './types'

type TmdbTranslation = {
  iso_3166_1?: string
  iso_639_1?: string
  data?: {
    title?: string
    name?: string
    overview?: string
    tagline?: string
  } | null
}

const buildAuthHeaders = (creds: TmdbCredentials): Record<string, string> => {
  const headers: Record<string, string> = { accept: 'application/json' }

  if (creds.bearerToken) {
    headers.Authorization = `Bearer ${creds.bearerToken}`
  }

  return headers
}

const applyApiKey = (url: URL, creds: TmdbCredentials): void => {
  if (!creds.bearerToken && creds.apiKey) {
    url.searchParams.set('api_key', creds.apiKey)
  }
}

const toPayload = (
  t: TmdbTranslation,
  base: { title: string; originalTitle: string | null; tagline: string | null; overview: string | null },
): MediaI18nTextPayload => {
  const d = t.data
  const titleFromApi = d?.title ?? d?.name ?? ''
  const title = String(titleFromApi).trim() === '' ? base.title : String(titleFromApi)

  return {
    title,
    originalTitle: base.originalTitle,
    tagline: d?.tagline != null && String(d.tagline).trim() !== '' ? d.tagline : base.tagline,
    status: null,
    director: null,
    overview: d?.overview != null && String(d.overview).trim() !== '' ? d.overview : base.overview,
  }
}

const pickEn = (list: TmdbTranslation[]) =>
  list.find((t) => t.iso_639_1 === 'en' && t.iso_3166_1 === 'US') ??
  list.find((t) => t.iso_639_1 === 'en' && t.iso_3166_1 === 'GB') ??
  list.find((t) => t.iso_639_1 === 'en') ??
  null

const pickOne = (list: TmdbTranslation[], lang: string, country: string) =>
  list.find((t) => t.iso_639_1 === lang && t.iso_3166_1 === country)

const pickZh = (list: TmdbTranslation[]) =>
  pickOne(list, 'zh', 'CN') ??
  pickOne(list, 'zh', 'HK') ??
  pickOne(list, 'zh', 'TW') ??
  list.find((t) => t.iso_639_1 === 'zh')

const RU_JA_FR: { country: string; key: 'ru' | 'ja' | 'fr' }[] = [
  { country: 'RU', key: 'ru' },
  { country: 'JP', key: 'ja' },
  { country: 'FR', key: 'fr' },
]

const tmdbListToByUi = (
  trs: TmdbTranslation[],
  base: { title: string; originalTitle: string | null; tagline: string | null; overview: string | null },
): Partial<Record<UiLocale, MediaI18nTextPayload>> => {
  const byUi: Partial<Record<UiLocale, MediaI18nTextPayload>> = {}
  const enT = pickEn(trs)

  if (enT) {
    byUi.en = toPayload(enT, base)
  }

  const pickByLang = (code: 'ru' | 'ja' | 'fr', country: string) => {
    const t = trs.find((r) => r.iso_639_1 === code)

    return pickOne(trs, code, country) ?? t
  }

  for (const { country, key: loc } of RU_JA_FR) {
    const t = pickByLang(loc, country)

    if (t) {
      byUi[loc] = toPayload(t, base)
    }
  }

  const zhT = pickZh(trs) ?? trs.find((r) => r.iso_639_1 === 'zh')

  if (zhT) {
    byUi.zh = toPayload(zhT, base)
  }

  return byUi
}

// Fetches TMDB translations in one call and upserts all matching `UI_LOCALES` `media_i18n` rows.
export const applyTmdbTranslationBatch = async (params: {
  mediaId: string
  tmdbId: number
  tmdbCreds: TmdbCredentials
  base: { title: string; originalTitle: string | null; tagline: string | null; overview: string | null }
  useTvEndpoint: boolean
}): Promise<void> => {
  const { mediaId, tmdbId, tmdbCreds, base, useTvEndpoint } = params

  if (!tmdbCreds.apiKey && !tmdbCreds.bearerToken) {
    return
  }

  const buildUrl = (tv: boolean) =>
    new URL(
      tv
        ? `https://api.themoviedb.org/3/tv/${tmdbId}/translations`
        : `https://api.themoviedb.org/3/movie/${tmdbId}/translations`,
    )
  const tryOne = async (tv: boolean) => {
    const url = buildUrl(tv)

    applyApiKey(url, tmdbCreds)

    return fetch(url, { headers: buildAuthHeaders(tmdbCreds) })
  }
  let response = await tryOne(useTvEndpoint)

  if (!response.ok) {
    response = await tryOne(!useTvEndpoint)
  }

  if (!response.ok) {
    return
  }

  const body = (await response.json()) as { translations?: TmdbTranslation[] }
  const trs = body.translations ?? []
  const byUi = tmdbListToByUi(trs, base)

  for (const loc of UI_LOCALES) {
    const row = byUi[loc]

    if (row) {
      await mediaRepository.upsertMediaI18n(mediaId, loc, row)
    } else if (loc === UI_BASE_LOCALE) {
      await mediaRepository.upsertMediaI18n(mediaId, loc, {
        title: base.title,
        originalTitle: base.originalTitle,
        tagline: base.tagline,
        status: null,
        director: null,
        overview: base.overview,
      })
    }
  }

  const enRow = byUi.en

  if (enRow) {
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        title: enRow.title,
        overview: enRow.overview,
        tagline: enRow.tagline,
      },
    })
  }
}
