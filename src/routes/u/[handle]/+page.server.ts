import { error } from '@sveltejs/kit'

import { usersRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const profile = await usersRepository.findPublicProfile(params.handle)

  if (!profile) {
    throw error(404, 'User not found')
  }

  return { profile }
}
