import { error, json } from '@sveltejs/kit'

import { prisma } from '$lib/server/prisma'

export const DELETE = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const userId = session.user.id

  await prisma.user.delete({ where: { id: userId } })

  return json({ success: true })
}
