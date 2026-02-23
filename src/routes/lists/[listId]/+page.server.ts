import { error } from '@sveltejs/kit'

import { canReadList } from '$lib/server/lists'
import { listItemsRepository, listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const session = await locals.auth()
  const token = url.searchParams.get('token')
  const list = await listsRepository.findWithMetaById(params.listId)

  if (!list) {
    throw error(404, 'List not found')
  }

  if (!canReadList(list, session?.user?.id, token)) {
    throw error(403, 'No access')
  }

  const items = await listItemsRepository.findByListId(list.id)

  const saved = session?.user?.id ? await listsRepository.isSavedByUser(session.user.id, list.id) : null

  const isOwner = session?.user?.id === list.ownerUserId
  const canAdd = isOwner || (token != null && token === list.shareToken && list.sharePermission === 'VIEW_AND_ADD')

  const listForClient = isOwner ? list : { ...list, shareToken: undefined }

  return {
    list: listForClient,
    items,
    isOwner,
    canAdd,
    isSaved: Boolean(saved),
    token,
  }
}
