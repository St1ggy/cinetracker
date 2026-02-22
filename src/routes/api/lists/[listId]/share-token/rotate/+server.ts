import { error, json } from '@sveltejs/kit'

import { generateShareToken, requireOwnerList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'

export const POST = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    throw error(401, 'Authentication required')
  }

  await requireOwnerList(params.listId, session.user.id)
  const list = await listsRepository.update(params.listId, {
    visibility: 'UNLISTED',
    shareToken: generateShareToken(),
  })

  if (!list) {
    throw error(404, 'List not found')
  }

  return json({
    shareToken: list.shareToken,
  })
}
