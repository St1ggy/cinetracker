// Validates provider API credentials by making a minimal request to the provider.
// Throws an Error with a user-facing message if validation fails.
import type { ProviderCredentials } from './types'
import type { MediaProvider } from '@prisma/client'

async function validateTmdb(credentials: ProviderCredentials): Promise<void> {
  const apiKey = credentials.apiKey
  const bearerToken = credentials.bearerToken

  if (!apiKey && !bearerToken) {
    throw new Error('Provide at least API key or Bearer token')
  }

  const url = new URL('https://api.themoviedb.org/3/configuration')
  const headers: Record<string, string> = { accept: 'application/json' }

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  } else if (apiKey) {
    url.searchParams.set('api_key', apiKey)
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const body = (await response.json()) as { status_message?: string }
    const message = body.status_message ?? (response.status === 401 ? 'Invalid API key or token' : 'Request failed')

    throw new Error(message)
  }
}

async function validateOmdb(credentials: ProviderCredentials): Promise<void> {
  const apiKey = credentials.apiKey

  if (!apiKey?.trim()) throw new Error('API key is required')

  const url = new URL('https://www.omdbapi.com/')

  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('i', 'tt3896198') // Guardians of the Galaxy – minimal request

  const response = await fetch(url)
  const payload = (await response.json()) as { Response?: string; Error?: string }

  if (payload.Response === 'False' && payload.Error) {
    throw new Error(payload.Error)
  }

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Invalid API key' : 'Request failed')
  }
}

async function validateTvdb(credentials: ProviderCredentials): Promise<void> {
  const apiKey = credentials.apiKey

  if (!apiKey?.trim()) throw new Error('API key is required')

  const response = await fetch('https://api4.thetvdb.com/v4/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      ...(credentials.pin ? { pin: credentials.pin } : {}),
    }),
  })

  if (!response.ok) {
    const body = (await response.json()) as { status?: string; message?: string }
    const message =
      body.message ?? (response.status === 401 ? 'Invalid API key or PIN' : 'TheTVDB authentication failed')

    throw new Error(message)
  }

  const data = (await response.json()) as { data?: { token?: string } }

  if (!data.data?.token) {
    throw new Error('TheTVDB did not return a token')
  }
}

async function validateTrakt(credentials: ProviderCredentials): Promise<void> {
  const clientId = credentials.clientId

  if (!clientId?.trim()) throw new Error('Client ID is required')

  const response = await fetch('https://api.trakt.tv/users/settings', {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-key': clientId,
      'trakt-api-version': '2',
    },
  })

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403 ? 'Invalid Trakt client ID' : 'Trakt request failed',
    )
  }
}

async function validateSimkl(credentials: ProviderCredentials): Promise<void> {
  const clientId = credentials.clientId

  if (!clientId?.trim()) throw new Error('Client ID is required')

  const url = new URL('https://api.simkl.com/search/multi')

  url.searchParams.set('q', 'test')
  url.searchParams.set('limit', '1')

  const response = await fetch(url, {
    headers: {
      'simkl-api-key': clientId,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403 ? 'Invalid Simkl client ID' : 'Simkl request failed',
    )
  }
}

const validators: Partial<Record<MediaProvider, (creds: ProviderCredentials) => Promise<void>>> = {
  TMDB: validateTmdb,
  OMDB: validateOmdb,
  TVDB: validateTvdb,
  TRAKT: validateTrakt,
  SIMKL: validateSimkl,
}

export async function validateProviderCredentials(
  provider: MediaProvider,
  credentials: ProviderCredentials,
): Promise<void> {
  const function_ = validators[provider]

  if (!function_) {
    throw new Error(`Validation not supported for provider: ${provider}`)
  }

  await function_(credentials)
}
