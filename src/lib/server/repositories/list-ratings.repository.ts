/* eslint-disable camelcase */
import { prisma } from '$lib/server/prisma'

export const listRatingsRepository = {
  upsert: async (listId: string, userId: string, value: number) =>
    prisma.listRating.upsert({
      where: { listId_userId: { listId, userId } },
      update: { value },
      create: { listId, userId, value },
    }),

  remove: async (listId: string, userId: string) => {
    await prisma.listRating.deleteMany({ where: { listId, userId } })
  },

  getAggregateForList: async (listId: string) => {
    const result = await prisma.listRating.aggregate({
      where: { listId },
      _avg: { value: true },
      _count: { value: true },
    })

    return {
      average: result._avg.value ?? 0,
      count: result._count.value,
    }
  },

  getUserRating: async (listId: string, userId: string) =>
    prisma.listRating.findUnique({
      where: { listId_userId: { listId, userId } },
    }),
}
