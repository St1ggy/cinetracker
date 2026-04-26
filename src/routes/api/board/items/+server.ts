import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { getLocale } from '$lib/paraglide/runtime'
import { coalesceSeason1WhenEpisodeSet } from '$lib/server/coalesce-episodic-season'
import { requireSessionUser } from '$lib/server/lists'
import { localizeBoardMedia } from '$lib/server/localized-media'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository, listsRepository } from '$lib/server/repositories'
import { assertEpisodicProgressPayload } from '$lib/server/validate-episodic-payload'
import { WATCH_STATUSES } from '$shared/config/domain'
import { mediaFiltersToRepoParams } from '$shared/lib/media-filters'
import { parseFiltersForSurface } from '$shared/lib/media-filters-surface'

import type { WatchStatus } from '@prisma/client'

const statusPriority: Record<WatchStatus, number> = {
  WATCHED: 2,
  IN_PROGRESS: 1,
  PLAN_TO_WATCH: 0,
}

/** Pick one representative list item per mediaId: highest status, then max progress. */
function mergeItemsByMedia<
  T extends {
    id: string
    mediaId: string
    status: WatchStatus | null
    currentEpisode?: number | null
    currentSeason?: number | null
  },
>(rows: T[]): T[] {
  const byMedia = new Map<string, T[]>()

  for (const row of rows) {
    const key = row.mediaId

    if (!byMedia.has(key)) byMedia.set(key, [])

    byMedia.get(key)!.push(row)
  }

  const result: T[] = []

  for (const group of byMedia.values()) {
    const best = group.toSorted((a, b) => {
      const pa = statusPriority[(a.status as WatchStatus) ?? 'PLAN_TO_WATCH']
      const pb = statusPriority[(b.status as WatchStatus) ?? 'PLAN_TO_WATCH']

      if (pb !== pa) return pb - pa

      const epA = a.currentEpisode ?? 0
      const epB = b.currentEpisode ?? 0

      if (epB !== epA) return epB - epA

      const sA = a.currentSeason ?? 0
      const sB = b.currentSeason ?? 0

      return sB - sA
    })[0]

    result.push(best)
  }

  return result
}

const listIdsSchema = z
  .string()
  .optional()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )

export const GET = async ({ locals, url }) => {
  const { id: userId } = await requireSessionUser(locals)
  const listIdsParameter = url.searchParams.get('listIds')
  const listIds = listIdsSchema.parse(listIdsParameter ?? '')

  if (listIds.length === 0) {
    throw error(400, 'listIds required')
  }

  const lists = await listsRepository.findManyByIds(listIds)

  const notFound = listIds.filter((id) => !lists.some((l) => l.id === id))

  if (notFound.length > 0) {
    throw error(404, 'List not found')
  }

  const notOwned = lists.filter((l) => l.ownerUserId !== userId)

  if (notOwned.length > 0) {
    throw error(403, 'Only own lists can be used')
  }

  const filterState = parseFiltersForSurface(url.searchParams, 'board')
  const repo = mediaFiltersToRepoParams(filterState)

  const rawItems = await listsRepository.findItemsByListIds(listIds, { ...repo, limit: 1000 })

  const merged = mergeItemsByMedia(rawItems)

  const loc = getLocale()
  const items = merged.map((item) => ({
    id: item.id,
    mediaId: item.mediaId,
    status: item.status,
    currentSeason: item.currentSeason,
    currentEpisode: item.currentEpisode,
    userSeasonBreakdown: item.userSeasonBreakdown,
    seasonStructureSource: item.seasonStructureSource,
    media: localizeBoardMedia(item.media, loc),
  }))

  return json({ items })
}

/* eslint-disable sonarjs/deprecation -- zod .uuid() deprecation in typings */
const patchSchema = z.object({
  mediaId: z.string().uuid(),
  listIds: z.array(z.string().uuid()).min(1),
  status: z.enum(WATCH_STATUSES).optional().nullable(),
  currentSeason: z.number().int().positive().optional().nullable(),
  currentEpisode: z.number().int().positive().optional().nullable(),
})
/* eslint-enable sonarjs/deprecation */

export const PATCH = async ({ locals, request }) => {
  const { id: userId } = await requireSessionUser(locals)
  const body = patchSchema.parse(await request.json())

  const lists = await listsRepository.findManyByIds(body.listIds)
  const notOwned = lists.filter((l) => l.ownerUserId !== userId)

  if (notOwned.length > 0 || lists.length !== body.listIds.length) {
    throw error(403, 'Only own lists can be updated')
  }

  const media = await prisma.media.findUnique({
    where: { id: body.mediaId },
    select: { mediaType: true },
  })

  const coalescedSeason = coalesceSeason1WhenEpisodeSet(
    media?.mediaType ?? 'OTHER',
    body.currentSeason ?? null,
    body.currentEpisode ?? null,
  )

  const itemsToUpdate = await prisma.listItem.findMany({
    where: {
      listId: { in: body.listIds },
      mediaId: body.mediaId,
    },
    select: { id: true },
  })

  if (body.status != null) {
    for (const { id } of itemsToUpdate) {
      await assertEpisodicProgressPayload(
        id,
        body.mediaId,
        body.status,
        coalescedSeason ?? null,
        body.currentEpisode ?? null,
      )
    }
  }

  for (const { id } of itemsToUpdate) {
    await listItemsRepository.updateById(id, {
      status: body.status ?? undefined,
      currentSeason: coalescedSeason ?? body.currentSeason ?? undefined,
      currentEpisode: body.currentEpisode ?? undefined,
    })
  }

  return json({ updated: itemsToUpdate.length })
}
