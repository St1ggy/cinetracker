import type { MediaProvider } from '$shared/config/domain'

export type HomeSearchResult = {
  provider: MediaProvider
  externalId: string
  title: string
  year?: number
  mediaType: string
  overview?: string
  posterUrl?: string
}
