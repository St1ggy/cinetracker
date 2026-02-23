import { error, redirect } from '@sveltejs/kit'

import { listsRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const list = await listsRepository.findByShareToken(params.shareToken)

  if (!list) {
    throw error(404, 'List not found')
  }

  throw redirect(302, `/lists/${list.id}?token=${encodeURIComponent(params.shareToken)}`)
}
