import { prisma } from '$lib/server/prisma'

export const usersRepository = {
  findPublicProfile: async (handle: string) => {
    const user = await prisma.user.findUnique({
      where: { handle },
      select: {
        id: true,
        handle: true,
        name: true,
        image: true,
        createdAt: true,
        lists: {
          where: { visibility: 'PUBLIC' },
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { items: true } },
            tags: { include: { tag: true } },
            ratings: { select: { value: true } },
          },
        },
      },
    })

    if (!user) return null

    return {
      ...user,
      lists: user.lists.map((list) => {
        const values = list.ratings.map((r) => r.value)
        const ratingAverage = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

        return {
          ...list,
          ratings: undefined,
          ratingAverage,
          ratingCount: values.length,
        }
      }),
    }
  },
}
