import { z } from 'zod'

import { prisma } from '$lib/server/prisma'
import { DEFAULT_GENRE_ALIAS_CONFIG, type GenreAliasConfig } from '$shared/lib/genre-alias'

const genreAliasGroupSchema = z.object({
  canonical: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  slugs: z.array(z.string().min(1).max(255)).min(1).max(50),
})

export const genreAliasConfigZod = z.object({
  groups: z.array(genreAliasGroupSchema).max(200),
})

const CACHE_TTL_MS = 15_000
let cache: { config: GenreAliasConfig; at: number } | null = null

export const invalidateGenreAliasConfigCache = (): void => {
  cache = null
}

const parseConfig = (raw: unknown): GenreAliasConfig | null => {
  if (raw == null) return null

  const r = genreAliasConfigZod.safeParse(raw)

  return r.success ? r.data : null
}

/** Merged: DB is source of truth when valid; else built-in default. */
export const getGenreAliasConfig = async (): Promise<GenreAliasConfig> => {
  const now = Date.now()

  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.config
  }

  const row = await prisma.appSettings.findUnique({ where: { id: 'app' } })
  const parsed = parseConfig(row?.genreAliasGroupsJson)
  const config = parsed ?? DEFAULT_GENRE_ALIAS_CONFIG

  cache = { config, at: now }

  return config
}

export const getRawAppGenreAliasJson = async (): Promise<z.infer<typeof genreAliasConfigZod> | null> => {
  const row = await prisma.appSettings.findUnique({ where: { id: 'app' } })

  if (!row?.genreAliasGroupsJson) {
    return null
  }

  return parseConfig(row.genreAliasGroupsJson) ?? null
}
