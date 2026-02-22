import { json } from '@sveltejs/kit'

import { tagsRepository } from '$lib/server/repositories'

export const GET = async ({ url }) => {
  const q = url.searchParams.get('q') ?? ''
  const tags = await tagsRepository.search(q, 15)

  return json({ tags })
}
