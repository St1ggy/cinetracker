import { error } from '@sveltejs/kit'

import { appEnv } from './env'
import { getAdapter, getEnabledAdapters } from './providers/registry'
import { mediaRepository } from './repositories'

import type { DecryptedUserKey } from './providers/registry'
import type { SearchResult } from './providers/types'
import type { MediaProvider } from '@prisma/client'

const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    .replaceAll(/[^\w\s]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()

const deduplicateResults = (results: SearchResult[]) => {
  const seen = new Map<string, SearchResult>()

  for (const result of results) {
    const key = `${normalizeTitle(result.title)}|${result.year ?? ''}|${result.mediaType}`
    const existing = seen.get(key)

    if (!existing) {
      seen.set(key, result)
      continue
    }

    const existingScore = (existing.posterUrl ? 1 : 0) + (existing.overview ? 1 : 0)
    const currentScore = (result.posterUrl ? 1 : 0) + (result.overview ? 1 : 0)

    if (currentScore > existingScore) {
      seen.set(key, result)
    }
  }

  return [...seen.values()]
}

export const searchExternal = async (query: string, userKeys: DecryptedUserKey[], providerFilter?: string[]) => {
  const trimmed = query.trim()

  if (!trimmed) return []

  const enabledAdapters = getEnabledAdapters(userKeys)
  const filterSet = providerFilter ? new Set(providerFilter.map((p) => p.toUpperCase())) : null

  const adapters = filterSet ? enabledAdapters.filter((a) => filterSet.has(a.provider)) : enabledAdapters

  const credsByProvider = new Map(userKeys.map((k) => [k.provider, k.credentials]))

  const searchResults = await Promise.allSettled(
    adapters.map((adapter) => adapter.search(trimmed, credsByProvider.get(adapter.provider))),
  )

  const flat = searchResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  const deduplicated = deduplicateResults(flat)

  return deduplicated.slice(0, 20)
}

export const importExternalMedia = async (
  provider: MediaProvider,
  externalId: string,
  userKeys: DecryptedUserKey[] = [],
) => {
  const cache = await mediaRepository.findSourceWithMedia(provider, externalId)

  const now = new Date()

  if (cache?.expiresAt && cache.expiresAt > now) {
    return cache.media
  }

  const adapter = getAdapter(provider)

  if (!adapter) throw error(400, `Unsupported provider: ${provider}`)

  const credsByProvider = new Map(userKeys.map((k) => [k.provider, k.credentials]))
  const normalized = await adapter.fetchDetails(externalId, credsByProvider.get(provider))

  const existing = await mediaRepository.findExistingByExternalKeys({
    imdbId: normalized.imdbId,
    tmdbId: normalized.tmdbId,
    anilistId: normalized.anilistId,
    tvdbId: normalized.tvdbId,
    malId: normalized.malId,
    kitsuId: normalized.kitsuId,
    traktId: normalized.traktId,
  })

  const upsertedMedia = await mediaRepository.upsertMedia(cache?.mediaId ?? existing?.id ?? null, {
    mediaType: normalized.mediaType,
    title: normalized.title,
    originalTitle: normalized.originalTitle,
    year: normalized.year,
    overview: normalized.overview,
    posterUrl: normalized.posterUrl,
    backdropUrl: normalized.backdropUrl,
    imdbId: normalized.imdbId,
    tmdbId: normalized.tmdbId,
    anilistId: normalized.anilistId,
    tvdbId: normalized.tvdbId,
    malId: normalized.malId,
    kitsuId: normalized.kitsuId,
    traktId: normalized.traktId,
    countries: normalized.countries,
    runtimeMinutes: normalized.runtimeMinutes,
    episodeRuntimeMin: normalized.episodeRuntimeMin,
    episodeRuntimeMax: normalized.episodeRuntimeMax,
    seasonsCount: normalized.seasonsCount,
    episodesCount: normalized.episodesCount,
    seasonBreakdown: normalized.seasonBreakdown ?? null,
    isAdult: normalized.isAdult,
  })

  await mediaRepository.upsertMediaSource({
    mediaId: upsertedMedia.id,
    provider,
    externalId,
    rawJson: normalized.raw,
    normalizedJson: normalized,
    lastFetchedAt: now,
    expiresAt: new Date(now.getTime() + appEnv.externalCacheTtlSeconds * 1000),
  })
  await mediaRepository.replaceMediaGenres(upsertedMedia.id, normalized.genres)

  return upsertedMedia
}

export { type DecryptedUserKey } from './providers/registry'
