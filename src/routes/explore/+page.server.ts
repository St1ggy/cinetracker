import { redirect } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  const search = url.search ?? ''
  const rest = search ? search.replace(/^\?/, '') : ''
  const target = rest ? `/lists?view=all&${rest}` : '/lists?view=all'

  redirect(302, target)
}
