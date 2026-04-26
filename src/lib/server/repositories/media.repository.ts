/* eslint-disable camelcase */
import { type MediaProvider, type MediaType, Prisma } from '@prisma/client'

import { getGenreAliasConfig } from '$lib/server/app-genre-aliases'
import { toGenreLocalizations } from '$lib/server/media-i18n'
import { prisma } from '$lib/server/prisma'
import { UI_BASE_LOCALE } from '$lib/ui-locales'
import { mergeLocalizedGenreList } from '$shared/lib/genre-alias'

import type { CanonicalMedia } from '../providers/types'

const detailsInclude = {
  i18n: true,
  genres: { include: { genre: { include: { i18n: true } } } },
  cast: {
    include: {
      person: { include: { i18n: true } },
      i18n: true,
    },
    orderBy: { castOrder: 'asc' as const },
    take: 20,
  },
  sources: {
    select: { provider: true, externalId: true, externalUrl: true, normalizedJson: true },
  },
  ratings: { orderBy: { value: 'desc' as const } },
} satisfies Prisma.MediaInclude

type UpsertMediaPayload = {
  mediaType: MediaType
  title: string
  originalTitle?: string | null
  tagline?: string | null
  status?: string | null
  director?: string | null
  year?: number | null
  overview?: string | null
  posterUrl?: string | null
  backdropUrl?: string | null
  imdbId?: string | null
  tmdbId?: number | null
  anilistId?: number | null
  tvdbId?: number | null
  malId?: number | null
  kitsuId?: number | null
  traktId?: number | null
  countries: string[]
  runtimeMinutes?: number | null
  episodeRuntimeMin?: number | null
  episodeRuntimeMax?: number | null
  seasonsCount?: number | null
  episodesCount?: number | null
  seasonBreakdown?: Prisma.InputJsonValue | null
  isAdult: boolean
}

export type MediaI18nTextPayload = {
  title: string
  originalTitle?: string | null
  tagline?: string | null
  status?: string | null
  director?: string | null
  overview?: string | null
}

type RatingPayload = {
  provider: MediaProvider
  source: string
  value: number
  maxValue: number
  votes?: number | null
}

type CastMemberPayload = {
  name: string
  role?: string | null
  order?: number | null
  profileUrl?: string | null
  tmdbPersonId?: number | null
  anilistStaffId?: number | null
}

export const mediaRepository = {
  findSourceWithMedia: async (provider: MediaProvider, externalId: string) =>
    prisma.mediaSource.findUnique({
      where: {
        provider_externalId: {
          provider,
          externalId,
        },
      },
      include: { media: { include: { i18n: true } } },
    }),

  findExistingByExternalKeys: async (payload: {
    imdbId?: string | null
    tmdbId?: number | null
    anilistId?: number | null
    tvdbId?: number | null
    malId?: number | null
    kitsuId?: number | null
    traktId?: number | null
  }) => {
    const clauses: Prisma.MediaWhereInput[] = []

    if (payload.imdbId) clauses.push({ imdbId: payload.imdbId })

    if (payload.tmdbId != null) clauses.push({ tmdbId: payload.tmdbId })

    if (payload.anilistId != null) clauses.push({ anilistId: payload.anilistId })

    if (payload.tvdbId != null) clauses.push({ tvdbId: payload.tvdbId })

    if (payload.malId != null) clauses.push({ malId: payload.malId })

    if (payload.kitsuId != null) clauses.push({ kitsuId: payload.kitsuId })

    if (payload.traktId != null) clauses.push({ traktId: payload.traktId })

    if (clauses.length === 0) return null

    return prisma.media.findFirst({ where: { OR: clauses } })
  },

  upsertMedia: async (mediaId: string | null, payload: UpsertMediaPayload) => {
    const mappedSeasonBreakdown: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined =
      payload.seasonBreakdown === null ? Prisma.JsonNull : payload.seasonBreakdown

    const mappedPayload = {
      ...payload,
      seasonBreakdown: mappedSeasonBreakdown,
    } satisfies Omit<UpsertMediaPayload, 'seasonBreakdown'> & {
      seasonBreakdown?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
    }

    if (!mediaId) {
      return prisma.media.create({ data: { ...mappedPayload } })
    }

    return prisma.media.update({ where: { id: mediaId }, data: mappedPayload })
  },

  upsertMediaI18n: async (mediaId: string, locale: string, data: MediaI18nTextPayload) => {
    await prisma.mediaI18n.upsert({
      where: { mediaId_locale: { mediaId, locale } },
      create: { mediaId, locale, ...data },
      update: data,
    })
  },

  replaceMediaI18nFromMap: async (mediaId: string, byLocale: Record<string, MediaI18nTextPayload>) => {
    for (const [loc, data] of Object.entries(byLocale)) {
      await prisma.mediaI18n.upsert({
        where: { mediaId_locale: { mediaId, locale: loc } },
        create: { mediaId, locale: loc, ...data },
        update: data,
      })
    }
  },

  deleteMediaI18nByMediaId: async (mediaId: string) => {
    await prisma.mediaI18n.deleteMany({ where: { mediaId } })
  },

  upsertMediaSource: async (input: {
    mediaId: string
    provider: MediaProvider
    externalId: string
    externalUrl?: string | null
    rawJson: unknown
    normalizedJson: unknown
    expiresAt: Date
    lastFetchedAt: Date
  }) => {
    await prisma.mediaSource.upsert({
      where: {
        provider_externalId: {
          provider: input.provider,
          externalId: input.externalId,
        },
      },
      update: {
        mediaId: input.mediaId,
        externalUrl: input.externalUrl ?? null,
        rawJson: input.rawJson as Prisma.InputJsonValue,
        normalizedJson: input.normalizedJson as Prisma.InputJsonValue,
        expiresAt: input.expiresAt,
        lastFetchedAt: input.lastFetchedAt,
      },
      create: {
        mediaId: input.mediaId,
        provider: input.provider,
        externalId: input.externalId,
        externalUrl: input.externalUrl ?? null,
        rawJson: input.rawJson as Prisma.InputJsonValue,
        normalizedJson: input.normalizedJson as Prisma.InputJsonValue,
        expiresAt: input.expiresAt,
        lastFetchedAt: input.lastFetchedAt,
      },
    })
  },

  // Stable `slug` + per-locale label in `genre_i18n`. `Genre.name` is updated for `en` only.
  replaceMediaGenres: async (
    mediaId: string,
    items: { slug: string; name: string }[] | CanonicalMedia,
    locale: string,
  ) => {
    const raw: { slug: string; name: string }[] = Array.isArray(items) ? items : toGenreLocalizations(items)
    const gConfig = await getGenreAliasConfig()
    const list: { slug: string; name: string }[] = mergeLocalizedGenreList(raw, gConfig)

    await prisma.mediaGenre.deleteMany({ where: { mediaId } })

    if (list.length === 0) {
      return
    }

    const createdGenreIds: string[] = []

    for (const { slug, name } of list) {
      if (!slug || String(slug).length === 0) {
        continue
      }

      const displayName = name && String(name).length > 0 ? name : slug
      const genre = await prisma.genre.upsert({
        where: { slug: String(slug) },
        update: locale === UI_BASE_LOCALE ? { name: displayName } : {},
        create: {
          slug: String(slug),
          name: locale === UI_BASE_LOCALE ? displayName : String(slug),
        },
      })

      await prisma.genreI18n.upsert({
        where: { genreId_locale: { genreId: genre.id, locale } },
        create: { genreId: genre.id, locale, name: displayName },
        update: { name: displayName },
      })

      createdGenreIds.push(genre.id)
    }

    await prisma.mediaGenre.createMany({
      data: createdGenreIds.map((genreId) => ({ mediaId, genreId })),
      skipDuplicates: true,
    })
  },

  upsertMediaRatings: async (mediaId: string, ratings: RatingPayload[]) => {
    for (const rating of ratings) {
      await prisma.mediaRating.upsert({
        where: { mediaId_provider: { mediaId, provider: rating.provider } },
        update: {
          source: rating.source,
          value: rating.value,
          maxValue: rating.maxValue,
          votes: rating.votes ?? null,
        },
        create: {
          mediaId,
          provider: rating.provider,
          source: rating.source,
          value: rating.value,
          maxValue: rating.maxValue,
          votes: rating.votes ?? null,
        },
      })
    }
  },

  replaceMediaCast: async (mediaId: string, castMembers: CastMemberPayload[], locale: string) => {
    if (castMembers.length === 0) {
      return
    }

    await prisma.mediaCast.deleteMany({ where: { mediaId } })

    for (const member of castMembers) {
      let person: { id: string }

      if (member.tmdbPersonId != null) {
        person = await prisma.person.upsert({
          where: { tmdbPersonId: member.tmdbPersonId },
          update: { name: member.name },
          create: { name: member.name, tmdbPersonId: member.tmdbPersonId },
        })
        // eslint-disable-next-line unicorn/no-negated-condition
      } else if (member.anilistStaffId != null) {
        person = await prisma.person.upsert({
          where: { anilistStaffId: member.anilistStaffId },
          update: { name: member.name },
          create: { name: member.name, anilistStaffId: member.anilistStaffId },
        })
      } else {
        const found = await prisma.person.findFirst({ where: { name: member.name } })

        person = found ?? (await prisma.person.create({ data: { name: member.name } }))
      }

      await prisma.personI18n.upsert({
        where: { personId_locale: { personId: person.id, locale } },
        create: { personId: person.id, locale, name: member.name },
        update: { name: member.name },
      })

      if (locale === UI_BASE_LOCALE) {
        await prisma.person.update({ where: { id: person.id }, data: { name: member.name } })
      }

      await prisma.mediaCast.create({
        data: {
          mediaId,
          personId: person.id,
          castOrder: member.order ?? null,
          profileUrl: member.profileUrl ?? null,
        },
      })

      if (member.role) {
        await prisma.mediaCastI18n.upsert({
          where: {
            mediaId_personId_locale: {
              mediaId,
              personId: person.id,
              locale,
            },
          },
          create: { mediaId, personId: person.id, locale, role: member.role },
          update: { role: member.role },
        })
      }
    }
  },

  setMediaEnriched: async (mediaId: string, enrichedAt: Date) => {
    await prisma.media.update({
      where: { id: mediaId },
      data: { enrichedAt },
    })
  },

  findByIdWithDetails: async (id: string) =>
    prisma.media.findUnique({
      where: { id },
      include: detailsInclude,
    }),

  findByIdsWithGenres: async (ids: string[]) => {
    if (ids.length === 0) {
      return []
    }

    return prisma.media.findMany({
      where: { id: { in: ids } },
      include: {
        i18n: true,
        genres: {
          include: {
            genre: { include: { i18n: true } },
          },
        },
      },
    })
  },
}
