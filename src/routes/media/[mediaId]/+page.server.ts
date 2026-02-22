import { error } from '@sveltejs/kit'

import { enrichMediaSources } from '$lib/server/enrich'
import { decrypt } from '$lib/server/crypto'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository, mediaRepository } from '$lib/server/repositories'

import type { PageServerLoad } from './$types'
import type { DecryptedUserKey } from '$lib/server/external'

const loadUserKeys = async (userId: string | undefined): Promise<DecryptedUserKey[]> => {
  if (!userId) return []

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

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth()

  const [media, userItems] = await Promise.all([
    mediaRepository.findByIdWithDetails(params.mediaId),
    session?.user?.id ? listItemsRepository.findByUserAndMedia(session.user.id, params.mediaId) : Promise.resolve([]),
  ])

  if (!media) {
    throw error(404, 'Media not found')
  }

  const needsEnrichment = !media.enrichedAt

  if (needsEnrichment) {
    const enriched = (async () => {
      const userKeys = await loadUserKeys(session?.user?.id)

      await enrichMediaSources(params.mediaId, userKeys)

      return mediaRepository.findByIdWithDetails(params.mediaId)
    })()

    return { media, userItems, enriched, willEnrich: true }
  }

  return { media, userItems, enriched: Promise.resolve(null), willEnrich: false }
}
