import { redirect } from '@sveltejs/kit'

import { withMainList } from '$lib/server/lists'
import { listsRepository } from '$lib/server/repositories'
import { parseFiltersForSurface } from '$shared/lib/media-filters-surface'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    redirect(302, '/signin')
  }

  const [list, lists] = await Promise.all([
    withMainList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
  ])
  const filters = parseFiltersForSurface(url.searchParams, 'board')
  const ownedIds = new Set((lists ?? []).map((l) => l.id))
  const allListIds = (lists ?? []).map((l) => l.id)
  const selected = filters.listIds.filter((id) => ownedIds.has(id))
  const scopeListIds = selected.length > 0 ? selected : allListIds
  const boardCountryCodes = await listsRepository.findDistinctCountryCodesForListIds(scopeListIds)

  return { list, lists, filters, boardCountryCodes }
}
