import { error } from '@sveltejs/kit'

import { prisma } from '$lib/server/prisma'
import {
  type SeasonGridSource,
  displaySeasonGrid,
  isStructureKnown,
  parseSeasonBreakdown,
  validateEpisodicProgress,
} from '$shared/lib/episodic-progress'

import type { SeasonStructureSource } from '@prisma/client'

const validatePair = (rows: { seasonNumber: number; episodes: number }[] | null, season: number, episode: number) => {
  const structureKnown = isStructureKnown(rows)
  const result = validateEpisodicProgress({ structureKnown, seasons: rows, season, episode })

  if (!result.ok) {
    error(400, 'Invalid season or episode for this title')
  }
}

const resolveSource = (
  database: SeasonStructureSource | null,
  body: SeasonGridSource | undefined,
): SeasonGridSource => {
  if (body !== undefined) {
    return body === 'AUTO' ? 'AUTO' : body
  }

  if (database == null) {
    return 'AUTO'
  }

  if (database === 'CATALOG') {
    return 'CATALOG'
  }

  if (database === 'USER') {
    return 'USER'
  }

  return 'AUTO'
}

/** Resolves `user` rows the same way as the progress PATCH: body override vs list item. */
const resolveUserRows = (
  bodyUserSeason: unknown | undefined,
  listItemUser: unknown | null,
): { seasonNumber: number; episodes: number }[] | null => {
  if (bodyUserSeason !== undefined) {
    if (bodyUserSeason === null) {
      return null
    }

    return parseSeasonBreakdown(bodyUserSeason)
  }

  return parseSeasonBreakdown(listItemUser) ?? null
}

/** When status is IN_PROGRESS, season/episode must be both set or both null; if set, must match the chosen grid. */
export const assertEpisodicProgressPayload = async (
  itemId: string,
  mediaId: string,
  status: string | null | undefined,
  currentSeason: number | null | undefined,
  currentEpisode: number | null | undefined,
  bodyUserSeason?: unknown,
  bodySeasonSource?: SeasonGridSource,
) => {
  if (status !== 'IN_PROGRESS') {
    return
  }

  const hasS = currentSeason != null
  const hasE = currentEpisode != null

  if (hasS !== hasE) {
    error(400, 'Season and episode must both be set, or both cleared, for in-progress items')
  }

  if (!hasS || !hasE) {
    return
  }

  const [item, media] = await Promise.all([
    prisma.listItem.findUnique({
      where: { id: itemId },
      select: { userSeasonBreakdown: true, seasonStructureSource: true },
    }),
    prisma.media.findUnique({
      where: { id: mediaId },
      select: { seasonBreakdown: true },
    }),
  ])

  if (!item) {
    error(404, 'List item not found')
  }

  if (!media) {
    error(404, 'Media not found')
  }

  const catalog = parseSeasonBreakdown(media.seasonBreakdown) ?? null
  const userRows = resolveUserRows(bodyUserSeason, item.userSeasonBreakdown)
  const source = resolveSource(item.seasonStructureSource, bodySeasonSource)
  const grid = displaySeasonGrid(catalog, userRows, source)

  validatePair(grid, currentSeason, currentEpisode)
}
