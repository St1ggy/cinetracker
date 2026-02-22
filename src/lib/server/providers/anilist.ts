import { error } from '@sveltejs/kit'

import { appEnv } from '$lib/server/env'
import { isJapaneseLocale } from '$lib/server/locale'

import type { CanonicalMedia, ProviderAdapter, SearchResult } from './types'

const searchQuery = `
query ($search: String!, $page: Int = 1) {
  Page(page: $page, perPage: 10) {
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { large }
      startDate { year }
      genres
      countryOfOrigin
      isAdult
    }
  }
}
`

const detailsQuery = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    startDate { year }
    genres
    countryOfOrigin
    duration
    episodes
    isAdult
  }
}
`

const pickTitle = (titleObject: Record<string, string | undefined>): string => {
  if (isJapaneseLocale()) {
    return titleObject.native ?? titleObject.romaji ?? titleObject.english ?? 'Untitled'
  }

  return titleObject.english ?? titleObject.romaji ?? titleObject.native ?? 'Untitled'
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const titleObject = (raw.title ?? {}) as Record<string, string | undefined>

  return {
    provider: 'ANILIST',
    externalId: String(raw.id),
    title: pickTitle(titleObject),
    originalTitle: titleObject.native ?? titleObject.romaji ?? null,
    year: ((raw.startDate as Record<string, number | undefined> | undefined)?.year ?? null) as number | null,
    mediaType: 'ANIME',
    overview: (raw.description as string | undefined) ?? null,
    posterUrl: ((raw.coverImage as Record<string, string | undefined> | undefined)?.extraLarge ??
      (raw.coverImage as Record<string, string | undefined> | undefined)?.large ??
      null) as string | null,
    backdropUrl: (raw.bannerImage as string | undefined) ?? null,
    anilistId: Number(raw.id),
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    countries: raw.countryOfOrigin ? [raw.countryOfOrigin as string] : [],
    runtimeMinutes: (raw.duration as number | undefined) ?? null,
    episodeRuntimeMin: (raw.duration as number | undefined) ?? null,
    episodeRuntimeMax: (raw.duration as number | undefined) ?? null,
    seasonsCount: raw.episodes ? 1 : null,
    episodesCount: (raw.episodes as number | undefined) ?? null,
    seasonBreakdown: raw.episodes ? [{ seasonNumber: 1, episodes: Number(raw.episodes) }] : null,
    isAdult: Boolean(raw.isAdult),
    raw,
  }
}

const gql = async (url: string, query: string, variables: Record<string, unknown>) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

export const anilistAdapter: ProviderAdapter = {
  provider: 'ANILIST',
  requiresKey: false,

  async search(query) {
    const response = await gql(appEnv.anilistApiUrl, searchQuery, { search: query })

    if (!response.ok) return []

    const payload = (await response.json()) as { data?: { Page?: { media?: Record<string, unknown>[] } } }
    const results: SearchResult[] = []

    for (const item of payload.data?.Page?.media ?? []) {
      const normalized = normalize(item)

      results.push({
        provider: 'ANILIST',
        externalId: normalized.externalId,
        title: normalized.title,
        originalTitle: normalized.originalTitle,
        year: normalized.year,
        mediaType: normalized.mediaType,
        overview: normalized.overview,
        posterUrl: normalized.posterUrl,
      })
    }

    return results
  },

  async fetchDetails(externalId) {
    const id = Number.parseInt(externalId, 10)

    if (Number.isNaN(id)) throw error(400, 'Invalid AniList id')

    const response = await gql(appEnv.anilistApiUrl, detailsQuery, { id })

    if (!response.ok) throw error(response.status, 'AniList details not found')

    const payload = (await response.json()) as { data?: { Media?: Record<string, unknown> } }

    if (!payload.data?.Media) throw error(404, 'AniList media not found')

    return normalize(payload.data.Media)
  },
}
