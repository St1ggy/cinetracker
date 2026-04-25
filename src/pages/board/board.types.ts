export type KanbanItem = {
  id: string
  mediaId: string
  status: string | null
  currentSeason?: number | null
  currentEpisode?: number | null
  /** Per–list-item season grid; drives effective episode total when set. */
  userSeasonBreakdown?: unknown
  seasonStructureSource?: 'CATALOG' | 'USER' | null
  ghost?: boolean
  media: {
    id: string
    title: string
    originalTitle?: string | null
    year: number | null
    posterUrl: string | null
    mediaType: string
    runtimeMinutes: number | null
    episodeRuntimeMin: number | null
    episodeRuntimeMax: number | null
    seasonsCount: number | null
    episodesCount: number | null
    seasonBreakdown?: unknown
    genres?: { genre: { id: string; slug: string; name: string } }[]
  }
}
