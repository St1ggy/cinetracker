import { error } from '@sveltejs/kit'

import type { CanonicalMedia, ProviderAdapter, ProviderCredentials, TvdbCredentials } from './types'
import type { MediaType } from '@prisma/client'

const BASE_URL = 'https://api4.thetvdb.com/v4'
const TOKEN_TTL_MS = 29 * 24 * 60 * 60 * 1000

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

const resolveCredentials = (credentials?: ProviderCredentials): TvdbCredentials | null => {
  const apiKey = credentials?.apiKey

  return apiKey ? { apiKey, pin: credentials?.pin } : null
}

const getToken = async (creds: TvdbCredentials): Promise<string> => {
  const cacheKey = creds.apiKey
  const cached = tokenCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) return cached.token

  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: creds.apiKey, ...(creds.pin ? { pin: creds.pin } : {}) }),
  })

  if (!response.ok) throw error(response.status, 'TheTVDB authentication failed')

  const payload = (await response.json()) as { data?: { token?: string } }
  const token = payload.data?.token

  if (!token) throw error(500, 'TheTVDB did not return a token')

  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + TOKEN_TTL_MS })

  return token
}

const authHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

const toMediaType = (type: string | undefined): MediaType => {
  if (type === 'movie') return 'MOVIE'

  if (type === 'series') return 'TV'

  return 'OTHER'
}

export const tvdbAdapter: ProviderAdapter = {
  provider: 'TVDB',
  requiresKey: true,

  async search(query, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds) return []

    const token = await getToken(creds)
    const url = new URL(`${BASE_URL}/search`)

    url.searchParams.set('query', query)
    url.searchParams.set('limit', '10')

    const response = await fetch(url, { headers: authHeaders(token) })

    if (!response.ok) return []

    const payload = (await response.json()) as { data?: Record<string, unknown>[] }

    return (payload.data ?? []).map((item) => ({
      provider: 'TVDB' as const,
      externalId: String(item.tvdb_id ?? item.id ?? ''),
      title: (item.name as string | undefined) ?? 'Untitled',
      originalTitle: (item.name_translated as string | undefined) ?? null,
      year: item.year ? Number.parseInt(String(item.year), 10) : null,
      mediaType: toMediaType(item.type as string | undefined),
      overview: (item.overview as string | undefined) ?? null,
      posterUrl: (item.image_url as string | undefined) ?? null,
    }))
  },

  async fetchDetails(externalId, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds) throw error(403, 'TheTVDB credentials not configured')

    const token = await getToken(creds)
    const id = Number.parseInt(externalId, 10)

    if (Number.isNaN(id)) throw error(400, 'Invalid TVDB id')

    const seriesResponse = await fetch(`${BASE_URL}/series/${id}/extended`, { headers: authHeaders(token) })

    if (seriesResponse.ok) {
      const payload = (await seriesResponse.json()) as { data?: Record<string, unknown> }
      const raw = payload.data ?? {}
      const seasons = Array.isArray(raw.seasons)
        ? (raw.seasons as Record<string, unknown>[])
            .filter((s) => Number(s.type_id ?? s.seasonType) === 1 && Number(s.number) > 0)
            .map((s) => ({ seasonNumber: Number(s.number), episodes: Number(s.episodes_count ?? 0) }))
            .filter((s) => s.episodes > 0)
        : []
      const slug = raw.slug as string | undefined

      const normalized: CanonicalMedia = {
        provider: 'TVDB',
        externalId,
        externalUrl: slug ? `https://thetvdb.com/series/${slug}` : null,
        title: (raw.name as string | undefined) ?? 'Untitled',
        year: raw.firstAired ? Number.parseInt(String(raw.firstAired).slice(0, 4), 10) : null,
        mediaType: 'TV',
        overview: (raw.overview as string | undefined) ?? null,
        posterUrl: (raw.image as string | undefined) ?? null,
        tvdbId: id,
        genres: Array.isArray(raw.genres)
          ? (raw.genres as Record<string, unknown>[]).map((g) => String(g.name ?? '')).filter(Boolean)
          : [],
        countries: [],
        seasonsCount: seasons.length > 0 ? seasons.length : null,
        episodesCount: seasons.reduce((sum, s) => sum + s.episodes, 0) || null,
        seasonBreakdown: seasons.length > 0 ? seasons : null,
        isAdult: false,
        raw,
      }

      return normalized
    }

    const movieResponse = await fetch(`${BASE_URL}/movies/${id}/extended`, { headers: authHeaders(token) })

    if (!movieResponse.ok) throw error(movieResponse.status, 'TheTVDB details not found')

    const payload = (await movieResponse.json()) as { data?: Record<string, unknown> }
    const raw = payload.data ?? {}
    const slug = raw.slug as string | undefined

    return {
      provider: 'TVDB',
      externalId,
      externalUrl: slug ? `https://thetvdb.com/movies/${slug}` : null,
      title: (raw.name as string | undefined) ?? 'Untitled',
      year: raw.year ? Number.parseInt(String(raw.year), 10) : null,
      mediaType: 'MOVIE',
      overview: (raw.overview as string | undefined) ?? null,
      posterUrl: (raw.image as string | undefined) ?? null,
      tvdbId: id,
      genres: [],
      countries: [],
      isAdult: false,
      raw,
    }
  },
}
