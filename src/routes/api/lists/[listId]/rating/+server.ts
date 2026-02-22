import { json } from '@sveltejs/kit'
import { z } from 'zod'

import { requireSessionUser } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listRatingsRepository, listsRepository } from '$lib/server/repositories'

const rateSchema = z.object({
  value: z.number().int().min(1).max(5),
})

export const GET = async ({ params }) => {
  const aggregate = await listRatingsRepository.getAggregateForList(params.listId)

  return json(aggregate)
}

export const POST = async ({ locals, params, request }) => {
  const user = await requireSessionUser(locals)

  const list = await listsRepository.findById(params.listId)

  if (!list || (list.visibility === 'PRIVATE' && list.ownerUserId !== user.id)) {
    return json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  if (list.ownerUserId === user.id) {
    return json({ error: 'CANNOT_RATE_OWN_LIST' }, { status: 400 })
  }

  const databaseUser = await prisma.user.findUnique({ where: { id: user.id }, select: { handle: true } })

  if (!databaseUser?.handle) {
    return json({ error: 'HANDLE_REQUIRED' }, { status: 400 })
  }

  const { value } = rateSchema.parse(await request.json())
  const rating = await listRatingsRepository.upsert(params.listId, user.id, value)

  return json(rating, { status: 201 })
}

export const DELETE = async ({ locals, params }) => {
  const user = await requireSessionUser(locals)

  await listRatingsRepository.remove(params.listId, user.id)

  return new Response(null, { status: 204 })
}
