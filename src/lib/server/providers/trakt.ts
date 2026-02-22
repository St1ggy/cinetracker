import { error } from '@sveltejs/kit'

import type { CanonicalMedia, ProviderAdapter, ProviderCredentials, SearchResult, TraktCredentials } from './types'
import type { MediaType } from '@prisma/client'

const BASE_URL = 'https://api.trakt.tv'

const resolveCredentials = (credentials?: ProviderCredentials): TraktCredentials | null => {
  const clientId = credentials?.clientId

  return clientId ? { clientId } : null
}

const traktHeaders = (clientId: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'trakt-api-key': clientId,
  'trakt-api-version': '2',
})

const toMediaType = (type: string | undefined): MediaType => {
  if (type === 'movie') return 'MOVIE'

  if (type === 'show') return 'TV'

  return 'OTHER'
}

const normalizeMovie = (raw: Record<string, unknown>): CanonicalMedia => {
  const movie = (raw.movie ?? raw) as Record<string, unknown>
  const ids = (movie.ids ?? {}) as Record<string, unknown>

  return {
    provider: 'TRAKT',
    externalId: String(ids.trakt ?? ''),
    title: (movie.title as string | undefined) ?? 'Untitled',
    year: (movie.year as number | undefined) ?? null,
    mediaType: 'MOVIE',
    overview: (movie.overview as string | undefined) ?? null,
    imdbId: (ids.imdb as string | undefined) ?? null,
    tmdbId: ids.tmdb ? Number(ids.tmdb) : null,
    traktId: ids.trakt ? Number(ids.trakt) : null,
    genres: Array.isArray(movie.genres) ? (movie.genres as string[]) : [],
    countries: [],
    runtimeMinutes: (movie.runtime as number | undefined) ?? null,
    isAdult: Boolean(movie.certification === 'NC-17'),
    raw,
  }
}

const normalizeShow = (raw: Record<string, unknown>): CanonicalMedia => {
  const show = (raw.show ?? raw) as Record<string, unknown>
  const ids = (show.ids ?? {}) as Record<string, unknown>

  return {
    provider: 'TRAKT',
    externalId: String(ids.trakt ?? ''),
    title: (show.title as string | undefined) ?? 'Untitled',
    year: (show.year as number | undefined) ?? null,
    mediaType: 'TV',
    overview: (show.overview as string | undefined) ?? null,
    imdbId: (ids.imdb as string | undefined) ?? null,
    tmdbId: ids.tmdb ? Number(ids.tmdb) : null,
    traktId: ids.trakt ? Number(ids.trakt) : null,
    genres: Array.isArray(show.genres) ? (show.genres as string[]) : [],
    countries: show.country ? [String(show.country)] : [],
    episodeRuntimeMin: (show.runtime as number | undefined) ?? null,
    episodeRuntimeMax: (show.runtime as number | undefined) ?? null,
    seasonsCount: null,
    isAdult: false,
    raw,
  }
}

export const traktAdapter: ProviderAdapter = {
  provider: 'TRAKT',
  requiresKey: true,

  async search(query, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds) return []

    const url = new URL(`${BASE_URL}/search/movie,show`)

    url.searchParams.set('query', query)
    url.searchParams.set('limit', '10')
    url.searchParams.set('page', '1')

    const response = await fetch(url, { headers: traktHeaders(creds.clientId) })

    if (!response.ok) return []

    const payload = (await response.json()) as { type: string; movie?: unknown; show?: unknown }[]
    const results: SearchResult[] = []

    for (const item of payload) {
      const mediaRaw = (item.movie ?? item.show ?? {}) as Record<string, unknown>
      const ids = (mediaRaw.ids ?? {}) as Record<string, unknown>
      const mediaType = toMediaType(item.type)

      results.push({
        provider: 'TRAKT',
        externalId: String(ids.trakt ?? ''),
        title: (mediaRaw.title as string | undefined) ?? 'Untitled',
        year: (mediaRaw.year as number | undefined) ?? null,
        mediaType,
        overview: (mediaRaw.overview as string | undefined) ?? null,
      })
    }

    return results
  },

  async fetchDetails(externalId, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds) throw error(403, 'Trakt credentials not configured')

    const headers = traktHeaders(creds.clientId)

    const movieResponse = await fetch(`${BASE_URL}/movies/${externalId}?extended=full`, { headers })

    if (movieResponse.ok) {
      return normalizeMovie(await movieResponse.json())
    }

    const showResponse = await fetch(`${BASE_URL}/shows/${externalId}?extended=full`, { headers })

    if (!showResponse.ok) throw error(showResponse.status, 'Trakt details not found')

    return normalizeShow(await showResponse.json())
  },
}
