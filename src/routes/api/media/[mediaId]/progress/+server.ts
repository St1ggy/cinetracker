import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { listItemsRepository } from '$lib/server/repositories'
import { WATCH_STATUSES } from '$shared/config/domain'

const patchSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(WATCH_STATUSES).nullable(),
  currentSeason: z.number().int().positive().nullable().optional(),
  currentEpisode: z.number().int().positive().nullable().optional(),
})

export const PATCH = async ({ locals, params, request }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const body = patchSchema.parse(await request.json())

  const items = await listItemsRepository.findByUserAndMedia(session.user.id, params.mediaId)
  const item = items.find((index) => index.id === body.itemId)

  if (!item) throw error(404, 'Item not found or access denied')

  const updated = await listItemsRepository.updateById(body.itemId, {
    status: body.status,
    currentSeason: body.currentSeason ?? null,
    currentEpisode: body.currentEpisode ?? null,
  })

  return json(updated)
}
