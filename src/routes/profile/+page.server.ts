import { prisma } from '$lib/server/prisma'
import { listsRepository, usersRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    return { configuredProviders: [], authProviders: [], defaultListId: null, lists: [] }
  }

  const [keys, accounts, user, lists] = await Promise.all([
    prisma.userApiKey.findMany({
      where: { userId: session.user.id },
      select: { provider: true, updatedAt: true },
      orderBy: { provider: 'asc' },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    }),
    usersRepository.findByIdWithDefaultList(session.user.id),
    listsRepository.findOwnedWithCounts(session.user.id),
  ])

  return {
    configuredProviders: keys.map((k) => k.provider),
    authProviders: accounts.map((a) => a.provider),
    defaultListId: user?.defaultListId ?? null,
    lists: lists ?? [],
  }
}
