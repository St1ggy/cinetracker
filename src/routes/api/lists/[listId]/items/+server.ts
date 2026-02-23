import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { decrypt } from '$lib/server/crypto'
import { importExternalMedia } from '$lib/server/external'
import { requireAddableList, requireReadableList } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository, listsRepository } from '$lib/server/repositories'
import { MEDIA_PROVIDERS, WATCH_STATUSES } from '$shared/config/domain'

import type { DecryptedUserKey } from '$lib/server/external'
import type { MediaType, WatchStatus } from '@prisma/client'

const loadUserKeys = async (userId: string): Promise<DecryptedUserKey[]> => {
  const stored = await prisma.userApiKey.findMany({ where: { userId } })
  const decrypted: DecryptedUserKey[] = []

  for (const key of stored) {
    try {
      const plaintext = decrypt(key.encryptedData, key.iv, key.authTag)
      const credentials = JSON.parse(plaintext) as Record<string, string>

      decrypted.push({ provider: key.provider, credentials })
    } catch {
      // Skip corrupted entries.
    }
  }

  return decrypted
}

const addItemSchema = z.object({
  mediaId: z.string().optional(),
  provider: z.enum(MEDIA_PROVIDERS).optional(),
  externalId: z.string().optional(),
  notes: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(10).optional(),
  status: z.enum(WATCH_STATUSES).optional(),
  currentEpisode: z.number().int().positive().optional(),
})

const listFiltersSchema = z.object({
  q: z.string().optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  genres: z.string().optional(),
  types: z.string().optional(),
  cast: z.string().optional(),
  status: z.enum(WATCH_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(60),
  sort: z.string().optional(),
  cursor: z.string().optional(),
})

export const GET = async ({ locals, params, url }) => {
  const session = await locals.auth()
  const token = url.searchParams.get('token')

  await requireReadableList(params.listId, {
    userId: session?.user?.id,
    shareToken: token,
  })

  const parsed = listFiltersSchema.parse({
    q: url.searchParams.get('q') ?? undefined,
    yearFrom: url.searchParams.get('yearFrom') ?? undefined,
    yearTo: url.searchParams.get('yearTo') ?? undefined,
    genres: url.searchParams.get('genres') ?? undefined,
    types: url.searchParams.get('types') ?? undefined,
    cast: url.searchParams.get('cast') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })

  const genres =
    parsed.genres
      ?.split(',')
      .map((x) => x.trim())
      .filter(Boolean) ?? []
  const types = (parsed.types
    ?.split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean) ?? []) as MediaType[]
  const cast =
    parsed.cast
      ?.split(',')
      .map((x) => x.trim())
      .filter(Boolean) ?? []
  const items = await listsRepository.findItemsByListWithFilters({
    listId: params.listId,
    q: parsed.q,
    yearFrom: parsed.yearFrom,
    yearTo: parsed.yearTo,
    genresFilter: genres,
    types,
    cast,
    status: parsed.status ?? undefined,
    sort: parsed.sort,
    limit: parsed.limit,
    cursor: parsed.cursor,
  })

  return json({
    items,
    nextCursor: items.length === parsed.limit ? items.at(-1)?.id : null,
  })
}

export const POST = async ({ locals, params, request, url }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const token = url.searchParams.get('token')

  await requireAddableList(params.listId, {
    userId: session.user.id,
    shareToken: token,
  })
  const payload = addItemSchema.parse(await request.json())

  let mediaId = payload.mediaId

  if (!mediaId) {
    if (!payload.provider || !payload.externalId) {
      throw error(400, 'Provide mediaId or provider + externalId')
    }

    const userKeys = await loadUserKeys(session.user.id)
    const media = await importExternalMedia(payload.provider, payload.externalId, userKeys)

    mediaId = media.id
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { mediaType: true },
  })

  if (!media) {
    throw error(404, 'Media not found')
  }

  if (payload.currentEpisode !== undefined && media.mediaType !== 'TV' && media.mediaType !== 'ANIME') {
    throw error(400, 'Episode progress can be set only for TV or ANIME media')
  }

  const resolvedStatus: WatchStatus = payload.status ?? 'PLAN_TO_WATCH'

  const item = await listItemsRepository.upsertByListAndMedia({
    listId: params.listId,
    mediaId,
    addedByUserId: session.user.id,
    notes: payload.notes,
    rating: payload.rating,
    status: resolvedStatus,
    currentEpisode: payload.currentEpisode,
  })

  return json(item, { status: 201 })
}
