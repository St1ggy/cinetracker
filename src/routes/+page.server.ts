import { getHomeList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'
import { dedupeGenresByCanonical } from '$shared/lib/genre-alias'
import { emptyMediaFiltersState, mediaFiltersToRepoParams } from '$shared/lib/media-filters'
import { parseFiltersForSurface } from '$shared/lib/media-filters-surface'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, parent, url }) => {
  const session = await locals.auth()
  const { genreAliasConfig } = await parent()

  if (!session?.user?.id) {
    return {
      authenticated: false,
      list: null,
      lists: [],
      items: [],
      listCountryCodes: [],
      filters: emptyMediaFiltersState(),
    }
  }

  const [list, lists] = await Promise.all([
    getHomeList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
  ])
  const filters = parseFiltersForSurface(url.searchParams, 'home')
  const repo = mediaFiltersToRepoParams(filters)

  const targetListId = filters.listId && lists.some((l) => l.id === filters.listId) ? filters.listId : list.id

  const displayList = lists.find((l) => l.id === targetListId) ?? list

  const [items, listCountryCodes] = await Promise.all([
    listsRepository.findItemsByListWithFilters({
      listId: targetListId,
      ...repo,
      sort: filters.sort || undefined,
      limit: 60,
    }),
    listsRepository.findDistinctCountryCodesForListIds([targetListId]),
  ])

  const allGenres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
  })

  return {
    authenticated: true,
    list: displayList,
    lists,
    items,
    listCountryCodes,
    genres: dedupeGenresByCanonical(allGenres, genreAliasConfig),
    filters,
  }
}
