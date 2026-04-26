import {
  resolveGenreDisplayNameFromRows,
  resolveMediaCastRole,
  resolveMediaTextFields,
  resolvePersonName,
} from './media-i18n'
import { type mediaRepository } from './repositories'

export type MediaWithDetails = NonNullable<Awaited<ReturnType<typeof mediaRepository.findByIdWithDetails>>>

/** Strips i18n relation arrays from Prisma `include` results for client payloads. */
const stripI18n = <T extends { i18n: unknown }>(row: T): Omit<T, 'i18n'> => {
  const { i18n, ...rest } = row

  return { ...rest } as Omit<T, 'i18n'>
}

const localizeCast = (c: MediaWithDetails['cast'][number], locale: string) => {
  const role = resolveMediaCastRole(c.i18n, locale)
  const { person, ...castRest } = stripI18n(c)
  const name = resolvePersonName(person, person.i18n, locale)

  return { ...castRest, role, person: { ...stripI18n(person), name } } as const
}

type MediaGenreRow = MediaWithDetails['genres'][number]

const localizeGenreRows = (rows: readonly MediaGenreRow[], locale: string) =>
  rows.map((mg) => {
    const g = mg.genre
    const name = resolveGenreDisplayNameFromRows({ name: g.name, slug: g.slug }, g.i18n, locale)

    return { ...mg, genre: { ...stripI18n(g), name } }
  })

// Merges `media` scalars with `media_i18n` for the request language; strips i18n branches from JSON.
export const localizeMediaDetails = (m: MediaWithDetails, locale: string) => {
  const texts = resolveMediaTextFields(m, m.i18n, locale)
  const base = stripI18n(m)

  return {
    ...base,
    ...texts,
    cast: m.cast.map((row) => localizeCast(row, locale)),
    genres: localizeGenreRows(m.genres, locale),
  }
}

type MediaWithI18n = Awaited<ReturnType<typeof mediaRepository.findByIdsWithGenres>>[number]

// For board API: minimal media shape with localized title + genre labels.
export const localizeBoardMedia = (m: MediaWithI18n, locale: string) => {
  const texts = resolveMediaTextFields(m, m.i18n, locale)
  const base = stripI18n(m)

  return { ...base, ...texts, genres: localizeGenreRows(m.genres, locale) }
}
