import { error, json } from '@sveltejs/kit'

import { getLocale } from '$lib/paraglide/runtime'
import { decrypt } from '$lib/server/crypto'
import { forceEnrichMediaSources } from '$lib/server/enrich'
import { prisma } from '$lib/server/prisma'

import type { DecryptedUserKey } from '$lib/server/providers/registry'

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

export const POST = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  const found = await prisma.media.findUnique({ where: { id: params.mediaId }, select: { id: true } })

  if (!found) throw error(404, 'Media not found')

  await forceEnrichMediaSources(params.mediaId, await loadUserKeys(session.user.id), { locale: getLocale() })

  return json({ ok: true })
}
