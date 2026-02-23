import { decrypt } from '$lib/server/crypto'

import { anilistAdapter } from './anilist'
import { jikanAdapter } from './jikan'
import { kitsuAdapter } from './kitsu'
import { omdbAdapter } from './omdb'
import { shikimoriAdapter } from './shikimori'
import { simklAdapter } from './simkl'
import { tmdbAdapter } from './tmdb'
import { traktAdapter } from './trakt'
import { tvdbAdapter } from './tvdb'
import { wikidataAdapter } from './wikidata'

import type { ProviderAdapter, ProviderCredentials } from './types'
import type { MediaProvider } from '@prisma/client'

export const ALL_ADAPTERS: ProviderAdapter[] = [
  tmdbAdapter,
  anilistAdapter,
  omdbAdapter,
  tvdbAdapter,
  jikanAdapter,
  kitsuAdapter,
  traktAdapter,
  shikimoriAdapter,
  simklAdapter,
  wikidataAdapter,
]

const ADAPTER_MAP = new Map<MediaProvider, ProviderAdapter>(ALL_ADAPTERS.map((adapter) => [adapter.provider, adapter]))

export const getAdapter = (provider: MediaProvider): ProviderAdapter | undefined => ADAPTER_MAP.get(provider)

export type DecryptedUserKey = {
  provider: MediaProvider
  credentials: ProviderCredentials
}

export type StoredUserKey = {
  provider: MediaProvider
  encryptedData: string
  iv: string
  authTag: string
}

export const decryptUserKeys = (keys: StoredUserKey[]): DecryptedUserKey[] => {
  const decrypted: DecryptedUserKey[] = []

  for (const key of keys) {
    try {
      const plaintext = decrypt(key.encryptedData, key.iv, key.authTag)
      const credentials = JSON.parse(plaintext) as ProviderCredentials

      decrypted.push({ provider: key.provider, credentials })
    } catch {
      // Skip corrupted keys silently.
    }
  }

  return decrypted
}

export const getEnabledAdapters = (userKeys: DecryptedUserKey[]): ProviderAdapter[] => {
  const keyedProviders = new Set(userKeys.map((k) => k.provider))

  return ALL_ADAPTERS.filter((adapter) => !adapter.requiresKey || keyedProviders.has(adapter.provider))
}

export const getCredentialsForProvider = (
  userKeys: DecryptedUserKey[],
  provider: MediaProvider,
): ProviderCredentials | undefined => userKeys.find((k) => k.provider === provider)?.credentials
