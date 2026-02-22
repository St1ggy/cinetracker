/* eslint-disable camelcase */
import { type ListVisibility, type MediaType, Prisma, type WatchStatus } from '@prisma/client'

import { prisma } from '$lib/server/prisma'

const buildOrderBy = (sort?: string): Prisma.ListItemOrderByWithRelationInput[] => {
  switch (sort) {
    case 'added_asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }]
    case 'title_asc':
      return [{ media: { title: 'asc' } }]
    case 'title_desc':
      return [{ media: { title: 'desc' } }]
    case 'year_desc':
      return [{ media: { year: { sort: 'desc', nulls: 'last' } } }]
    case 'year_asc':
      return [{ media: { year: { sort: 'asc', nulls: 'last' } } }]
    case 'rating_desc':
      return [{ rating: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }]
  }
}

export const listsRepository = {
  findById: async (listId: string) => prisma.list.findUnique({ where: { id: listId } }),

  findByShareToken: async (shareToken: string) =>
    prisma.list.findFirst({
      where: { shareToken, visibility: 'UNLISTED' },
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
    shareToken?: string | null
  }) =>
    prisma.list.create({
      data: {
        ownerUserId: payload.ownerUserId,
        title: payload.title,
        description: payload.description ?? null,
        visibility: payload.visibility,
        shareToken: payload.shareToken ?? null,
      },
    }),

  update: async (
    listId: string,
    data: {
      title?: string
      description?: string | null
      visibility?: ListVisibility
      shareToken?: string | null
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
    types?: MediaType[]
    cast?: string[]
    status?: WatchStatus | null
    sort?: string
    limit: number
    cursor?: string
  }) => {
    const mediaWhere: Prisma.MediaWhereInput = {}
    const genreSlugs = (params.genresFilter ?? []).map((genre) => genre.toLowerCase().replaceAll(' ', '-'))
    const castFilters = params.cast ?? []

    if (params.q) {
      mediaWhere.title = {
        contains: params.q,
        mode: 'insensitive',
      }
    }

    const hasYearFrom = params.yearFrom !== undefined
    const hasYearTo = params.yearTo !== undefined

    if (hasYearFrom || hasYearTo) {
      mediaWhere.year = {
        ...(hasYearFrom ? { gte: params.yearFrom } : {}),
        ...(hasYearTo ? { lte: params.yearTo } : {}),
      }
    }

    if ((params.types?.length ?? 0) > 0) {
      mediaWhere.mediaType = { in: params.types }
    }

    if (genreSlugs.length > 0) {
      mediaWhere.genres = {
        some: {
          genre: {
            slug: { in: genreSlugs },
          },
        },
      }
    }

    if (castFilters.length > 0) {
      mediaWhere.OR = castFilters.map((castName) => ({
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
      }))
    }

    return prisma.listItem.findMany({
      where: {
        listId: params.listId,
        ...(params.status !== undefined && params.status !== null ? { status: params.status } : {}),
        ...(Object.keys(mediaWhere).length > 0 ? { media: mediaWhere } : {}),
      },
      orderBy: buildOrderBy(params.sort),
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      take: params.limit,
      include: {
        media: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
      },
    })
  },
}
