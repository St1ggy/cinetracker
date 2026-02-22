import { json } from '@sveltejs/kit'
import { z } from 'zod'

import { parseVisibility, requireSessionUser, withMainList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'

const createListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional().nullable(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
})

export const GET = async ({ locals }) => {
  const user = await requireSessionUser(locals)

  await withMainList(user.id)

  const [ownedLists, savedLists] = await Promise.all([
    listsRepository.findOwnedWithCounts(user.id),
    listsRepository.findSavedWithDetails(user.id),
  ])

  return json({
    ownedLists,
    savedLists: savedLists.map((entry) => ({ ...entry.list, savedAt: entry.savedAt, saved: true })),
  })
}

export const POST = async ({ locals, request }) => {
  const user = await requireSessionUser(locals)
  const payload = createListSchema.parse(await request.json())

  const visibility = parseVisibility(payload.visibility) ?? 'PRIVATE'
  const list = await listsRepository.create({
    ownerUserId: user.id,
    title: payload.title,
    description: payload.description ?? null,
    visibility,
    shareToken: visibility === 'UNLISTED' ? crypto.randomUUID().replaceAll('-', '') : null,
  })

  return json(list, { status: 201 })
}
