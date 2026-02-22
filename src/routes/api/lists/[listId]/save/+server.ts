import { error } from '@sveltejs/kit'

import { canReadList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'

export const POST = async ({ locals, params, url }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const list = await listsRepository.findById(params.listId)

  if (!list) throw error(404, 'List not found')

  if (list.ownerUserId === session.user.id) throw error(400, 'Cannot save your own list')

  const token = url.searchParams.get('token')

  if (!canReadList(list, session.user.id, token)) {
    throw error(403, 'No access to this list')
  }

  await listsRepository.saveForeignList(session.user.id, list.id)

  return new Response(null, { status: 204 })
}

export const DELETE = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  await listsRepository.unsaveForeignList(session.user.id, params.listId)

  return new Response(null, { status: 204 })
}
