import { type ListVisibility, type MediaType, Prisma, type SharePermission, type WatchStatus } from '@prisma/client'

import { getGenreAliasConfig } from '$lib/server/app-genre-aliases'
import { prisma } from '$lib/server/prisma'
import { type GenreAliasConfig, expandGenreSlugsForQuery } from '$shared/lib/genre-alias'

type ListMediaFilterParams = {
  q?: string
  yearFrom?: number
  yearTo?: number
  genresFilter?: string[]
  genreMatchMode?: 'and' | 'or'
  types?: MediaType[]
  cast?: string[]
  durationFrom?: number
  durationTo?: number
  countries?: string[]
}

const appendGenreClauses = (
  clauses: Prisma.MediaWhereInput[],
  rawGenreSlugs: string[],
  genreMode: 'and' | 'or',
  genreConfig: GenreAliasConfig,
) => {
  if (rawGenreSlugs.length === 0) return

  if (genreMode === 'and') {
    for (const raw of rawGenreSlugs) {
      const expanded = expandGenreSlugsForQuery([raw], genreConfig)

      clauses.push({
        genres: {
          some: {
            genre: { slug: { in: expanded } },
          },
        },
      })
    }

    return
  }

  const expanded = expandGenreSlugsForQuery(rawGenreSlugs, genreConfig)

  clauses.push({
    genres: {
      some: {
        genre: {
          slug: { in: expanded },
        },
      },
    },
  })
}

const appendYearAndDurationClauses = (clauses: Prisma.MediaWhereInput[], params: ListMediaFilterParams) => {
  const hasYearFrom = params.yearFrom !== undefined
  const hasYearTo = params.yearTo !== undefined

  if (hasYearFrom || hasYearTo) {
    clauses.push({
      year: {
        ...(hasYearFrom ? { gte: params.yearFrom } : {}),
        ...(hasYearTo ? { lte: params.yearTo } : {}),
      },
    })
  }

  const hasDurationFrom = params.durationFrom !== undefined
  const hasDurationTo = params.durationTo !== undefined

  if (hasDurationFrom || hasDurationTo) {
    const range: { gte?: number; lte?: number } = {
      ...(hasDurationFrom ? { gte: params.durationFrom } : {}),
      ...(hasDurationTo ? { lte: params.durationTo } : {}),
    }

    clauses.push({
      OR: [{ runtimeMinutes: range }, { episodeRuntimeMin: range }],
    })
  }
}

const buildMediaWhereForListFilters = (
  params: ListMediaFilterParams,
  genreConfig: GenreAliasConfig,
): Prisma.MediaWhereInput => {
  const clauses: Prisma.MediaWhereInput[] = []
  const genreSlugs = (params.genresFilter ?? []).map((genre) => genre.toLowerCase().replaceAll(' ', '-'))
  const castFilters = params.cast ?? []
  const genreMode = params.genreMatchMode ?? 'or'

  if (params.q) {
    const qv = params.q

    clauses.push({
      OR: [
        { title: { contains: qv, mode: 'insensitive' } },
        { i18n: { some: { title: { contains: qv, mode: 'insensitive' } } } },
      ],
    })
  }

  appendYearAndDurationClauses(clauses, params)

  if ((params.types?.length ?? 0) > 0) {
    clauses.push({ mediaType: { in: params.types } })
  }

  appendGenreClauses(clauses, genreSlugs, genreMode, genreConfig)

  if (castFilters.length > 0) {
    clauses.push({
      OR: castFilters.map((castName) => ({
        cast: {
          some: {
            person: {
              name: {
                contains: castName,
                mode: 'insensitive',
              },
            },
          },
        },
      })),
    })
  }

  if ((params.countries?.length ?? 0) > 0) {
    clauses.push({
      countries: { hasSome: params.countries },
    })
  }

  if (clauses.length === 0) return {}

  if (clauses.length === 1) return clauses[0]!

  return { AND: clauses }
}

const listItemStatusWhere = (statuses?: WatchStatus[]): Prisma.ListItemWhereInput => {
  if (statuses && statuses.length > 0) {
    return { status: { in: statuses } }
  }

  return {}
}

const listItemsInclude = {
  media: {
    include: {
      i18n: true,
      genres: {
        include: {
          genre: { include: { i18n: true } },
        },
      },
    },
  },
} as const

const buildOrderBy = (sort?: string): Prisma.ListItemOrderByWithRelationInput[] => {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (sort) {
    case 'added_asc': {
      return [{ createdAt: 'asc' }, { id: 'asc' }]
    }

    case 'title_asc': {
      return [{ media: { title: 'asc' } }]
    }

    case 'title_desc': {
      return [{ media: { title: 'desc' } }]
    }

    case 'year_desc': {
      return [{ media: { year: { sort: 'desc', nulls: 'last' } } }]
    }

    case 'year_asc': {
      return [{ media: { year: { sort: 'asc', nulls: 'last' } } }]
    }

    case 'rating_desc': {
      return [{ rating: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
    }
    default: {
      return [{ createdAt: 'desc' }, { id: 'desc' }]
    }
  }
}

export const listsRepository = {
  findById: async (listId: string) => prisma.list.findUnique({ where: { id: listId } }),

  findManyByIds: async (listIds: string[]) =>
    listIds.length === 0 ? [] : prisma.list.findMany({ where: { id: { in: listIds } } }),

  findByShareToken: async (shareToken: string) =>
    prisma.list.findFirst({
      where: { shareToken },
    }),

  findWithMetaById: async (listId: string) => {
    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            handle: true,
            email: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    return list
  },

  findOrCreateMain: async (ownerUserId: string) => {
    const existingMain = await prisma.list.findFirst({
      where: { ownerUserId, title: 'Main' },
    })

    if (existingMain) return existingMain

    return prisma.list.create({
      data: {
        ownerUserId,
        title: 'Main',
        visibility: 'PRIVATE',
      },
    })
  },

  countMainLists: async (ownerUserId: string) => prisma.list.count({ where: { ownerUserId, title: 'Main' } }),

  findOwnedWithCounts: async (ownerUserId: string) =>
    prisma.list.findMany({
      where: { ownerUserId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),

  findSavedWithDetails: async (userId: string) =>
    prisma.savedList.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      include: {
        list: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                handle: true,
                email: true,
              },
            },
            _count: {
              select: {
                items: true,
              },
            },
          },
        },
      },
    }),

  create: async (payload: {
    ownerUserId: string
    title: string
    description?: string | null
    visibility: ListVisibility
    isAnonymous?: boolean
    shareToken?: string | null
    sharePermission?: SharePermission | null
  }) =>
    prisma.list.create({
      data: {
        ownerUserId: payload.ownerUserId,
        title: payload.title,
        description: payload.description ?? null,
        visibility: payload.visibility,
        isAnonymous: payload.isAnonymous ?? false,
        shareToken: payload.shareToken ?? null,
        sharePermission: payload.sharePermission ?? null,
      },
    }),

  update: async (
    listId: string,
    data: {
      title?: string
      description?: string | null
      visibility?: ListVisibility
      isAnonymous?: boolean
      shareToken?: string | null
      sharePermission?: SharePermission | null
    },
  ) => {
    try {
      return await prisma.list.update({
        where: { id: listId },
        data,
      })
    } catch (caughtError) {
      if (caughtError instanceof Prisma.PrismaClientKnownRequestError && caughtError.code === 'P2025') {
        return null
      }

      throw caughtError
    }
  },

  delete: async (listId: string) => {
    await prisma.list.delete({ where: { id: listId } })
  },

  saveForeignList: async (userId: string, listId: string) => {
    await prisma.savedList.upsert({
      where: {
        // Prisma composite key name
        /* eslint-disable-next-line camelcase */
        userId_listId: {
          userId,
          listId,
        },
      },
      update: {},
      create: { userId, listId },
    })
  },

  unsaveForeignList: async (userId: string, listId: string) => {
    await prisma.savedList.deleteMany({
      where: { userId, listId },
    })
  },

  isSavedByUser: async (userId: string, listId: string) =>
    prisma.savedList.findUnique({
      where: {
        /* eslint-disable-next-line camelcase */
        userId_listId: {
          userId,
          listId,
        },
      },
    }),

  findItemsByListWithFilters: async (params: {
    listId: string
    q?: string
    yearFrom?: number
    yearTo?: number
    genresFilter?: string[]
    genreMatchMode?: 'and' | 'or'
    types?: MediaType[]
    cast?: string[]
    statuses?: WatchStatus[]
    durationFrom?: number
    durationTo?: number
    countries?: string[]
    sort?: string
    limit: number
    cursor?: string
  }) => {
    const gConfig = await getGenreAliasConfig()
    const mediaWhere = buildMediaWhereForListFilters(
      {
        q: params.q,
        yearFrom: params.yearFrom,
        yearTo: params.yearTo,
        genresFilter: params.genresFilter,
        genreMatchMode: params.genreMatchMode,
        types: params.types,
        cast: params.cast,
        durationFrom: params.durationFrom,
        durationTo: params.durationTo,
        countries: params.countries,
      },
      gConfig,
    )

    return prisma.listItem.findMany({
      where: {
        listId: params.listId,
        ...listItemStatusWhere(params.statuses),
        ...(Object.keys(mediaWhere).length > 0 ? { media: mediaWhere } : {}),
      },
      orderBy: buildOrderBy(params.sort),
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      take: params.limit,
      include: listItemsInclude,
    })
  },

  //
  // Items from multiple lists (for board). Optional media filters; no merge/dedup;
  // caller runs mergeItemsByMedia.
  //
  findItemsByListIds: async (
    listIds: string[],
    options: {
      limit?: number
      q?: string
      yearFrom?: number
      yearTo?: number
      genresFilter?: string[]
      genreMatchMode?: 'and' | 'or'
      types?: MediaType[]
      cast?: string[]
      statuses?: WatchStatus[]
      durationFrom?: number
      durationTo?: number
      countries?: string[]
    } = {},
  ) => {
    if (listIds.length === 0) return []

    const limit = options.limit ?? 1000
    const gConfig = await getGenreAliasConfig()
    const mediaWhere = buildMediaWhereForListFilters(
      {
        q: options.q,
        yearFrom: options.yearFrom,
        yearTo: options.yearTo,
        genresFilter: options.genresFilter,
        genreMatchMode: options.genreMatchMode,
        types: options.types,
        cast: options.cast,
        durationFrom: options.durationFrom,
        durationTo: options.durationTo,
        countries: options.countries,
      },
      gConfig,
    )

    return prisma.listItem.findMany({
      where: {
        listId: { in: listIds },
        ...listItemStatusWhere(options.statuses),
        ...(Object.keys(mediaWhere).length > 0 ? { media: mediaWhere } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      include: listItemsInclude,
    })
  },

  /** Distinct ISO origin country codes from all media in the given lists (ignores list filters). */
  findDistinctCountryCodesForListIds: async (listIds: string[]): Promise<string[]> => {
    if (listIds.length === 0) return []

    const rows = await prisma.$queryRaw<{ code: string }[]>(
      Prisma.sql`
        SELECT DISTINCT UPPER(TRIM(u.c)) AS code
        FROM list_items li
        INNER JOIN media m ON m.id = li.media_id
        CROSS JOIN LATERAL UNNEST(m.countries) AS u(c)
        WHERE li.list_id IN (${Prisma.join(listIds.map((id) => Prisma.sql`${id}`))})
          AND TRIM(u.c) <> ''
      `,
    )

    const out = new Set<string>()

    for (const row of rows) {
      if (row.code) out.add(row.code)
    }

    return [...out].toSorted((a, b) => a.localeCompare(b))
  },

  setListTags: async (listId: string, tagIds: string[]) => {
    await prisma.$transaction([
      prisma.listTag.deleteMany({ where: { listId } }),
      ...(tagIds.length > 0 ? [prisma.listTag.createMany({ data: tagIds.map((tagId) => ({ listId, tagId })) })] : []),
    ])
  },

  findPublicWithFilters: async (params: {
    q?: string
    tags?: string[]
    sort?: 'newest' | 'popular' | 'top_rated'
    cursor?: string
    limit: number
  }) => {
    const where: Prisma.ListWhereInput = { visibility: 'PUBLIC' }

    if (params.q) {
      where.title = { contains: params.q, mode: 'insensitive' }
    }

    if (params.tags && params.tags.length > 0) {
      where.tags = {
        some: { tag: { slug: { in: params.tags } } },
      }
    }

    const buildPublicOrderBy = (): Prisma.ListOrderByWithRelationInput[] => {
      if (params.sort === 'popular') return [{ items: { _count: 'desc' } }, { createdAt: 'desc' }]

      if (params.sort === 'top_rated') return [{ ratings: { _count: 'desc' } }, { createdAt: 'desc' }]

      return [{ createdAt: 'desc' }]
    }

    const lists = await prisma.list.findMany({
      where,
      orderBy: buildPublicOrderBy(),
      take: params.limit,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        owner: {
          select: { id: true, name: true, handle: true, email: true },
        },
        _count: { select: { items: true, ratings: true } },
        tags: { include: { tag: true } },
        ratings: { select: { value: true } },
      },
    })

    return lists.map((list) => {
      const ratingValues = list.ratings.map((r) => r.value)
      const ratingAverage = ratingValues.length > 0 ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length : 0

      return {
        ...list,
        ratings: undefined,
        ratingAverage,
        ratingCount: ratingValues.length,
      }
    })
  },
}
