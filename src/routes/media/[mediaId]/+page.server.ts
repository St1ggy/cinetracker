import { error } from '@sveltejs/kit'

import { decrypt } from '$lib/server/crypto'
import { enrichMediaSources } from '$lib/server/enrich'
import { prisma } from '$lib/server/prisma'
import { listItemsRepository, mediaRepository } from '$lib/server/repositories'

import type { DecryptedUserKey } from '$lib/server/external'
import type { PageServerLoad } from './$types'

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

  // Re-enrich if: not yet enriched, OR cast has entries but none have profile photos
  // (covers media imported before cast images were fetched from providers).
  const castLacksPhotos = media.cast.length > 0 && media.cast.every((c) => !c.profileUrl)
  const needsEnrichment = !media.enrichedAt || castLacksPhotos

  if (needsEnrichment) {
    const enriched = (async () => {
      const userKeys = await loadUserKeys(session?.user?.id)

      if (castLacksPhotos) {
        // Drop existing sources so enrichment re-fetches them with updated queries
        // (e.g. AniList now includes staff images). This is a one-time fix per media.
        await prisma.mediaSource.deleteMany({ where: { mediaId: params.mediaId } })
        await mediaRepository.setMediaEnriched(params.mediaId, new Date(0))
      }

      await enrichMediaSources(params.mediaId, userKeys)

      return mediaRepository.findByIdWithDetails(params.mediaId)
    })()

    return { media, userItems, enriched, willEnrich: true }
  }

  return { media, userItems, enriched: Promise.resolve(null), willEnrich: false }
}
