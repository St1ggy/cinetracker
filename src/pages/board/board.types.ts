export type KanbanItem = {
  id: string
  status: string | null
  currentSeason?: number | null
  currentEpisode?: number | null
  ghost?: boolean
  media: {
    id: string
    title: string
    year: number | null
    posterUrl: string | null
    mediaType: string
    runtimeMinutes: number | null
    episodeRuntimeMin: number | null
    episodeRuntimeMax: number | null
    episodesCount: number | null
  }
}
