/* eslint-disable camelcase */
import { Prisma } from '@prisma/client'

import { prisma } from '$lib/server/prisma'

import type { WatchStatus } from '@prisma/client'

export const listItemsRepository = {
  upsertByListAndMedia: async (payload: {
    listId: string
    mediaId: string
    addedByUserId: string
    notes?: string
    rating?: number
    status?: WatchStatus
    currentEpisode?: number
  }) => {
    await prisma.listItem.upsert({
      where: {
        listId_mediaId: {
          listId: payload.listId,
          mediaId: payload.mediaId,
        },
      },
      update: {
        notes: payload.notes,
        rating: payload.rating,
        status: payload.status,
        currentEpisode: payload.currentEpisode,
      },
      create: {
        listId: payload.listId,
        mediaId: payload.mediaId,
        addedByUserId: payload.addedByUserId,
        notes: payload.notes,
        rating: payload.rating,
        status: payload.status,
        currentEpisode: payload.currentEpisode,
      },
    })

    return prisma.listItem.findUnique({
      where: {
        listId_mediaId: {
          listId: payload.listId,
          mediaId: payload.mediaId,
        },
      },
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

  updateById: async (
    itemId: string,
    payload: {
      notes?: string | null
      rating?: number | null
      status?: WatchStatus | null
      currentSeason?: number | null
      currentEpisode?: number | null
    },
  ) => {
    try {
      return await prisma.listItem.update({
        where: { id: itemId },
        data: {
          notes: payload.notes ?? null,
          rating: payload.rating ?? null,
          status: payload.status ?? null,
          currentSeason: payload.currentSeason ?? null,
          currentEpisode: payload.currentEpisode ?? null,
        },
      })
    } catch (caughtError) {
      if (caughtError instanceof Prisma.PrismaClientKnownRequestError && caughtError.code === 'P2025') {
        return null
      }

      throw caughtError
    }
  },

  deleteById: async (itemId: string) => {
    await prisma.listItem.deleteMany({ where: { id: itemId } })
  },

  findByListId: async (listId: string) =>
    prisma.listItem.findMany({
      where: { listId },
      orderBy: { createdAt: 'desc' },
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
    }),

  findByUserAndMedia: async (userId: string, mediaId: string) =>
    prisma.listItem.findMany({
      where: {
        media: { id: mediaId },
        list: { ownerUserId: userId },
      },
      include: {
        list: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),

  countByListIds: async (listIds: string[]) => {
    if (listIds.length === 0) return []

    return prisma.listItem.findMany({
      where: { listId: { in: listIds } },
      select: {
        id: true,
        listId: true,
      },
    })
  },
}
