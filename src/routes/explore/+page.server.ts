import { listsRepository, tagsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? undefined
  const tags = url.searchParams.getAll('tag')
  const cursor = url.searchParams.get('cursor') ?? undefined
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'popular' | 'top_rated'

  const [lists, popularTags] = await Promise.all([
    listsRepository.findPublicWithFilters({ q, tags, sort, cursor, limit: 24 }),
    tagsRepository.findPopular(20),
  ])

  return {
    lists,
    popularTags,
    filters: { q, tags, sort },
  }
}
