/* eslint-disable camelcase */
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { encrypt } from '$lib/server/crypto'
import { prisma } from '$lib/server/prisma'
import { validateProviderCredentials } from '$lib/server/providers/validate-credentials'
import { KEY_REQUIRED_PROVIDERS } from '$shared/config/domain'

import type { MediaProvider } from '@prisma/client'

const CREDENTIAL_SCHEMAS: Record<string, z.ZodTypeAny> = {
  TMDB: z
    .object({ apiKey: z.string().optional(), bearerToken: z.string().optional() })
    .refine((data) => data.apiKey || data.bearerToken, { message: 'Provide at least apiKey or bearerToken for TMDB' }),
  OMDB: z.object({ apiKey: z.string().min(1) }),
  TVDB: z.object({ apiKey: z.string().min(1), pin: z.string().optional() }),
  TRAKT: z.object({ clientId: z.string().min(1) }),
  SIMKL: z.object({ clientId: z.string().min(1) }),
}

const upsertSchema = z.object({
  provider: z.enum(KEY_REQUIRED_PROVIDERS),
  credentials: z.record(z.string(), z.string()),
})

const requireAuth = async (locals: App.Locals) => {
  const session = await locals.auth()

  if (!session?.user?.id) throw error(401, 'Authentication required')

  return session.user.id
}

export const GET = async ({ locals }) => {
  const userId = await requireAuth(locals)
  const keys = await prisma.userApiKey.findMany({
    where: { userId },
    select: { provider: true, updatedAt: true },
    orderBy: { provider: 'asc' },
  })

  return json({ configuredProviders: keys.map((k) => ({ provider: k.provider, updatedAt: k.updatedAt })) })
}

export const PUT = async ({ locals, request }) => {
  const userId = await requireAuth(locals)
  const body = upsertSchema.parse(await request.json())
  const credentialSchema = CREDENTIAL_SCHEMAS[body.provider]

  if (!credentialSchema) throw error(400, `No credential schema for provider: ${body.provider}`)

  const validatedCredentials = credentialSchema.parse(body.credentials) as Record<string, string>

  try {
    await validateProviderCredentials(body.provider as MediaProvider, validatedCredentials)
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : 'Validation failed'

    return json({ message }, { status: 400 })
  }

  const plaintext = JSON.stringify(validatedCredentials)
  const { encrypted, iv, authTag } = encrypt(plaintext)

  await prisma.$transaction([
    prisma.userApiKey.upsert({
      where: { userId_provider: { userId, provider: body.provider as MediaProvider } },
      update: { encryptedData: encrypted, iv, authTag },
      create: {
        userId,
        provider: body.provider as MediaProvider,
        encryptedData: encrypted,
        iv,
        authTag,
      },
    }),
    prisma.media.updateMany({
      where: { listItems: { some: { addedByUserId: userId } } },
      data: { enrichedAt: null },
    }),
  ])

  return json({ success: true })
}

export const DELETE = async ({ locals, url }) => {
  const userId = await requireAuth(locals)
  const providerParameter = url.searchParams.get('provider')?.toUpperCase()

  if (
    !providerParameter ||
    !KEY_REQUIRED_PROVIDERS.includes(providerParameter as (typeof KEY_REQUIRED_PROVIDERS)[number])
  ) {
    throw error(400, 'Invalid or missing provider parameter')
  }

  const provider = providerParameter as MediaProvider

  await prisma.$transaction([
    prisma.userApiKey.deleteMany({ where: { userId, provider } }),
    prisma.media.updateMany({
      where: { listItems: { some: { addedByUserId: userId } } },
      data: { enrichedAt: null },
    }),
  ])

  return json({ success: true })
}
