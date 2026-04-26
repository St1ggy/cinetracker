/** If episode is set but season is not, for TV/ANIME the implied season is 1 (aligns with grid-aware progress). */
export const coalesceSeason1WhenEpisodeSet = (
  mediaType: string,
  currentSeason: number | null | undefined,
  currentEpisode: number | null | undefined,
): number | null | undefined => {
  if (mediaType !== 'TV' && mediaType !== 'ANIME') return currentSeason

  if (currentEpisode == null) return currentSeason

  if (currentSeason != null) return currentSeason

  return 1
}
