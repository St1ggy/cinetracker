import { error, json } from '@sveltejs/kit'

import { decrypt } from '$lib/server/crypto'
import { importExternalMedia } from '$lib/server/external'
import { prisma } from '$lib/server/prisma'
import { isMediaProvider, PROVIDER_META } from '$shared/config/domain'

import type { DecryptedUserKey } from '$lib/server/external'
import type { MediaProvider } from '$shared/config/domain'

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

export const GET = async ({ params, locals }) => {
  const provider = params.provider.toUpperCase()

  if (!isMediaProvider(provider)) {
    throw error(400, 'Unsupported provider')
  }

  const meta = PROVIDER_META[provider as MediaProvider]

  if (meta.requiresKey) {
    const session = await locals.auth()

    if (!session?.user?.id) throw error(401, 'Authentication required')

    const userKeys = await loadUserKeys(session.user.id)
    const hasKey = userKeys.some((k) => k.provider === provider)

    if (!hasKey) {
      throw error(403, `API key for ${meta.label} is not configured in your profile`)
    }

    const media = await importExternalMedia(provider as MediaProvider, params.externalId, userKeys)

    return json({ media })
  }

  const media = await importExternalMedia(provider as MediaProvider, params.externalId, [])

  return json({ media })
}
