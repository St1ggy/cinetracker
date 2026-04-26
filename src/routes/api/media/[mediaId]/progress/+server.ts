import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { coalesceSeason1WhenEpisodeSet } from '$lib/server/coalesce-episodic-season'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository } from '$lib/server/repositories'
import { assertEpisodicProgressPayload } from '$lib/server/validate-episodic-payload'
import { WATCH_STATUSES } from '$shared/config/domain'

const seasonRow = z.object({
  seasonNumber: z.number().int().min(1).max(9999),
  episodes: z.number().int().min(1).max(9999),
})

/* eslint-disable sonarjs/deprecation -- zod .uuid() deprecation in typings */
const patchSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(WATCH_STATUSES).nullable(),
  currentSeason: z.number().int().positive().nullable().optional(),
  currentEpisode: z.number().int().positive().nullable().optional(),
  userSeasonBreakdown: z.array(seasonRow).max(200).nullable().optional(),
  /** `AUTO` or `null` clears DB → auto behavior */
  seasonStructureSource: z.enum(['CATALOG', 'USER', 'AUTO']).nullable().optional(),
})
/* eslint-enable sonarjs/deprecation */

export const PATCH = async ({ locals, params, request }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const body = patchSchema.parse(await request.json())

  const items = await listItemsRepository.findByUserAndMedia(session.user.id, params.mediaId)
  const item = items.find((index) => index.id === body.itemId)

  if (!item) throw error(404, 'Item not found or access denied')

  let coercedUserBreakdown: typeof body.userSeasonBreakdown | null | undefined

  if (body.userSeasonBreakdown === undefined) {
    coercedUserBreakdown = undefined
  } else if (body.userSeasonBreakdown == null) {
    coercedUserBreakdown = null
  } else if (body.userSeasonBreakdown.length === 0) {
    coercedUserBreakdown = null
  } else {
    coercedUserBreakdown = body.userSeasonBreakdown
  }

  const sourceForAssert = (() => {
    if (body.seasonStructureSource === undefined) {
      return
    }

    if (body.seasonStructureSource == null || body.seasonStructureSource === 'AUTO') {
      return 'AUTO' as const
    }

    return body.seasonStructureSource
  })()

  const media = await prisma.media.findUnique({
    where: { id: params.mediaId },
    select: { mediaType: true },
  })

  const coalescedSeason = coalesceSeason1WhenEpisodeSet(
    media?.mediaType ?? 'OTHER',
    body.currentSeason ?? null,
    body.currentEpisode ?? null,
  )

  let databaseSource: 'CATALOG' | 'USER' | null | undefined

  if (body.seasonStructureSource === undefined) {
    databaseSource = undefined
  } else if (body.seasonStructureSource == null || body.seasonStructureSource === 'AUTO') {
    databaseSource = null
  } else {
    databaseSource = body.seasonStructureSource
  }

  await assertEpisodicProgressPayload(
    body.itemId,
    params.mediaId,
    body.status,
    coalescedSeason ?? null,
    body.currentEpisode ?? null,
    coercedUserBreakdown,
    sourceForAssert,
  )

  const updated = await listItemsRepository.updateById(body.itemId, {
    status: body.status,
    currentSeason: coalescedSeason ?? null,
    currentEpisode: body.currentEpisode ?? null,
    ...(coercedUserBreakdown === undefined ? {} : { userSeasonBreakdown: coercedUserBreakdown }),
    ...(databaseSource === undefined ? {} : { seasonStructureSource: databaseSource }),
  })

  return json(updated)
}
