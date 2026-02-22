import { appEnv } from './env'
import { getAdapter } from './providers/registry'
import { mediaRepository } from './repositories'

import type { DecryptedUserKey } from './providers/registry'
import type { MediaProvider } from '@prisma/client'

type MediaWithSources = NonNullable<Awaited<ReturnType<typeof mediaRepository.findByIdWithDetails>>>

/**
 * Maps each provider to the external ID field on the Media model it uses as its primary key.
 */
const PROVIDER_ID_FIELD: Record<MediaProvider, keyof MediaWithSources | null> = {
  TMDB: 'tmdbId',
  OMDB: 'imdbId',
  ANILIST: 'anilistId',
  TVDB: 'tvdbId',
  JIKAN: 'malId',
  KITSU: 'kitsuId',
  TRAKT: 'traktId',
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
 * For a given media record, fetch details from all compatible providers that:
 * 1. We already have a cross-reference ID for
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

  const fetchTasks: Promise<void>[] = []

  for (const provider of compatibleProviders) {
    if (existingProviders.has(provider)) continue

    const idField = PROVIDER_ID_FIELD[provider]

    if (!idField) continue

    const externalIdValue = media[idField as keyof MediaWithSources] as string | number | null | undefined

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
          if (!media.imdbId && normalized.imdbId) updates.imdbId = normalized.imdbId

          if (media.tvdbId == null && normalized.tvdbId) updates.tvdbId = normalized.tvdbId

          if (media.tmdbId == null && normalized.tmdbId) updates.tmdbId = normalized.tmdbId

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
              imdbId: (updates.imdbId as string | undefined) ?? media.imdbId ?? null,
              tvdbId: (updates.tvdbId as number | undefined) ?? media.tvdbId ?? null,
              tmdbId: (updates.tmdbId as number | undefined) ?? media.tmdbId ?? null,
              anilistId: media.anilistId ?? null,
              malId: media.malId ?? null,
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
        } catch {
          // Silently skip providers that fail — enrichment is best-effort
        }
      })(),
    )
  }

  await Promise.allSettled(fetchTasks)
  await mediaRepository.setMediaEnriched(mediaId, now)
}
