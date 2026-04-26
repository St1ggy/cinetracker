// Kanban card + column: one source of truth for per-item minutes (watched / remaining / total).
import {
  type SeasonGridSource,
  displaySeasonGrid,
  effectiveEpisodicCounts,
  episodesInSeason,
  parseSeasonBreakdown,
} from './episodic-progress'

export type BoardItemForDuration = {
  status: string | null
  currentSeason?: number | null
  currentEpisode?: number | null
  userSeasonBreakdown?: unknown
  seasonStructureSource?: 'CATALOG' | 'USER' | null
  media: {
    mediaType: string
    runtimeMinutes: number | null
    episodeRuntimeMin: number | null
    episodeRuntimeMax: number | null
    seasonsCount: number | null
    episodesCount: number | null
    seasonBreakdown?: unknown
  }
}

const fallbackPerEpisodeMinutes = (mediaType: string): number => {
  if (mediaType === 'ANIME') return 24

  if (mediaType === 'TV') return 50

  return 90
}

const isEpisodic = (mediaType: string): boolean => mediaType === 'TV' || mediaType === 'ANIME'

const avgEpisodeRuntime = (m: BoardItemForDuration['media']): number => {
  if (m.episodeRuntimeMin != null && m.episodeRuntimeMax != null) {
    return Math.round((m.episodeRuntimeMin + m.episodeRuntimeMax) / 2)
  }

  return m.episodeRuntimeMin ?? m.episodeRuntimeMax ?? fallbackPerEpisodeMinutes(m.mediaType)
}

const totalEpisodesResolved = (item: BoardItemForDuration): number | null => {
  const { episodesCount: totalEp } = effectiveEpisodicCounts(
    item.media.seasonBreakdown,
    item.userSeasonBreakdown,
    item.seasonStructureSource,
    item.media.seasonsCount,
    item.media.episodesCount,
  )

  return totalEp
}

const boardSeasonSource = (item: BoardItemForDuration): SeasonGridSource =>
  item.seasonStructureSource == null ? 'AUTO' : item.seasonStructureSource

const seasonGridForItem = (item: BoardItemForDuration) => {
  const catalog = parseSeasonBreakdown(item.media.seasonBreakdown) ?? null
  const user = parseSeasonBreakdown(item.userSeasonBreakdown) ?? null

  return displaySeasonGrid(catalog, user, boardSeasonSource(item))
}

// Full episodes before `currentSeason` in the season grid, plus
// in the current season: `currentEpisode - 1` (we store the **next** episode
// to watch, matching “where I stopped” before S×E; so S5E14 = 4 prior seasons
// full + 13 completed in S5). If the grid is empty or S/E are missing, falls
// back to `currentEpisode` = cumulative watched (legacy flat mode).
export const cumulativeWatchedEpisodes = (item: BoardItemForDuration): number => {
  const { currentSeason, currentEpisode } = item
  const grid = seasonGridForItem(item)

  if (grid.length > 0 && currentSeason != null && currentSeason >= 1 && currentEpisode != null && currentEpisode >= 1) {
    const prior = grid.filter((row) => row.seasonNumber < currentSeason).reduce((sum, row) => sum + row.episodes, 0)

    const cap = episodesInSeason(grid, currentSeason)
    // Stored pair is the **next** episode to watch: S5E14 ⇒ 4 prior seasons + 13 done in S5.
    const inSeasonWatched =
      cap == null ? Math.max(0, currentEpisode - 1) : Math.min(Math.max(0, currentEpisode - 1), cap)

    return prior + inSeasonWatched
  }

  return currentEpisode ?? 0
}

const episodicWatchedMinutes = (
  status: string | null,
  totalEp: number | null,
  watchedEps: number,
  avg: number,
): number => {
  if (status === 'WATCHED') {
    const n = totalEp != null && totalEp > 0 ? totalEp : Math.max(watchedEps, 1)

    return n * avg
  }

  return watchedEps * avg
}

const episodicRemainingMinutes = (totalEp: number | null, watchedEps: number, avg: number): number => {
  const totalForRemaining = totalEp == null || totalEp < 0 ? 1 : totalEp
  const remaining = Math.max(0, totalForRemaining - watchedEps)

  return remaining * avg
}

const episodicTotalMinutes = (totalEp: number | null, avg: number): number => {
  if (totalEp == null) return avg

  if (totalEp <= 0) return 0

  return totalEp * avg
}

const episodicByKind = (
  status: string | null,
  kind: 'watched' | 'remaining' | 'total',
  { totalEp, watchedEps, avg }: { totalEp: number | null; watchedEps: number; avg: number },
): number => {
  if (kind === 'watched') {
    return episodicWatchedMinutes(status, totalEp, watchedEps, avg)
  }

  if (kind === 'remaining') {
    return episodicRemainingMinutes(totalEp, watchedEps, avg)
  }

  return episodicTotalMinutes(totalEp, avg)
}

// kind: watched = accumulated; remaining = left; total = full work length
export const boardItemDurationMinutes = (
  item: BoardItemForDuration,
  kind: 'watched' | 'remaining' | 'total',
): number => {
  const { media, status } = item
  const t = media.mediaType

  if (isEpisodic(t)) {
    const totalEp = totalEpisodesResolved(item)
    const watchedEps = cumulativeWatchedEpisodes(item)
    const avg = avgEpisodeRuntime(media)

    return episodicByKind(status, kind, { totalEp, watchedEps, avg })
  }

  return media.runtimeMinutes ?? fallbackPerEpisodeMinutes(t)
}
