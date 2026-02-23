import { error } from '@sveltejs/kit'

import type {
  CanonicalMedia,
  CanonicalRating,
  ProviderAdapter,
  ProviderCredentials,
  SearchResult,
  SimklCredentials,
} from './types'
import type { MediaType } from '@prisma/client'

const BASE_URL = 'https://api.simkl.com'
const SIMKL_IMAGE_BASE = 'https://simkl.in/posters'

const resolveCredentials = (credentials?: ProviderCredentials): SimklCredentials => ({
  clientId: credentials?.clientId ?? '',
})

const buildHeaders = (creds: SimklCredentials): Record<string, string> => ({
  'simkl-api-key': creds.clientId,
  Accept: 'application/json',
})

const parsePosterUrl = (poster?: string | null): string | null => {
  if (!poster) return null

  return `${SIMKL_IMAGE_BASE}/${poster}_m.webp`
}

const extractRatings = (raw: Record<string, unknown>): CanonicalRating[] => {
  const ratings = raw.ratings as Record<string, unknown> | undefined
  const simklRating = ratings?.simkl as Record<string, unknown> | undefined

  if (!simklRating) return []

  const rating = simklRating.rating as number | undefined
  const votes = simklRating.votes as number | undefined

  if (!rating || rating === 0) return []

  return [{ source: 'Simkl', value: Math.round(rating * 10) / 10, maxValue: 10, votes }]
}

const toMediaType = (type?: string): MediaType => {
  if (type === 'movie') return 'MOVIE'

  if (type === 'anime') return 'ANIME'

  return 'TV'
}

const normalize = (raw: Record<string, unknown>, mediaType: MediaType): CanonicalMedia => {
  const ids = raw.ids as Record<string, unknown> | undefined
  const simklId = ids?.simkl ?? raw.simkl

  const animeOrTvType = mediaType === 'ANIME' ? 'anime' : 'tv'
  const type = mediaType === 'MOVIE' ? 'movie' : animeOrTvType
  const slug = ids?.slug as string | undefined

  return {
    provider: 'SIMKL',
    externalId: String(simklId ?? ''),
    externalUrl: slug ? `https://simkl.com/${type}/${simklId}/${slug}` : null,
    title: (raw.title as string | undefined) ?? '',
    originalTitle: null,
    year: (raw.year as number | undefined) ?? null,
    mediaType,
    overview: (raw.overview as string | undefined) ?? null,
    posterUrl: parsePosterUrl(raw.poster as string | undefined),
    imdbId: (ids?.imdb as string | undefined) ?? null,
    tmdbId: ids?.tmdb ? Number(ids.tmdb) : null,
    malId: ids?.mal ? Number(ids.mal) : null,
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    countries: [],
    runtimeMinutes: (raw.runtime as number | undefined) ?? null,
    episodesCount: mediaType === 'MOVIE' ? null : ((raw.total_episodes as number | undefined) ?? null),
    isAdult: false,
    ratings: extractRatings(raw),
    raw,
  }
}

// Resolve a Simkl ID from an external ID (imdb or mal).
// Returns { simklId, mediaType } or null if not found.
const resolveSimklId = async (
  externalId: string,
  headers: Record<string, string>,
): Promise<{ simklId: string; mediaType: MediaType } | null> => {
  // externalId format: "imdb:tt1234567" or "mal:12345"
  const [idType, idValue] = externalId.split(':')

  if (!idValue) return null

  const url = new URL(`${BASE_URL}/search/id`)

  if (idType === 'imdb') url.searchParams.set('imdb', idValue)
  else if (idType === 'mal') url.searchParams.set('mal', idValue)
  else return null

  const response = await fetch(url, { headers })

  if (!response.ok) return null

  const results = (await response.json()) as Record<string, unknown>[]

  if (!results || results.length === 0) return null

  const first = results[0]
  const ids = first.ids as Record<string, unknown> | undefined
  const simklId = String(ids?.simkl ?? '')
  const rawType = first.type as string | undefined
  const mediaType = toMediaType(rawType)

  return { simklId, mediaType }
}

export const simklAdapter: ProviderAdapter = {
  provider: 'SIMKL',
  requiresKey: true,

  async search(query, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds.clientId) return []

    const headers = buildHeaders(creds)
    const url = new URL(`${BASE_URL}/search/multi`)

    url.searchParams.set('q', query)
    url.searchParams.set('limit', '10')

    const response = await fetch(url, { headers })

    if (!response.ok) return []

    const payload = (await response.json()) as Record<string, unknown>[]
    const results: SearchResult[] = []

    for (const item of payload) {
      const rawType = item.type as string | undefined
      const mediaType = toMediaType(rawType)
      const ids = item.ids as Record<string, unknown> | undefined
      const simklId = String(ids?.simkl ?? '')

      if (!simklId) continue

      results.push({
        provider: 'SIMKL',
        externalId: simklId,
        title: (item.title as string | undefined) ?? '',
        originalTitle: null,
        year: (item.year as number | undefined) ?? null,
        mediaType,
        overview: null,
        posterUrl: parsePosterUrl(item.poster as string | undefined),
      })
    }

    return results
  },

  // externalId must be prefixed: "imdb:tt1234567", "mal:12345", or plain Simkl ID "123456"
  async fetchDetails(externalId, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds.clientId) throw error(403, 'Simkl credentials not configured')

    const headers = buildHeaders(creds)

    let simklId: string
    let mediaType: MediaType = 'MOVIE'

    if (externalId.includes(':')) {
      const resolved = await resolveSimklId(externalId, headers)

      if (!resolved) throw error(404, 'Simkl: could not resolve external ID')

      simklId = resolved.simklId
      mediaType = resolved.mediaType
    } else {
      simklId = externalId
    }

    const animeOrTvSeg = mediaType === 'ANIME' ? 'anime' : 'tv'
    const typeSegment = mediaType === 'MOVIE' ? 'movies' : animeOrTvSeg
    const url = new URL(`${BASE_URL}/${typeSegment}/${simklId}`)

    url.searchParams.set('extended', 'full')

    const response = await fetch(url, { headers })

    if (!response.ok) throw error(response.status, 'Simkl details not found')

    const payload = (await response.json()) as Record<string, unknown>

    return normalize(payload, mediaType)
  },
}
