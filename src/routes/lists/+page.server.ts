import { withMainList } from '$lib/server/lists'
import { listsRepository, tagsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth()

  const q = url.searchParams.get('q') ?? undefined
  const tags = url.searchParams.getAll('tag')
  const cursor = url.searchParams.get('cursor') ?? undefined
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'popular' | 'top_rated'

  const [publicResult, ownedLists, savedLists] = await Promise.all([
    listsRepository.findPublicWithFilters({ q, tags, sort, cursor, limit: 24 }),
    session?.user?.id
      ? (async () => {
          await withMainList(session.user!.id!)

          return listsRepository.findOwnedWithCounts(session.user!.id!)
        })()
      : Promise.resolve([]),
    session?.user?.id ? listsRepository.findSavedWithDetails(session.user.id) : Promise.resolve([]),
  ])

  const popularTags = await tagsRepository.findPopular(20)

  return {
    lists: publicResult,
    popularTags,
    filters: { q, tags, sort },
    ownedLists,
    savedLists,
  }
}
