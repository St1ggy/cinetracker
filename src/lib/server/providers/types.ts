import type { MediaProvider, MediaType } from '@prisma/client'

export type SearchResult = {
  provider: MediaProvider
  externalId: string
  title: string
  originalTitle?: string | null
  year?: number | null
  mediaType: MediaType
  overview?: string | null
  posterUrl?: string | null
}

export type CanonicalRating = {
  source: string
  value: number
  maxValue: number
  votes?: number
}

export type CanonicalCastMember = {
  name: string
  role?: string | null
  order?: number | null
  profileUrl?: string | null
  tmdbPersonId?: number | null
  anilistStaffId?: number | null
}

export type WatchProviderEntry = {
  name: string
  logoUrl: string | null
}

export type WatchProviders = {
  stream: WatchProviderEntry[]
  rent: WatchProviderEntry[]
  buy: WatchProviderEntry[]
  link: string | null
}

export type CanonicalMedia = {
  provider: MediaProvider
  externalId: string
  externalUrl?: string | null
  title: string
  originalTitle?: string | null
  tagline?: string | null
  status?: string | null
  director?: string | null
  year?: number | null
  mediaType: MediaType
  overview?: string | null
  posterUrl?: string | null
  backdropUrl?: string | null
  imdbId?: string | null
  tmdbId?: number | null
  anilistId?: number | null
  tvdbId?: number | null
  malId?: number | null
  kitsuId?: number | null
  traktId?: number | null
  genres: string[]
  countries: string[]
  runtimeMinutes?: number | null
  episodeRuntimeMin?: number | null
  episodeRuntimeMax?: number | null
  seasonsCount?: number | null
  episodesCount?: number | null
  seasonBreakdown?: { seasonNumber: number; episodes: number }[] | null
  isAdult: boolean
  ratings?: CanonicalRating[]
  cast?: CanonicalCastMember[]
  watchProviders?: WatchProviders | null
  raw: unknown
}

export type ProviderCredentials = Record<string, string>

export type ProviderAdapter = {
  readonly provider: MediaProvider
  readonly requiresKey: boolean
  search(query: string, credentials?: ProviderCredentials): Promise<SearchResult[]>
  fetchDetails(externalId: string, credentials?: ProviderCredentials): Promise<CanonicalMedia>
}

export type TmdbCredentials = { apiKey?: string; bearerToken?: string }
export type OmdbCredentials = { apiKey: string }
export type TvdbCredentials = { apiKey: string; pin?: string }
export type TraktCredentials = { clientId: string }
export type SimklCredentials = { clientId: string }

export { type MediaProvider } from '@prisma/client'
