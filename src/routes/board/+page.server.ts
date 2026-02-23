import { redirect } from '@sveltejs/kit'

import { withMainList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    redirect(302, '/signin')
  }

  const [list, lists] = await Promise.all([
    withMainList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
  ])

  return { list, lists }
}
