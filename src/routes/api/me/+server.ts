import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { requireSessionUser } from '$lib/server/lists'
import { usersRepository } from '$lib/server/repositories'

/* eslint-disable sonarjs/deprecation -- zod .uuid() deprecation in typings */
const patchMeSchema = z.object({
  defaultListId: z.string().uuid().nullable(),
})
/* eslint-enable sonarjs/deprecation */

export const GET = async ({ locals }) => {
  const session = await locals.auth()

  return json({
    user: session?.user ?? null,
  })
}

export const PATCH = async ({ locals, request }) => {
  const { id: userId } = await requireSessionUser(locals)
  const body = patchMeSchema.parse(await request.json())

  const updated = await usersRepository.updateDefaultListId(userId, body.defaultListId)

  if (!updated) {
    throw error(400, 'Invalid list')
  }

  return json({ defaultListId: updated.defaultListId })
}
