import { appEnv } from './env'
import { getAdapter } from './providers/registry'
import { mediaRepository } from './repositories'

import type { DecryptedUserKey } from './providers/registry'
import type { MediaProvider } from '@prisma/client'

type MediaWithSources = NonNullable<Awaited<ReturnType<typeof mediaRepository.findByIdWithDetails>>>

/**
 * Mutable bag of cross-reference IDs that may be discovered during enrichment.
 * Starts from the DB values, gets updated by the ID-discovery step.
 */
type KnownIds = {
  imdbId: string | null
  tvdbId: number | null
  tmdbId: number | null
  malId: number | null
  anilistId: number | null
  kitsuId: string | null
  traktId: number | null
}

const getExternalId = (provider: MediaProvider, ids: KnownIds): string | number | null | undefined => {
  switch (provider) {
    case 'TMDB':
      return ids.tmdbId
    case 'OMDB':
      return ids.imdbId
    case 'TVDB':
      return ids.tvdbId
    case 'ANILIST':
      return ids.anilistId
    case 'JIKAN':
      return ids.malId
    case 'KITSU':
      return ids.kitsuId
    case 'TRAKT':
      return ids.traktId
  }
}

/**
 * Only these providers make sense to cross-reference across different media types.
 * Provider groups: movies+TV (TMDB, OMDB, TRAKT, TVDB) and anime (ANILIST, JIKAN, KITSU).
 */
const MOVIE_TV_PROVIDERS: MediaProvider[] = ['TMDB', 'OMDB', 'TRAKT', 'TVDB']
const ANIME_PROVIDERS: MediaProvider[] = ['ANILIST', 'JIKAN', 'KITSU']

const getCompatibleProviders = (media: MediaWithSources): MediaProvider[] => {
  if (media.mediaType === 'ANIME') return ANIME_PROVIDERS

  if (media.mediaType === 'MOVIE' || media.mediaType === 'TV') return MOVIE_TV_PROVIDERS

  return [...MOVIE_TV_PROVIDERS, ...ANIME_PROVIDERS]
}

/**
 * Discovers cross-reference IDs from existing provider sources when they are missing
 * from the media record. This handles media imported before external_id enrichment
 * was added to the adapters (e.g. TMDB TV shows missing imdbId, AniList missing malId).
 */
const discoverMissingIds = async (
  mediaId: string,
  media: MediaWithSources,
  existingProviders: Set<MediaProvider>,
  credsByProvider: Map<MediaProvider, unknown>,
  ids: KnownIds,
): Promise<void> => {
  const tasks: Promise<void>[] = []

  // TMDB gives us imdbId and tvdbId via external_ids — re-fetch if missing
  if (existingProviders.has('TMDB') && ids.tmdbId && (!ids.imdbId || ids.tvdbId == null)) {
    const tmdbCreds = credsByProvider.get('TMDB')
    const tmdbAdapter = getAdapter('TMDB')

    if (tmdbAdapter && tmdbCreds) {
      tasks.push(
        (async () => {
          try {
            const d = await tmdbAdapter.fetchDetails(String(ids.tmdbId), tmdbCreds as never)

            if (!ids.imdbId && d.imdbId) ids.imdbId = d.imdbId

            if (ids.tvdbId == null && d.tvdbId) ids.tvdbId = d.tvdbId
          } catch {
            // best-effort
          }
        })(),
      )
    }
  }

  // AniList gives us idMal — re-fetch if malId is missing
  if (existingProviders.has('ANILIST') && ids.anilistId && !ids.malId) {
    const anilistAdapter = getAdapter('ANILIST')

    if (anilistAdapter) {
      tasks.push(
        (async () => {
          try {
            const d = await anilistAdapter.fetchDetails(String(ids.anilistId))

            if (d.malId) ids.malId = d.malId
          } catch {
            // best-effort
          }
        })(),
      )
    }
  }

  await Promise.allSettled(tasks)

  // Persist any newly discovered IDs back to the media record
  const persistUpdates: Record<string, unknown> = {}

  if (!media.imdbId && ids.imdbId) persistUpdates.imdbId = ids.imdbId

  if (media.tvdbId == null && ids.tvdbId) persistUpdates.tvdbId = ids.tvdbId

  if (!media.malId && ids.malId) persistUpdates.malId = ids.malId

  if (Object.keys(persistUpdates).length > 0) {
    await mediaRepository.upsertMedia(mediaId, {
      mediaType: media.mediaType,
      title: media.title,
      originalTitle: media.originalTitle,
      countries: media.countries,
      isAdult: media.isAdult,
      tagline: media.tagline ?? null,
      status: media.status ?? null,
      director: media.director ?? null,
      backdropUrl: media.backdropUrl ?? null,
      posterUrl: media.posterUrl ?? null,
      overview: media.overview ?? null,
      imdbId: (persistUpdates.imdbId as string | undefined) ?? media.imdbId ?? null,
      tvdbId: (persistUpdates.tvdbId as number | undefined) ?? media.tvdbId ?? null,
      tmdbId: media.tmdbId ?? null,
      anilistId: media.anilistId ?? null,
      malId: (persistUpdates.malId as number | undefined) ?? media.malId ?? null,
      kitsuId: media.kitsuId ?? null,
      traktId: media.traktId ?? null,
      year: media.year ?? null,
      runtimeMinutes: media.runtimeMinutes ?? null,
      episodeRuntimeMin: media.episodeRuntimeMin ?? null,
      episodeRuntimeMax: media.episodeRuntimeMax ?? null,
      seasonsCount: media.seasonsCount ?? null,
      episodesCount: media.episodesCount ?? null,
      seasonBreakdown: media.seasonBreakdown ?? null,
    })
  }
}

/**
 * For a given media record, fetch details from all compatible providers that:
 * 1. We already have a cross-reference ID for (or just discovered one)
 * 2. Don't yet have a MediaSource saved
 * 3. Are enabled (user has a key or provider is free)
 *
 * Merges ratings, cast, externalUrls, and fills in missing text fields.
 * Sets enrichedAt when done.
 */
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

    const externalId = String(externalIdValue)

    fetchTasks.push(
      (async () => {
        try {
          const normalized = await adapter.fetchDetails(externalId, credsByProvider.get(provider))

          await mediaRepository.upsertMediaSource({
            mediaId,
            provider,
            externalId,
            externalUrl: normalized.externalUrl ?? null,
            rawJson: normalized.raw,
            normalizedJson: normalized,
            lastFetchedAt: now,
            expiresAt,
          })

          if (normalized.ratings && normalized.ratings.length > 0) {
            await mediaRepository.upsertMediaRatings(
              mediaId,
              normalized.ratings.map((r) => ({ ...r, provider })),
            )
          }

          // Only enrich cast if none is saved yet and this provider has cast data
          if (media.cast.length === 0 && normalized.cast && normalized.cast.length > 0) {
            await mediaRepository.replaceMediaCast(mediaId, normalized.cast)
          }

          // Fill in missing fields on the Media record
          const updates: Record<string, unknown> = {}

          if (!media.tagline && normalized.tagline) updates.tagline = normalized.tagline

          if (!media.status && normalized.status) updates.status = normalized.status

          if (!media.director && normalized.director) updates.director = normalized.director

          if (!media.backdropUrl && normalized.backdropUrl) updates.backdropUrl = normalized.backdropUrl

          if (!media.posterUrl && normalized.posterUrl) updates.posterUrl = normalized.posterUrl

          if (!media.overview && normalized.overview) updates.overview = normalized.overview

          // Cross-reference IDs: fill in missing external IDs discovered from this provider
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

          if (Object.keys(updates).length > 0) {
            await mediaRepository.upsertMedia(mediaId, {
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
          }
        } catch {
          // Silently skip providers that fail — enrichment is best-effort
        }
      })(),
    )
  }

  await Promise.allSettled(fetchTasks)
  await mediaRepository.setMediaEnriched(mediaId, now)
}
