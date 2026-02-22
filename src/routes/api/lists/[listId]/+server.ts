import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import {
  generateShareToken,
  parseVisibility,
  requireOwnerList,
  requireReadableList,
  requireSessionUser,
} from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listsRepository, tagsRepository } from '$lib/server/repositories'

const patchListSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).optional().nullable(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
  isAnonymous: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
})

export const GET = async ({ locals, params, url }) => {
  const session = await locals.auth()
  const token = url.searchParams.get('token')

  const list = await requireReadableList(params.listId, { userId: session?.user?.id, shareToken: token })
  const withMeta = await listsRepository.findWithMetaById(list.id)

  if (!withMeta) {
    throw error(404, 'List not found')
  }

  return json(withMeta)
}

export const PATCH = async ({ locals, params, request }) => {
  const user = await requireSessionUser(locals)
  const list = await requireOwnerList(params.listId, user.id)
  const payload = patchListSchema.parse(await request.json())

  const visibility = payload.visibility ? parseVisibility(payload.visibility) : undefined
  const isAnonymous = payload.isAnonymous

  // Require a handle when changing to PUBLIC (non-anonymous)
  const becomingPublic = visibility === 'PUBLIC' && list.visibility !== 'PUBLIC'

  if (becomingPublic && !isAnonymous) {
    const databaseUser = await prisma.user.findUnique({ where: { id: user.id }, select: { handle: true } })

    if (!databaseUser?.handle) {
      return json({ error: 'HANDLE_REQUIRED' }, { status: 400 })
    }
  }

  const shouldRotateTokenToUnlisted = visibility === 'UNLISTED' && !list.shareToken
  const clearToken = visibility === 'PUBLIC' || visibility === 'PRIVATE'
  let shareTokenUpdate: string | null | undefined

  if (shouldRotateTokenToUnlisted) {
    shareTokenUpdate = generateShareToken()
  } else if (clearToken) {
    shareTokenUpdate = null
  }

  const updated = await listsRepository.update(list.id, {
    title: payload.title,
    description: payload.description,
    visibility,
    isAnonymous,
    shareToken: shareTokenUpdate,
  })

  if (payload.tags !== undefined) {
    const createdTags = await tagsRepository.findOrCreateByNames(payload.tags)

    await listsRepository.setListTags(
      list.id,
      createdTags.map((t) => t.id),
    )
  }

  return json(updated)
}

export const DELETE = async ({ locals, params }) => {
  const user = await requireSessionUser(locals)
  const list = await requireOwnerList(params.listId, user.id)

  const mainCount = await listsRepository.countMainLists(user.id)

  if (list.title === 'Main' && mainCount === 1) {
    throw error(400, 'Main list cannot be deleted')
  }

  await listsRepository.delete(list.id)

  return new Response(null, { status: 204 })
}
