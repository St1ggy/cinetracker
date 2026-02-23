import { error } from '@sveltejs/kit'

import { isJapaneseLocale } from '$lib/server/locale'

import type { CanonicalMedia, CanonicalRating, ProviderAdapter, SearchResult } from './types'

const BASE_URL = 'https://shikimori.one/api'

const APP_USER_AGENT = 'CineTracker/1.0'

const SHIKIMORI_HEADERS = {
  'User-Agent': APP_USER_AGENT,
  Accept: 'application/json',
}

const parseYear = (value?: string | null): number | null => {
  if (!value) return null

  const parsed = Number.parseInt(value.slice(0, 4), 10)

  return Number.isNaN(parsed) ? null : parsed
}

const extractTitle = (raw: Record<string, unknown>): { title: string; originalTitle: string | null } => {
  const russian = raw.russian as string | undefined
  const name = (raw.name as string | undefined) ?? ''

  if (isJapaneseLocale()) {
    return { title: name, originalTitle: russian ?? null }
  }

  return {
    title: russian && russian.length > 0 ? russian : name,
    originalTitle: name || null,
  }
}

const extractRatings = (raw: Record<string, unknown>): CanonicalRating[] => {
  const score = raw.score as string | number | undefined

  if (!score) return []

  const value = typeof score === 'string' ? Number.parseFloat(score) : score

  if (Number.isNaN(value) || value === 0) return []

  return [{ source: 'Shikimori', value: Math.round(value * 100) / 100, maxValue: 10 }]
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const id = Number(raw.id)
  const { title, originalTitle } = extractTitle(raw)
  const genres = Array.isArray(raw.genres)
    ? (raw.genres as Record<string, unknown>[]).map((g) => String(g.name ?? ''))
    : []
  const airedOn = raw.aired_on as string | undefined
  const url = raw.url as string | undefined
  const posterImage = raw.image as Record<string, string | undefined> | undefined

  return {
    provider: 'SHIKIMORI',
    externalId: String(id),
    externalUrl: url ? `https://shikimori.one${url}` : null,
    title,
    originalTitle,
    year: parseYear(airedOn),
    mediaType: 'ANIME',
    overview: (raw.description as string | undefined) ?? null,
    posterUrl: posterImage?.original ? `https://shikimori.one${posterImage.original}` : null,
    malId: (raw.mal_id as number | undefined) ?? null,
    genres,
    countries: [],
    episodesCount: (raw.episodes as number | undefined) ?? null,
    episodeRuntimeMin: (raw.duration as number | undefined) ?? null,
    episodeRuntimeMax: (raw.duration as number | undefined) ?? null,
    runtimeMinutes: null,
    isAdult: raw.rating === 'rx',
    ratings: extractRatings(raw),
    raw,
  }
}

export const shikimoriAdapter: ProviderAdapter = {
  provider: 'SHIKIMORI',
  requiresKey: false,

  async search(query) {
    const url = new URL(`${BASE_URL}/animes`)

    url.searchParams.set('search', query)
    url.searchParams.set('limit', '10')

    const response = await fetch(url, { headers: SHIKIMORI_HEADERS })

    if (!response.ok) return []

    const payload = (await response.json()) as Record<string, unknown>[]
    const results: SearchResult[] = []

    for (const item of payload) {
      const normalized = normalize(item)

      results.push({
        provider: 'SHIKIMORI',
        externalId: normalized.externalId,
        title: normalized.title,
        originalTitle: normalized.originalTitle,
        year: normalized.year,
        mediaType: 'ANIME',
        overview: normalized.overview,
        posterUrl: normalized.posterUrl,
      })
    }

    return results
  },

  async fetchDetails(externalId) {
    const response = await fetch(`${BASE_URL}/animes/${externalId}`, { headers: SHIKIMORI_HEADERS })

    if (!response.ok) throw error(response.status, 'Shikimori details not found')

    const payload = (await response.json()) as Record<string, unknown>

    return normalize(payload)
  },
}
