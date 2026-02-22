import { error } from '@sveltejs/kit'

import { isJapaneseLocale } from '$lib/server/locale'

import type { CanonicalCastMember, CanonicalMedia, CanonicalRating, ProviderAdapter, SearchResult } from './types'

const BASE_URL = 'https://api.jikan.moe/v4'

const extractTitle = (raw: Record<string, unknown>): { title: string; originalTitle: string | null } => {
  const titles = raw.titles as Record<string, unknown>[] | undefined
  const englishTitle = titles?.find((t) => t.type === 'English')?.title as string | undefined
  const defaultTitle = titles?.find((t) => t.type === 'Default')?.title as string | undefined
  const nativeTitle = raw.title_japanese as string | undefined

  const title = isJapaneseLocale()
    ? (nativeTitle ?? defaultTitle ?? englishTitle ?? 'Untitled')
    : (englishTitle ?? defaultTitle ?? nativeTitle ?? 'Untitled')

  return {
    title,
    originalTitle: nativeTitle ?? null,
  }
}

const extractYear = (raw: Record<string, unknown>): number | null => {
  const aired = raw.aired as Record<string, unknown> | undefined

  if (aired?.prop) {
    const year = ((aired.prop as Record<string, unknown>).from as Record<string, unknown> | undefined)?.year

    return year ? Number(year) : null
  }

  return (raw.year as number | undefined) ?? null
}

const extractDuration = (raw: Record<string, unknown>): number | null => {
  const durationString = raw.duration ? String(raw.duration) : null

  if (!durationString) return null

  const minutes = Number.parseInt(durationString, 10)

  return Number.isNaN(minutes) ? null : minutes
}

const extractJikanRatings = (raw: Record<string, unknown>): CanonicalRating[] => {
  const score = raw.score as number | undefined
  const scoredBy = raw.scored_by as number | undefined

  if (!score || score === 0) return []

  return [
    {
      source: 'MyAnimeList',
      value: Math.round(score * 100) / 100,
      maxValue: 10,
      votes: scoredBy,
    },
  ]
}

const extractJikanCast = (raw: Record<string, unknown>): CanonicalCastMember[] => {
  const characters = raw.characters as { character: { name: string }; role: string }[] | undefined

  if (!Array.isArray(characters)) return []

  return characters.slice(0, 15).map((c, idx) => ({
    name: c.character?.name ?? '',
    role: c.role ?? null,
    order: idx,
  }))
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const { title, originalTitle } = extractTitle(raw)
  const year = extractYear(raw)
  const episodeDuration = extractDuration(raw)
  const genres = Array.isArray(raw.genres)
    ? (raw.genres as Record<string, unknown>[]).map((g) => String(g.name ?? '')).filter(Boolean)
    : []
  const malId = typeof raw.mal_id === 'number' ? raw.mal_id : null

  return {
    provider: 'JIKAN',
    externalId: String(malId ?? ''),
    externalUrl: malId ? `https://myanimelist.net/anime/${malId}` : null,
    title,
    originalTitle,
    year,
    mediaType: 'ANIME',
    overview: (raw.synopsis as string | undefined) ?? null,
    posterUrl: (raw.images as Record<string, Record<string, string | undefined>> | undefined)?.jpg?.image_url ?? null,
    malId,
    genres,
    countries: ['JP'],
    runtimeMinutes: episodeDuration,
    episodeRuntimeMin: episodeDuration,
    episodeRuntimeMax: episodeDuration,
    seasonsCount: 1,
    episodesCount: (raw.episodes as number | undefined) ?? null,
    seasonBreakdown: raw.episodes ? [{ seasonNumber: 1, episodes: Number(raw.episodes) }] : null,
    isAdult: Boolean(raw.rating && String(raw.rating).startsWith('Rx')),
    ratings: extractJikanRatings(raw),
    cast: extractJikanCast(raw),
    raw,
  }
}

export const jikanAdapter: ProviderAdapter = {
  provider: 'JIKAN',
  requiresKey: false,

  async search(query) {
    const url = new URL(`${BASE_URL}/anime`)

    url.searchParams.set('q', query)
    url.searchParams.set('limit', '10')

    const response = await fetch(url)

    if (!response.ok) return []

    const payload = (await response.json()) as { data?: Record<string, unknown>[] }
    const results: SearchResult[] = []

    for (const item of payload.data ?? []) {
      const normalized = normalize(item)

      results.push({
        provider: 'JIKAN',
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
    const id = Number.parseInt(externalId, 10)

    if (Number.isNaN(id)) throw error(400, 'Invalid Jikan/MAL id')

    const response = await fetch(`${BASE_URL}/anime/${id}/full`)

    if (!response.ok) throw error(response.status, 'Jikan details not found')

    const payload = (await response.json()) as { data?: Record<string, unknown> }

    if (!payload.data) throw error(404, 'Jikan media not found')

    return normalize(payload.data)
  },
}
