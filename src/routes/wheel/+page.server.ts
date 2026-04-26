import { redirect } from '@sveltejs/kit'

import { getLocale } from '$lib/paraglide/runtime'
import { getHomeList } from '$lib/server/lists'
import { localizeBoardMedia } from '$lib/server/localized-media'
import { resolveGenreDisplayNameFromRows } from '$lib/server/media-i18n'
import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

const MAX_WHEEL_CANDIDATES = 300

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    redirect(302, '/signin')
  }

  const loc = getLocale()
  const [list, lists, genresRaw] = await Promise.all([
    getHomeList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
    prisma.genre.findMany({ orderBy: { name: 'asc' }, include: { i18n: true } }),
  ])

  const itemsRaw = await listsRepository.findItemsByListWithFilters({
    listId: list.id,
    limit: MAX_WHEEL_CANDIDATES,
    sort: 'added_desc',
  })

  const items = itemsRaw.map((item) => ({ ...item, media: localizeBoardMedia(item.media, loc) }))
  const genres = genresRaw.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: resolveGenreDisplayNameFromRows({ name: g.name, slug: g.slug }, g.i18n, loc),
  }))

  return { list, lists, items, genres }
}
