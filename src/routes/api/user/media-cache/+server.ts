import { error, json } from '@sveltejs/kit'

import { prisma } from '$lib/server/prisma'

export const DELETE = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const userId = session.user.id

  const items = await prisma.listItem.findMany({
    where: { list: { ownerUserId: userId } },
    select: { mediaId: true },
    distinct: ['mediaId'],
  })

  const mediaIds = items.map((index) => index.mediaId)

  if (mediaIds.length > 0) {
    await prisma.media.updateMany({
      where: { id: { in: mediaIds } },
      data: { enrichedAt: null },
    })
  }

  return json({ count: mediaIds.length })
}
