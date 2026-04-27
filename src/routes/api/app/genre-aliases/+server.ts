import { error, json } from '@sveltejs/kit'

import {
  genreAliasConfigZod,
  getGenreAliasConfig,
  getRawAppGenreAliasJson,
  invalidateGenreAliasConfigCache,
} from '$lib/server/app-genre-aliases'
import { requireSessionUser } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { DEFAULT_GENRE_ALIAS_CONFIG } from '$shared/lib/genre-alias'

import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ locals }) => {
  await requireSessionUser(locals)
  const fromDatabase = await getRawAppGenreAliasJson()
  const effective = await getGenreAliasConfig()

  return json({
    config: effective,
    jsonText:
      fromDatabase == null
        ? JSON.stringify(DEFAULT_GENRE_ALIAS_CONFIG, null, 2)
        : JSON.stringify(fromDatabase, null, 2),
  })
}

export const PUT: RequestHandler = async ({ locals, request }) => {
  await requireSessionUser(locals)
  const body = (await request.json()) as { config?: unknown; jsonText?: string }

  let parsed: unknown

  if (body.config !== undefined) {
    parsed = body.config
  } else if (typeof body.jsonText === 'string') {
    try {
      parsed = JSON.parse(body.jsonText) as unknown
    } catch {
      throw error(400, 'Invalid JSON')
    }
  } else {
    throw error(400, 'config or jsonText required')
  }

  const valid = genreAliasConfigZod.safeParse(parsed)

  if (!valid.success) {
    throw error(400, 'Invalid genre alias config')
  }

  await prisma.appSettings.upsert({
    where: { id: 'app' },
    create: { id: 'app', genreAliasGroupsJson: valid.data },
    update: { genreAliasGroupsJson: valid.data },
  })
  invalidateGenreAliasConfigCache()

  return json({ ok: true, config: valid.data })
}
