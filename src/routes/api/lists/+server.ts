import { json } from '@sveltejs/kit'
import { z } from 'zod'

import { parseVisibility, requireSessionUser, withMainList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listsRepository, tagsRepository } from '$lib/server/repositories'

const createListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional().nullable(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
  isAnonymous: z.boolean().optional().default(false),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional().default([]),
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
  const isAnonymous = payload.isAnonymous ?? false

  // Require a handle for non-anonymous public lists
  if (visibility === 'PUBLIC' && !isAnonymous) {
    const databaseUser = await prisma.user.findUnique({ where: { id: user.id }, select: { handle: true } })

    if (!databaseUser?.handle) {
      return json({ error: 'HANDLE_REQUIRED' }, { status: 400 })
    }
  }

  const list = await listsRepository.create({
    ownerUserId: user.id,
    title: payload.title,
    description: payload.description ?? null,
    visibility,
    isAnonymous,
    shareToken: visibility === 'UNLISTED' ? crypto.randomUUID().replaceAll('-', '') : null,
  })

  if (payload.tags && payload.tags.length > 0) {
    const createdTags = await tagsRepository.findOrCreateByNames(payload.tags)

    await listsRepository.setListTags(
      list.id,
      createdTags.map((t) => t.id),
    )
  }

  return json(list, { status: 201 })
}
