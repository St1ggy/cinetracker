import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { requireSessionUser } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository, listsRepository } from '$lib/server/repositories'
import { WATCH_STATUSES } from '$shared/config/domain'

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

  const rawItems = await listsRepository.findItemsByListIds(listIds)

  const merged = mergeItemsByMedia(rawItems)

  const items = merged.map((item) => ({
    id: item.id,
    mediaId: item.mediaId,
    status: item.status,
    currentSeason: item.currentSeason,
    currentEpisode: item.currentEpisode,
    media: item.media,
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

  const itemsToUpdate = await prisma.listItem.findMany({
    where: {
      listId: { in: body.listIds },
      mediaId: body.mediaId,
    },
    select: { id: true },
  })

  for (const { id } of itemsToUpdate) {
    await listItemsRepository.updateById(id, {
      status: body.status ?? undefined,
      currentSeason: body.currentSeason ?? undefined,
      currentEpisode: body.currentEpisode ?? undefined,
    })
  }

  return json({ updated: itemsToUpdate.length })
}
