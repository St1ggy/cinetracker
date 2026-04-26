import { getGenreAliasConfig } from '$lib/server/app-genre-aliases'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.auth()
  const genreAliasConfig = await getGenreAliasConfig()

  return { session, genreAliasConfig }
}
