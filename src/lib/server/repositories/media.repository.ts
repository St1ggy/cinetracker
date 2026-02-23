/* eslint-disable camelcase */
import { type MediaProvider, type MediaType, Prisma } from '@prisma/client'

import { prisma } from '$lib/server/prisma'

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
      include: { media: true },
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

  replaceMediaGenres: async (mediaId: string, genreNames: string[]) => {
    await prisma.mediaGenre.deleteMany({ where: { mediaId } })

    if (genreNames.length === 0) return

    const createdGenreIds: string[] = []

    for (const genreName of genreNames) {
      const slug = genreName.toLowerCase().replaceAll(/\s+/g, '-')
      const genre = await prisma.genre.upsert({
        where: { slug },
        update: { name: genreName },
        create: { slug, name: genreName },
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

  replaceMediaCast: async (mediaId: string, castMembers: CastMemberPayload[]) => {
    if (castMembers.length === 0) return

    await prisma.mediaCast.deleteMany({ where: { mediaId } })

    for (const member of castMembers) {
      let person: { id: string } | null = null

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
        person = await prisma.person.findFirst({ where: { name: member.name } })

        if (!person) {
          person = await prisma.person.create({ data: { name: member.name } })
        }
      }

      await prisma.mediaCast.upsert({
        where: { mediaId_personId: { mediaId, personId: person.id } },
        update: {
          role: member.role ?? null,
          castOrder: member.order ?? null,
          profileUrl: member.profileUrl ?? null,
        },
        create: {
          mediaId,
          personId: person.id,
          role: member.role ?? null,
          castOrder: member.order ?? null,
          profileUrl: member.profileUrl ?? null,
        },
      })
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
      include: {
        genres: { include: { genre: true } },
        cast: {
          include: { person: true },
          orderBy: { castOrder: 'asc' },
          take: 20,
        },
        sources: {
          select: { provider: true, externalId: true, externalUrl: true, normalizedJson: true },
        },
        ratings: {
          orderBy: { value: 'desc' },
        },
      },
    }),

  findByIdsWithGenres: async (ids: string[]) => {
    if (ids.length === 0) return []

    return prisma.media.findMany({
      where: { id: { in: ids } },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    })
  },
}
