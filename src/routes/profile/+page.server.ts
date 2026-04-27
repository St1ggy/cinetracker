import { getRawAppGenreAliasJson } from '$lib/server/app-genre-aliases'
import { prisma } from '$lib/server/prisma'
import { listsRepository, usersRepository } from '$lib/server/repositories'
import { DEFAULT_GENRE_ALIAS_CONFIG } from '$shared/lib/genre-alias'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent()
  const { session } = parentData

  if (!session?.user?.id) {
    return {
      session,
      configuredProviders: [],
      authProviders: [],
      defaultListId: null,
      lists: [],
      genreAliasSettings: null,
      mainListIdWhenNoDefault: null,
    }
  }

  const fromDatabase = await getRawAppGenreAliasJson()
  const genreAliasSettings = fromDatabase ?? DEFAULT_GENRE_ALIAS_CONFIG

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
    session,
    configuredProviders: keys.map((k) => k.provider),
    authProviders: accounts.map((a) => a.provider),
    defaultListId: user?.defaultListId ?? null,
    lists: lists ?? [],
    genreAliasSettings,
    // When no default list is set, the "main" list is the first one; exclude it from dropdown to avoid duplicate
    mainListIdWhenNoDefault: !user?.defaultListId && (lists?.length ?? 0) > 0 ? lists![0].id : null,
  }
}
