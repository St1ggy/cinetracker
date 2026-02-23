import { prisma } from '$lib/server/prisma'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    return { configuredProviders: [], authProviders: [] }
  }

  const [keys, accounts] = await Promise.all([
    prisma.userApiKey.findMany({
      where: { userId: session.user.id },
      select: { provider: true, updatedAt: true },
      orderBy: { provider: 'asc' },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    }),
  ])

  return {
    configuredProviders: keys.map((k) => k.provider),
    authProviders: accounts.map((a) => a.provider),
  }
}
