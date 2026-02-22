import { prisma } from '$lib/server/prisma'

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')

export const tagsRepository = {
  search: async (query: string, limit = 10) =>
    prisma.tag.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: limit,
    }),

  findOrCreateByNames: async (names: string[]) => {
    if (names.length === 0) return []

    const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))]

    return Promise.all(
      unique.map((name) => {
        const slug = slugify(name)

        return prisma.tag.upsert({
          where: { slug },
          update: {},
          create: { slug, name },
        })
      }),
    )
  },

  findPopular: async (limit = 20) =>
    prisma.tag.findMany({
      where: {
        lists: {
          some: {
            list: { visibility: 'PUBLIC' },
          },
        },
      },
      orderBy: { lists: { _count: 'desc' } },
      take: limit,
    }),
}
