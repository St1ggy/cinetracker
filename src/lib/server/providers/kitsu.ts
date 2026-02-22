import { error } from '@sveltejs/kit'

import type { CanonicalMedia, ProviderAdapter, SearchResult } from './types'

const BASE_URL = 'https://kitsu.io/api/edge'

const JSON_API_HEADERS = {
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const attributes = (raw.attributes ?? {}) as Record<string, unknown>
  const titles = (attributes.titles ?? {}) as Record<string, string | undefined>
  const title = titles.en ?? titles.en_jp ?? titles.ja_jp ?? attributes.canonicalTitle ?? 'Untitled'
  const episodeDuration = (attributes.episodeLength as number | undefined) ?? null
  const genres: string[] = []
  const year = attributes.startDate ? Number.parseInt(String(attributes.startDate).slice(0, 4), 10) : null
  const kitsuNumericId = typeof raw.id === 'string' ? Number.parseInt(raw.id, 10) : null

  return {
    provider: 'KITSU',
    externalId: String(raw.id ?? ''),
    title: String(title),
    originalTitle: (titles.ja_jp as string | undefined) ?? null,
    year: year && !Number.isNaN(year) ? year : null,
    mediaType: 'ANIME',
    overview: (attributes.synopsis as string | undefined) ?? null,
    posterUrl: ((attributes.posterImage as Record<string, string | undefined> | undefined)?.medium ??
      (attributes.posterImage as Record<string, string | undefined> | undefined)?.original ??
      null) as string | null,
    kitsuId: kitsuNumericId,
    genres,
    countries: [],
    runtimeMinutes: episodeDuration,
    episodeRuntimeMin: episodeDuration,
    episodeRuntimeMax: episodeDuration,
    seasonsCount: 1,
    episodesCount: (attributes.episodeCount as number | undefined) ?? null,
    seasonBreakdown: attributes.episodeCount ? [{ seasonNumber: 1, episodes: Number(attributes.episodeCount) }] : null,
    isAdult: Boolean(attributes.nsfw),
    raw,
  }
}

export const kitsuAdapter: ProviderAdapter = {
  provider: 'KITSU',
  requiresKey: false,

  async search(query) {
    const url = new URL(`${BASE_URL}/anime`)

    url.searchParams.set('filter[text]', query)
    url.searchParams.set('page[limit]', '10')

    const response = await fetch(url, { headers: JSON_API_HEADERS })

    if (!response.ok) return []

    const payload = (await response.json()) as { data?: Record<string, unknown>[] }
    const results: SearchResult[] = []

    for (const item of payload.data ?? []) {
      const normalized = normalize(item)

      results.push({
        provider: 'KITSU',
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
    const response = await fetch(`${BASE_URL}/anime/${externalId}`, { headers: JSON_API_HEADERS })

    if (!response.ok) throw error(response.status, 'Kitsu details not found')

    const payload = (await response.json()) as { data?: Record<string, unknown> }

    if (!payload.data) throw error(404, 'Kitsu media not found')

    return normalize(payload.data)
  },
}
