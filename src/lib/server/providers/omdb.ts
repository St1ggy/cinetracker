import { error } from '@sveltejs/kit'

import type {
  CanonicalCastMember,
  CanonicalMedia,
  CanonicalRating,
  OmdbCredentials,
  ProviderAdapter,
  ProviderCredentials,
  SearchResult,
} from './types'
import type { MediaType } from '@prisma/client'

const BASE_URL = 'https://www.omdbapi.com/'

const resolveCredentials = (credentials?: ProviderCredentials): OmdbCredentials | null => {
  const apiKey = credentials?.apiKey

  return apiKey ? { apiKey } : null
}

const toMediaType = (type: string | undefined): MediaType => {
  if (type === 'movie') return 'MOVIE'

  if (type === 'series') return 'TV'

  return 'OTHER'
}

const parseOmdbRatings = (raw: Record<string, unknown>): CanonicalRating[] => {
  const ratings: CanonicalRating[] = []
  const rawRatings = raw.Ratings

  if (Array.isArray(rawRatings)) {
    for (const r of rawRatings as Record<string, string>[]) {
      const source = r.Source ?? ''
      const valueStr = r.Value ?? ''

      if (source === 'Internet Movie Database') {
        const parts = valueStr.split('/')

        if (parts.length === 2) {
          const value = Number.parseFloat(parts[0])
          const max = Number.parseFloat(parts[1])

          if (!Number.isNaN(value) && !Number.isNaN(max)) {
            const imdbVotes = raw.imdbVotes ? Number(String(raw.imdbVotes).replaceAll(',', '')) : undefined

            ratings.push({ source: 'IMDb', value, maxValue: max, votes: Number.isNaN(imdbVotes) ? undefined : imdbVotes })
          }
        }
      } else if (source === 'Rotten Tomatoes') {
        const pctStr = valueStr.replace('%', '')
        const value = Number.parseFloat(pctStr)

        if (!Number.isNaN(value)) {
          ratings.push({ source: 'Rotten Tomatoes', value, maxValue: 100 })
        }
      } else if (source === 'Metacritic') {
        const parts = valueStr.split('/')

        if (parts.length === 2) {
          const value = Number.parseFloat(parts[0])
          const max = Number.parseFloat(parts[1])

          if (!Number.isNaN(value) && !Number.isNaN(max)) {
            ratings.push({ source: 'Metacritic', value, maxValue: max })
          }
        }
      }
    }
  }

  return ratings
}

const parseOmdbCast = (raw: Record<string, unknown>): CanonicalCastMember[] => {
  const actorsStr = raw.Actors as string | undefined

  if (!actorsStr || actorsStr === 'N/A') return []

  return actorsStr
    .split(',')
    .map((name, idx) => ({ name: name.trim(), order: idx }))
    .filter((m) => m.name.length > 0)
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const year = raw.Year ? Number.parseInt(String(raw.Year).slice(0, 4), 10) : null
  const runtime = raw.Runtime ? Number.parseInt(String(raw.Runtime), 10) : null
  const genres = raw.Genre
    ? String(raw.Genre)
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
    : []
  const countries = raw.Country
    ? String(raw.Country)
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : []
  const imdbId = (raw.imdbID as string | undefined) ?? null
  const director = raw.Director && raw.Director !== 'N/A' ? (raw.Director as string) : null
  const externalUrl = imdbId ? `https://www.imdb.com/title/${imdbId}` : null

  return {
    provider: 'OMDB',
    externalId: imdbId ?? String(raw.imdbID ?? ''),
    externalUrl,
    title: (raw.Title as string | undefined) ?? 'Untitled',
    originalTitle: null,
    director,
    year: year && !Number.isNaN(year) ? year : null,
    mediaType: toMediaType(raw.Type as string | undefined),
    overview: raw.Plot && raw.Plot !== 'N/A' ? (raw.Plot as string) : null,
    posterUrl: raw.Poster && raw.Poster !== 'N/A' ? (raw.Poster as string) : null,
    imdbId,
    genres,
    countries,
    runtimeMinutes: runtime && !Number.isNaN(runtime) ? runtime : null,
    isAdult: false,
    ratings: parseOmdbRatings(raw),
    cast: parseOmdbCast(raw),
    raw,
  }
}

export const omdbAdapter: ProviderAdapter = {
  provider: 'OMDB',
  requiresKey: true,

  async search(query, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds) return []

    const url = new URL(BASE_URL)

    url.searchParams.set('s', query)
    url.searchParams.set('apikey', creds.apiKey)

    const response = await fetch(url)

    if (!response.ok) return []

    const payload = (await response.json()) as { Search?: Record<string, unknown>[]; Response: string }

    if (payload.Response !== 'True' || !payload.Search) return []

    return payload.Search.map((item): SearchResult => {
      const year = item.Year ? Number.parseInt(String(item.Year).slice(0, 4), 10) : null

      return {
        provider: 'OMDB',
        externalId: (item.imdbID as string) ?? '',
        title: (item.Title as string) ?? 'Untitled',
        year: year && !Number.isNaN(year) ? year : null,
        mediaType: toMediaType(item.Type as string | undefined),
        posterUrl: item.Poster && item.Poster !== 'N/A' ? (item.Poster as string) : null,
      }
    })
  },

  async fetchDetails(externalId, credentials) {
    const creds = resolveCredentials(credentials)

    if (!creds) throw error(403, 'OMDb credentials not configured')

    const url = new URL(BASE_URL)

    url.searchParams.set('i', externalId)
    url.searchParams.set('plot', 'full')
    url.searchParams.set('apikey', creds.apiKey)

    const response = await fetch(url)

    if (!response.ok) throw error(response.status, 'OMDb details not found')

    const payload = (await response.json()) as Record<string, unknown>

    if (payload.Response === 'False') throw error(404, 'OMDb media not found')

    return normalize(payload)
  },
}
