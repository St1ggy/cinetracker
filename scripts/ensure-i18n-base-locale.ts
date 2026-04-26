/**
 * Fills missing `en` i18n rows from legacy `Media` / `Genre` / `Person` scalar columns.
 * Safe to re-run. Cast line roles are backfilled in the migration (`media_cast_i18n`); re-run
 * that migration or enrich if you need to repair cast rows.
 */
import { PrismaClient } from '@prisma/client'

import { UI_BASE_LOCALE } from '../src/lib/ui-locales'

const prisma = new PrismaClient()

const main = async () => {
  const locale = UI_BASE_LOCALE

  const medias = await prisma.media.findMany()
  for (const m of medias) {
    const existing = await prisma.mediaI18n.findUnique({
      where: { mediaId_locale: { mediaId: m.id, locale } },
    })

    if (existing) continue

    await prisma.mediaI18n.create({
      data: {
        mediaId: m.id,
        locale,
        title: m.title,
        originalTitle: m.originalTitle,
        tagline: m.tagline,
        status: m.status,
        director: m.director,
        overview: m.overview,
      },
    })
  }

  const genres = await prisma.genre.findMany()
  for (const g of genres) {
    const existing = await prisma.genreI18n.findUnique({
      where: { genreId_locale: { genreId: g.id, locale } },
    })

    if (existing) continue

    await prisma.genreI18n.create({ data: { genreId: g.id, locale, name: g.name } })
  }

  const people = await prisma.person.findMany()
  for (const p of people) {
    const existing = await prisma.personI18n.findUnique({
      where: { personId_locale: { personId: p.id, locale } },
    })

    if (existing) continue

    await prisma.personI18n.create({ data: { personId: p.id, locale, name: p.name } })
  }
}

void main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
