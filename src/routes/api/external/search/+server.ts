import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { searchExternal } from '$lib/server/external'
import { decrypt } from '$lib/server/crypto'
import { prisma } from '$lib/server/prisma'

import type { DecryptedUserKey } from '$lib/server/external'

const querySchema = z.object({
  query: z.string().trim().min(1),
  providers: z.string().optional(),
})

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

export const GET = async ({ url, locals }) => {
  const parsed = querySchema.safeParse({
    query: url.searchParams.get('query'),
    providers: url.searchParams.get('providers') ?? undefined,
  })

  if (!parsed.success) {
    throw error(400, 'Invalid search parameters')
  }

  const session = await locals.auth()
  const userKeys = await loadUserKeys(session?.user?.id)

  const providerFilter = parsed.data.providers
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const results = await searchExternal(parsed.data.query, userKeys, providerFilter)

  return json({ results })
}
