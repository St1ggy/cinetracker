import { type WatchStatus, WatchStatus as WatchStatusEnum } from '@prisma/client'

import { getHomeList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

const VALID_STATUSES = Object.values(WatchStatusEnum) as WatchStatus[]

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    return {
      authenticated: false,
      list: null,
      lists: [],
      items: [],
    }
  }

  const [list, lists] = await Promise.all([
    getHomeList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
  ])
  const q = url.searchParams.get('q') ?? ''
  const yearFrom = Number.parseInt(url.searchParams.get('yearFrom') ?? '', 10)
  const yearTo = Number.parseInt(url.searchParams.get('yearTo') ?? '', 10)
  const genre = url.searchParams.get('genre') ?? ''
  const statusParameter = url.searchParams.get('status') ?? ''
  const status = VALID_STATUSES.includes(statusParameter as WatchStatus) ? (statusParameter as WatchStatus) : null
  const sort = url.searchParams.get('sort') ?? ''

  const items = await listsRepository.findItemsByListWithFilters({
    listId: list.id,
    q: q || undefined,
    yearFrom: Number.isNaN(yearFrom) ? undefined : yearFrom,
    yearTo: Number.isNaN(yearTo) ? undefined : yearTo,
    genresFilter: genre ? [genre] : [],
    status: status ?? undefined,
    sort: sort || undefined,
    limit: 60,
  })

  const allGenres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
  })

  return {
    authenticated: true,
    list,
    lists,
    items,
    genres: allGenres,
    filters: {
      q,
      yearFrom: Number.isNaN(yearFrom) ? null : yearFrom,
      yearTo: Number.isNaN(yearTo) ? null : yearTo,
      genre: genre || null,
      status,
      sort: sort || null,
    },
  }
}
