import { redirect } from '@sveltejs/kit'

import { getLocale } from '$lib/paraglide/runtime'
import { getHomeList } from '$lib/server/lists'
import { localizeBoardMedia } from '$lib/server/localized-media'
import { resolveGenreDisplayNameFromRows } from '$lib/server/media-i18n'
import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'
import { dedupeGenresByCanonical } from '$shared/lib/genre-alias'
import { mediaFiltersToRepoParams } from '$shared/lib/media-filters'
import { parseFiltersForSurface } from '$shared/lib/media-filters-surface'
import { getAdaptiveDefaultStatuses } from '$shared/lib/wheel-adaptive-statuses'

import type { PageServerLoad } from './$types'

const MAX_WHEEL_CANDIDATES = 300

export const load: PageServerLoad = async ({ locals, parent, url }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    redirect(302, '/signin')
  }

  const { genreAliasConfig } = await parent()
  const loc = getLocale()
  const [list, lists, genresRaw] = await Promise.all([
    getHomeList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
    prisma.genre.findMany({ orderBy: { name: 'asc' }, include: { i18n: true } }),
  ])

  const filters = parseFiltersForSurface(url.searchParams, 'wheel')
  const repo = mediaFiltersToRepoParams(filters)

  const targetListId = filters.listId && lists.some((l) => l.id === filters.listId) ? filters.listId : list.id

  const listCountryCodes = await listsRepository.findDistinctCountryCodesForListIds([targetListId])

  let itemsRaw

  if (repo.statuses?.length) {
    itemsRaw = await listsRepository.findItemsByListWithFilters({
      listId: targetListId,
      ...repo,
      sort: filters.sort || 'added_desc',
      limit: MAX_WHEEL_CANDIDATES,
    })
  } else {
    const preview = await listsRepository.findItemsByListWithFilters({
      listId: targetListId,
      ...repo,
      statuses: undefined,
      sort: filters.sort || 'added_desc',
      limit: MAX_WHEEL_CANDIDATES,
    })
    const adaptive = getAdaptiveDefaultStatuses(preview)

    itemsRaw =
      adaptive.length > 0
        ? await listsRepository.findItemsByListWithFilters({
            listId: targetListId,
            ...repo,
            statuses: adaptive,
            sort: filters.sort || 'added_desc',
            limit: MAX_WHEEL_CANDIDATES,
          })
        : preview
  }

  const items = itemsRaw.map((item) => ({ ...item, media: localizeBoardMedia(item.media, loc) }))
  const genres = dedupeGenresByCanonical(
    genresRaw.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: resolveGenreDisplayNameFromRows({ name: g.name, slug: g.slug }, g.i18n, loc),
    })),
    genreAliasConfig,
  )

  return { list, lists, items, genres, filters, listCountryCodes }
}
