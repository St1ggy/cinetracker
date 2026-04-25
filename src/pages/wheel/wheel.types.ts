import type { MediaType, WatchStatus } from '$shared/config/domain'

export type WheelEntry = {
  id: string
  mediaId: string
  title: string
  posterUrl: string | null
}

export type WheelItem = {
  id: string
  mediaId: string
  status: WatchStatus | null
  media: {
    id: string
    title: string
    originalTitle?: string | null
    posterUrl: string | null
    mediaType: MediaType
    genres?: { genre: { id: string; slug: string; name: string } }[]
  }
}

export type WheelGenre = {
  id: string
  slug: string
  name: string
}
