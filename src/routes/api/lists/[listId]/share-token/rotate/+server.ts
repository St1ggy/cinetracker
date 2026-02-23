import { error, json } from '@sveltejs/kit'

import { generateShareToken, requireOwnerList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'

export const POST = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    throw error(401, 'Authentication required')
  }

  const list = await requireOwnerList(params.listId, session.user.id)

  if (!list.shareToken) {
    throw error(400, 'List has no share link to rotate')
  }

  const updated = await listsRepository.update(params.listId, {
    shareToken: generateShareToken(),
  })

  if (!updated) {
    throw error(404, 'List not found')
  }

  return json({
    shareToken: updated.shareToken,
  })
}
