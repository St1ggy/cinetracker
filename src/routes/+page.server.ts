import { type WatchStatus, WatchStatus as WatchStatusEnum } from '@prisma/client'

import { withMainList } from '$lib/server/lists'
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
      items: [],
    }
  }

  const list = await withMainList(session.user.id)
  const q = url.searchParams.get('q') ?? ''
  const yearFrom = Number.parseInt(url.searchParams.get('yearFrom') ?? '', 10)
  const yearTo = Number.parseInt(url.searchParams.get('yearTo') ?? '', 10)
  const genre = url.searchParams.get('genre') ?? ''
  const statusParameter = url.searchParams.get('status') ?? ''
  const status = VALID_STATUSES.includes(statusParameter as WatchStatus) ? (statusParameter as WatchStatus) : null

  const items = await listsRepository.findItemsByListWithFilters({
    listId: list.id,
    q: q || undefined,
    yearFrom: Number.isNaN(yearFrom) ? undefined : yearFrom,
    yearTo: Number.isNaN(yearTo) ? undefined : yearTo,
    genresFilter: genre ? [genre] : [],
    status: status ?? undefined,
    limit: 60,
  })

  const allGenres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
  })

  return {
    authenticated: true,
    list,
    items,
    genres: allGenres,
    filters: {
      q,
      yearFrom: Number.isNaN(yearFrom) ? null : yearFrom,
      yearTo: Number.isNaN(yearTo) ? null : yearTo,
      genre: genre || null,
      status,
    },
  }
}
