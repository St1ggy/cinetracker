import { appEnv } from './env'
import { getAdapter } from './providers/registry'
import { mediaRepository } from './repositories'

import type { DecryptedUserKey } from './providers/registry'
import type { CanonicalMedia, ProviderCredentials } from './providers/types'
import type { MediaProvider } from '@prisma/client'

type MediaWithSources = NonNullable<Awaited<ReturnType<typeof mediaRepository.findByIdWithDetails>>>

// Mutable bag of cross-reference IDs that may be discovered during enrichment.
// Starts from the DB values, gets updated by the ID-discovery step.
type KnownIds = {
  imdbId: string | null
  tvdbId: number | null
  tmdbId: number | null
  malId: number | null
  anilistId: number | null
  kitsuId: number | null
  traktId: number | null
}

const EXTERNAL_ID_MAP: Record<MediaProvider, (ids: KnownIds) => string | number | null> = {
  TMDB: (ids) => ids.tmdbId,
  OMDB: (ids) => ids.imdbId,
  TVDB: (ids) => ids.tvdbId,
  ANILIST: (ids) => ids.anilistId,
  JIKAN: (ids) => ids.malId,
  KITSU: (ids) => ids.kitsuId,
  TRAKT: (ids) => ids.traktId,
}

const getExternalId = (provider: MediaProvider, ids: KnownIds): string | number | null => EXTERNAL_ID_MAP[provider](ids)

// Only these providers make sense to cross-reference across different media types.
// Provider groups: movies+TV (TMDB, OMDB, TRAKT, TVDB) and anime (ANILIST, JIKAN, KITSU).
const MOVIE_TV_PROVIDERS: MediaProvider[] = ['TMDB', 'OMDB', 'TRAKT', 'TVDB']
const ANIME_PROVIDERS: MediaProvider[] = ['ANILIST', 'JIKAN', 'KITSU']

const getCompatibleProviders = (media: MediaWithSources): MediaProvider[] => {
  if (media.mediaType === 'ANIME') return ANIME_PROVIDERS

  if (media.mediaType === 'MOVIE' || media.mediaType === 'TV') return MOVIE_TV_PROVIDERS

  return [...MOVIE_TV_PROVIDERS, ...ANIME_PROVIDERS]
}

const buildUpsertPayload = (media: MediaWithSources, ids: KnownIds, updates: Record<string, unknown>) => ({
  mediaType: media.mediaType,
  title: media.title,
  originalTitle: media.originalTitle,
  countries: media.countries,
  isAdult: media.isAdult,
  tagline: (updates.tagline as string | undefined) ?? media.tagline ?? null,
  status: (updates.status as string | undefined) ?? media.status ?? null,
  director: (updates.director as string | undefined) ?? media.director ?? null,
  backdropUrl: (updates.backdropUrl as string | undefined) ?? media.backdropUrl ?? null,
  posterUrl: (updates.posterUrl as string | undefined) ?? media.posterUrl ?? null,
  overview: (updates.overview as string | undefined) ?? media.overview ?? null,
  imdbId: (updates.imdbId as string | undefined) ?? ids.imdbId ?? null,
  tvdbId: (updates.tvdbId as number | undefined) ?? ids.tvdbId ?? null,
  tmdbId: (updates.tmdbId as number | undefined) ?? ids.tmdbId ?? null,
  anilistId: ids.anilistId ?? null,
  malId: (updates.malId as number | undefined) ?? ids.malId ?? null,
  kitsuId: ids.kitsuId ?? null,
  traktId: ids.traktId ?? null,
  year: media.year ?? null,
  runtimeMinutes: media.runtimeMinutes ?? null,
  episodeRuntimeMin: media.episodeRuntimeMin ?? null,
  episodeRuntimeMax: media.episodeRuntimeMax ?? null,
  seasonsCount: media.seasonsCount ?? null,
  episodesCount: media.episodesCount ?? null,
  seasonBreakdown: media.seasonBreakdown ?? null,
})

const collectTextUpdates = (media: MediaWithSources, normalized: CanonicalMedia): Record<string, unknown> => {
  const updates: Record<string, unknown> = {}

  if (!media.tagline && normalized.tagline) updates.tagline = normalized.tagline

  if (!media.status && normalized.status) updates.status = normalized.status

  if (!media.director && normalized.director) updates.director = normalized.director

  if (!media.backdropUrl && normalized.backdropUrl) updates.backdropUrl = normalized.backdropUrl

  if (!media.posterUrl && normalized.posterUrl) updates.posterUrl = normalized.posterUrl

  if (!media.overview && normalized.overview) updates.overview = normalized.overview

  return updates
}

const syncCrossRefIds = (normalized: CanonicalMedia, ids: KnownIds, updates: Record<string, unknown>): void => {
  if (!ids.imdbId && normalized.imdbId) {
    updates.imdbId = normalized.imdbId
    ids.imdbId = normalized.imdbId
  }

  if (ids.tvdbId == null && normalized.tvdbId) {
    updates.tvdbId = normalized.tvdbId
    ids.tvdbId = normalized.tvdbId
  }

  if (ids.tmdbId == null && normalized.tmdbId) {
    updates.tmdbId = normalized.tmdbId
    ids.tmdbId = normalized.tmdbId
  }

  if (ids.malId == null && normalized.malId) {
    updates.malId = normalized.malId
    ids.malId = normalized.malId
  }
}

type FetchContext = {
  mediaId: string
  provider: MediaProvider
  externalId: string
  media: MediaWithSources
  ids: KnownIds
  credsByProvider: Map<MediaProvider, ProviderCredentials>
  now: Date
  expiresAt: Date
}

const processProviderFetch = async (context: FetchContext): Promise<void> => {
  const adapter = getAdapter(context.provider)

  if (!adapter) return

  try {
    const normalized = await adapter.fetchDetails(context.externalId, context.credsByProvider.get(context.provider))

    await mediaRepository.upsertMediaSource({
      mediaId: context.mediaId,
      provider: context.provider,
      externalId: context.externalId,
      externalUrl: normalized.externalUrl ?? null,
      rawJson: normalized.raw,
      normalizedJson: normalized,
      lastFetchedAt: context.now,
      expiresAt: context.expiresAt,
    })

    if (normalized.ratings && normalized.ratings.length > 0) {
      await mediaRepository.upsertMediaRatings(
        context.mediaId,
        normalized.ratings.map((r) => ({ ...r, provider: context.provider })),
      )
    }

    // Only enrich cast if none is saved yet and this provider has cast data
    if (context.media.cast.length === 0 && normalized.cast && normalized.cast.length > 0) {
      await mediaRepository.replaceMediaCast(context.mediaId, normalized.cast)
    }

    const updates = collectTextUpdates(context.media, normalized)

    syncCrossRefIds(normalized, context.ids, updates)

    if (Object.keys(updates).length > 0) {
      await mediaRepository.upsertMedia(context.mediaId, buildUpsertPayload(context.media, context.ids, updates))
    }
  } catch {
    // Silently skip providers that fail — enrichment is best-effort
  }
}

const fetchTmdbCrossRefs = async (tmdbId: number, creds: unknown, ids: KnownIds): Promise<void> => {
  const adapter = getAdapter('TMDB')

  if (!adapter) return

  try {
    const d = await adapter.fetchDetails(String(tmdbId), creds as never)

    if (!ids.imdbId && d.imdbId) ids.imdbId = d.imdbId

    if (ids.tvdbId == null && d.tvdbId) ids.tvdbId = d.tvdbId
  } catch {
    // best-effort
  }
}

const fetchAnilistCrossRefs = async (anilistId: number, ids: KnownIds): Promise<void> => {
  const adapter = getAdapter('ANILIST')

  if (!adapter) return

  try {
    const d = await adapter.fetchDetails(String(anilistId))

    if (d.malId) ids.malId = d.malId
  } catch {
    // best-effort
  }
}

const persistDiscoveredIds = async (mediaId: string, media: MediaWithSources, ids: KnownIds): Promise<void> => {
  const updates: Record<string, unknown> = {}

  if (!media.imdbId && ids.imdbId) updates.imdbId = ids.imdbId

  if (media.tvdbId == null && ids.tvdbId) updates.tvdbId = ids.tvdbId

  if (!media.malId && ids.malId) updates.malId = ids.malId

  if (Object.keys(updates).length === 0) return

  await mediaRepository.upsertMedia(mediaId, buildUpsertPayload(media, ids, updates))
}

// Discovers cross-reference IDs from existing provider sources when they are missing
// from the media record. This handles media imported before external_id enrichment
// was added to the adapters (e.g. TMDB TV shows missing imdbId, AniList missing malId).
const discoverMissingIds = async (
  mediaId: string,
  media: MediaWithSources,
  existingProviders: Set<MediaProvider>,
  credsByProvider: Map<MediaProvider, unknown>,
  ids: KnownIds,
): Promise<void> => {
  const tasks: Promise<void>[] = []

  if (existingProviders.has('TMDB') && ids.tmdbId && (!ids.imdbId || ids.tvdbId == null)) {
    const creds = credsByProvider.get('TMDB')

    if (creds) tasks.push(fetchTmdbCrossRefs(ids.tmdbId, creds, ids))
  }

  if (existingProviders.has('ANILIST') && ids.anilistId && !ids.malId) {
    tasks.push(fetchAnilistCrossRefs(ids.anilistId, ids))
  }

  await Promise.allSettled(tasks)

  await persistDiscoveredIds(mediaId, media, ids)
}

// For a given media record, fetch details from all compatible providers that:
// 1. We already have a cross-reference ID for (or just discovered one)
// 2. Don't yet have a MediaSource saved
// 3. Are enabled (user has a key or provider is free)
//
// Merges ratings, cast, externalUrls, and fills in missing text fields.
// Sets enrichedAt when done.
export const enrichMediaSources = async (mediaId: string, userKeys: DecryptedUserKey[]): Promise<void> => {
  const media = await mediaRepository.findByIdWithDetails(mediaId)

  if (!media) return

  const now = new Date()
  const expiresAt = new Date(now.getTime() + appEnv.externalCacheTtlSeconds * 1000)
  const existingProviders = new Set(media.sources.map((s) => s.provider))
  const credsByProvider = new Map(userKeys.map((k) => [k.provider, k.credentials]))
  const compatibleProviders = getCompatibleProviders(media)

  const ids: KnownIds = {
    imdbId: media.imdbId,
    tvdbId: media.tvdbId,
    tmdbId: media.tmdbId,
    malId: media.malId,
    anilistId: media.anilistId,
    kitsuId: media.kitsuId,
    traktId: media.traktId,
  }

  await discoverMissingIds(mediaId, media, existingProviders, credsByProvider, ids)

  const fetchTasks: Promise<void>[] = []

  for (const provider of compatibleProviders) {
    if (existingProviders.has(provider)) continue

    const externalIdValue = getExternalId(provider, ids)

    if (externalIdValue == null) continue

    const adapter = getAdapter(provider)

    if (!adapter) continue

    if (adapter.requiresKey && !credsByProvider.has(provider)) continue

    fetchTasks.push(
      processProviderFetch({
        mediaId,
        provider,
        externalId: String(externalIdValue),
        media,
        ids,
        credsByProvider,
        now,
        expiresAt,
      }),
    )
  }

  await Promise.allSettled(fetchTasks)
  await mediaRepository.setMediaEnriched(mediaId, now)
}
