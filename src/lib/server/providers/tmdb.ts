/* eslint-disable camelcase */
import { error } from '@sveltejs/kit'

import { getTmdbLanguage } from '$lib/server/locale'

import type {
  CanonicalCastMember,
  CanonicalMedia,
  CanonicalRating,
  ProviderAdapter,
  ProviderCredentials,
  SearchResult,
  TmdbCredentials,
  WatchProviderEntry,
  WatchProviders,
} from './types'
import type { MediaType } from '@prisma/client'

const parseYear = (value?: string | null): number | null => {
  if (!value) return null

  const parsed = Number.parseInt(value.slice(0, 4), 10)

  return Number.isNaN(parsed) ? null : parsed
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
const TMDB_PROFILE_BASE_URL = 'https://image.tmdb.org/t/p/w185'
const TMDB_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w45'

const toImage = (path?: string | null, baseUrl?: string): string | null => {
  if (!path) return null

  return `${baseUrl ?? TMDB_IMAGE_BASE_URL}${path}`
}

const toMediaType = (type: string | undefined): MediaType => {
  if (type === 'movie') return 'MOVIE'

  if (type === 'tv') return 'TV'

  return 'OTHER'
}

const parsePositiveNumbers = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []

  return value.map(Number).filter((entry) => Number.isFinite(entry) && entry > 0)
}

const extractCast = (raw: Record<string, unknown>): CanonicalCastMember[] => {
  const credits = raw.credits as Record<string, unknown> | undefined

  if (!credits) return []

  const castList = Array.isArray(credits.cast) ? (credits.cast as Record<string, unknown>[]) : []

  return castList.slice(0, 20).map((member, index) => ({
    name: String(member.name ?? ''),
    role: (member.character as string | undefined) ?? null,
    order: (member.order as number | undefined) ?? index,
    profileUrl: toImage(member.profile_path as string | undefined, TMDB_PROFILE_BASE_URL),
    tmdbPersonId: member.id ? Number(member.id) : null,
  }))
}

const extractDirector = (raw: Record<string, unknown>): string | null => {
  const credits = raw.credits as Record<string, unknown> | undefined

  if (!credits) return null

  const crew = Array.isArray(credits.crew) ? (credits.crew as Record<string, unknown>[]) : []
  const director = crew.find((c) => c.job === 'Director')

  return director ? String(director.name ?? '') : null
}

const extractRatings = (raw: Record<string, unknown>): CanonicalRating[] => {
  const voteAverage = raw.vote_average as number | undefined
  const voteCount = raw.vote_count as number | undefined

  if (!voteAverage || voteAverage === 0) return []

  return [
    {
      source: 'TMDB',
      value: Math.round(voteAverage * 10) / 10,
      maxValue: 10,
      votes: voteCount,
    },
  ]
}

const extractExternalIds = (raw: Record<string, unknown>): { imdbId: string | null; tvdbId: number | null } => {
  const externalIds = raw.external_ids as Record<string, unknown> | undefined

  return {
    imdbId: (externalIds?.imdb_id as string | undefined) ?? (raw.imdb_id as string | undefined) ?? null,
    tvdbId: externalIds?.tvdb_id ? Number(externalIds.tvdb_id) : null,
  }
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const id = Number(raw.id)
  const title = (raw.title ?? raw.name ?? '') as string
  const originalTitle = (raw.original_title ?? raw.original_name ?? null) as string | null
  const releaseDate = (raw.release_date ?? raw.first_air_date ?? null) as string | null
  const mediaType = toMediaType(raw.media_type as string | undefined)
  const episodeRuntimeValues = parsePositiveNumbers(raw.episode_run_time)
  const seasonBreakdown = Array.isArray(raw.seasons)
    ? raw.seasons
        .map((s) => ({
          seasonNumber: Number((s as Record<string, unknown>).season_number),
          episodes: Number((s as Record<string, unknown>).episode_count),
        }))
        .filter(
          (s) => Number.isFinite(s.seasonNumber) && s.seasonNumber > 0 && Number.isFinite(s.episodes) && s.episodes > 0,
        )
    : []
  const seasonsCountFromApi = raw.number_of_seasons as number | undefined
  const resolvedSeasonsCount = seasonsCountFromApi ?? (seasonBreakdown.length > 0 ? seasonBreakdown.length : null)
  const { imdbId, tvdbId } = extractExternalIds(raw)
  const externalUrl =
    mediaType === 'TV' ? `https://www.themoviedb.org/tv/${id}` : `https://www.themoviedb.org/movie/${id}`

  return {
    provider: 'TMDB',
    externalId: String(id),
    externalUrl,
    title,
    originalTitle,
    tagline: (raw.tagline as string | undefined) || null,
    status: (raw.status as string | undefined) ?? null,
    director: extractDirector(raw),
    year: parseYear(releaseDate),
    mediaType,
    overview: (raw.overview as string | undefined) ?? null,
    posterUrl: toImage(raw.poster_path as string | undefined),
    backdropUrl: toImage(raw.backdrop_path as string | undefined),
    imdbId,
    tmdbId: id,
    tvdbId,
    genres: [],
    countries: Array.isArray(raw.origin_country) ? (raw.origin_country as string[]) : [],
    runtimeMinutes: (raw.runtime as number | undefined) ?? null,
    episodeRuntimeMin: episodeRuntimeValues.length > 0 ? Math.min(...episodeRuntimeValues) : null,
    episodeRuntimeMax: episodeRuntimeValues.length > 0 ? Math.max(...episodeRuntimeValues) : null,
    seasonsCount: mediaType === 'TV' ? resolvedSeasonsCount : null,
    episodesCount: mediaType === 'TV' ? ((raw.number_of_episodes as number | undefined) ?? null) : null,
    seasonBreakdown: mediaType === 'TV' && seasonBreakdown.length > 0 ? seasonBreakdown : null,
    isAdult: Boolean(raw.adult),
    ratings: extractRatings(raw),
    cast: extractCast(raw),
    raw,
  }
}

const resolveCredentials = (credentials?: ProviderCredentials): TmdbCredentials => ({
  apiKey: credentials?.apiKey,
  bearerToken: credentials?.bearerToken,
})

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

const DEFAULT_WATCH_REGION = 'US'

const extractWatchProviders = (raw: Record<string, unknown>, mediaPath: string): WatchProviders | null => {
  const results = raw.results as Record<string, unknown> | undefined

  if (!results) return null

  const region = Object.keys(results)[0] ?? DEFAULT_WATCH_REGION
  const regionData = results[region] as Record<string, unknown> | undefined

  if (!regionData) return null

  const parseEntries = (entries?: unknown[]): WatchProviderEntry[] => {
    if (!Array.isArray(entries)) return []

    return entries.map((entry) => {
      const item = entry as Record<string, unknown>

      return {
        name: String(item.provider_name ?? ''),
        logoUrl: item.logo_path ? `${TMDB_LOGO_BASE_URL}${item.logo_path}` : null,
      }
    })
  }

  return {
    stream: parseEntries(regionData.flatrate as unknown[]),
    rent: parseEntries(regionData.rent as unknown[]),
    buy: parseEntries(regionData.buy as unknown[]),
    link: (regionData.link as string | undefined) ?? mediaPath ?? null,
  }
}

const fetchWatchProviders = async (mediaPath: string, creds: TmdbCredentials): Promise<WatchProviders | null> => {
  try {
    const url = new URL(`https://api.themoviedb.org${mediaPath}/watch/providers`)

    applyApiKey(url, creds)

    const response = await fetch(url, { headers: buildAuthHeaders(creds) })

    if (!response.ok) return null

    const payload = (await response.json()) as Record<string, unknown>

    return extractWatchProviders(payload, `https://www.themoviedb.org${mediaPath}/watch`)
  } catch {
    return null
  }
}

export const tmdbAdapter: ProviderAdapter = {
  provider: 'TMDB',
  requiresKey: true,

  async search(query, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds.apiKey && !creds.bearerToken) return []

    const url = new URL('https://api.themoviedb.org/3/search/multi')

    url.searchParams.set('query', query)
    url.searchParams.set('language', getTmdbLanguage())
    url.searchParams.set('page', '1')
    url.searchParams.set('include_adult', 'false')
    applyApiKey(url, creds)

    const response = await fetch(url, { headers: buildAuthHeaders(creds) })

    if (!response.ok) return []

    const payload = (await response.json()) as { results?: Record<string, unknown>[] }
    const results: SearchResult[] = []

    for (const item of payload.results ?? []) {
      if (item.media_type !== 'movie' && item.media_type !== 'tv') continue

      const normalized = normalize(item)

      results.push({
        provider: 'TMDB',
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

  async fetchDetails(externalId, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds.apiKey && !creds.bearerToken) {
      throw error(403, 'TMDB credentials not configured')
    }

    const id = Number.parseInt(externalId, 10)

    if (Number.isNaN(id)) throw error(400, 'Invalid TMDB id')

    const language = getTmdbLanguage()
    const appendToResponse = 'credits,external_ids'

    const tvUrl = new URL(`https://api.themoviedb.org/3/tv/${id}`)

    tvUrl.searchParams.set('language', language)
    tvUrl.searchParams.set('append_to_response', appendToResponse)
    applyApiKey(tvUrl, creds)

    const tvResponse = await fetch(tvUrl, { headers: buildAuthHeaders(creds) })

    if (tvResponse.ok) {
      const tvData = normalize({ ...(await tvResponse.json()), media_type: 'tv' })

      tvData.watchProviders = await fetchWatchProviders(`/3/tv/${id}`, creds)

      return tvData
    }

    const movieUrl = new URL(`https://api.themoviedb.org/3/movie/${id}`)

    movieUrl.searchParams.set('language', language)
    movieUrl.searchParams.set('append_to_response', appendToResponse)
    applyApiKey(movieUrl, creds)

    const movieResponse = await fetch(movieUrl, { headers: buildAuthHeaders(creds) })

    if (!movieResponse.ok) throw error(movieResponse.status, 'TMDB details not found')

    const movieData = normalize({ ...(await movieResponse.json()), media_type: 'movie' })

    movieData.watchProviders = await fetchWatchProviders(`/3/movie/${id}`, creds)

    return movieData
  },
}
