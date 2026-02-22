import { redirect } from '@sveltejs/kit'

import { withMainList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    throw redirect(302, '/')
  }

  await withMainList(session.user.id)

  const [ownedLists, savedLists] = await Promise.all([
    listsRepository.findOwnedWithCounts(session.user.id),
    listsRepository.findSavedWithDetails(session.user.id),
  ])

  return {
    ownedLists,
    savedLists,
  }
}
