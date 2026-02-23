import { error } from '@sveltejs/kit'
import { z } from 'zod'

import { requireOwnerList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository } from '$lib/server/repositories'
import { WATCH_STATUSES } from '$shared/config/domain'

const patchSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
  rating: z.number().int().min(1).max(10).optional().nullable(),
  status: z.enum(WATCH_STATUSES).optional().nullable(),
  currentSeason: z.number().int().positive().optional().nullable(),
  currentEpisode: z.number().int().positive().optional().nullable(),
})

export const PATCH = async ({ locals, params, request }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  await requireOwnerList(params.listId, session.user.id)
  const payload = patchSchema.parse(await request.json())

  if (payload.currentEpisode !== undefined) {
    const item = await prisma.listItem.findUnique({
      where: { id: params.itemId },
      select: {
        listId: true,
        media: {
          select: {
            mediaType: true,
          },
        },
      },
    })

    if (!item || item.listId !== params.listId) {
      throw error(404, 'Item not found')
    }

    if (payload.currentEpisode !== null && item.media.mediaType !== 'TV' && item.media.mediaType !== 'ANIME') {
      throw error(400, 'Episode progress can be set only for TV or ANIME media')
    }
  }

  const updated = await listItemsRepository.updateById(params.itemId, {
    notes: payload.notes,
    rating: payload.rating,
    status: payload.status,
    currentSeason: payload.currentSeason,
    currentEpisode: payload.currentEpisode,
  })

  return Response.json(updated)
}

export const DELETE = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  await requireOwnerList(params.listId, session.user.id)
  await listItemsRepository.deleteById(params.itemId)

  return new Response(null, { status: 204 })
}
