import { redirect } from '@sveltejs/kit'

import { getHomeList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

const MAX_WHEEL_CANDIDATES = 300

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    redirect(302, '/signin')
  }

  const [list, lists, genres] = await Promise.all([
    getHomeList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
    prisma.genre.findMany({ orderBy: { name: 'asc' } }),
  ])

  const items = await listsRepository.findItemsByListWithFilters({
    listId: list.id,
    limit: MAX_WHEEL_CANDIDATES,
    sort: 'added_desc',
  })

  return { list, lists, items, genres }
}
