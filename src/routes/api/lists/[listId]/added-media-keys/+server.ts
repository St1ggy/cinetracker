import { json } from '@sveltejs/kit'

import { requireReadableList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'

// Returns all provider:externalId keys for media already in the list.
// Used by the add-media modal to show which search results are already added.
export const GET = async ({ locals, params, url }) => {
  const session = await locals.auth()
  const token = url.searchParams.get('token')

  await requireReadableList(params.listId, {
    userId: session?.user?.id,
    shareToken: token,
  })

  const items = await prisma.listItem.findMany({
    where: { listId: params.listId },
    select: {
      media: {
        select: {
          sources: {
            select: { provider: true, externalId: true },
          },
        },
      },
    },
  })

  const keys = new Set<string>()

  for (const { media } of items) {
    for (const source of media.sources) {
      keys.add(`${source.provider}:${source.externalId}`)
    }
  }

  return json({ keys: [...keys] })
}
