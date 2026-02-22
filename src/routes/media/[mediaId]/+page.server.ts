import { error } from '@sveltejs/kit'

import { listItemsRepository, mediaRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth()

  const [media, userItems] = await Promise.all([
    mediaRepository.findByIdWithDetails(params.mediaId),
    session?.user?.id ? listItemsRepository.findByUserAndMedia(session.user.id, params.mediaId) : Promise.resolve([]),
  ])

  if (!media) {
    throw error(404, 'Media not found')
  }

  return { media, userItems }
}
