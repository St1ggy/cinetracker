import { error } from '@sveltejs/kit'

import { appEnv } from '$lib/server/env'
import { isJapaneseLocale } from '$lib/server/locale'

import type { CanonicalCastMember, CanonicalMedia, CanonicalRating, ProviderAdapter, SearchResult } from './types'

const searchQuery = `
query ($search: String!, $page: Int = 1) {
  Page(page: $page, perPage: 10) {
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { large }
      startDate { year }
      genres
      countryOfOrigin
      isAdult
    }
  }
}
`

const detailsQuery = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    startDate { year }
    genres
    countryOfOrigin
    duration
    episodes
    isAdult
    averageScore
    popularity
    staff(sort: RELEVANCE, page: 1, perPage: 10) {
      edges {
        node { id name { full } }
        role
      }
    }
  }
}
`

const pickTitle = (titleObject: Record<string, string | undefined>): string => {
  if (isJapaneseLocale()) {
    return titleObject.native ?? titleObject.romaji ?? titleObject.english ?? 'Untitled'
  }

  return titleObject.english ?? titleObject.romaji ?? titleObject.native ?? 'Untitled'
}

const extractAnilistRatings = (raw: Record<string, unknown>): CanonicalRating[] => {
  const averageScore = raw.averageScore as number | undefined

  if (!averageScore || averageScore === 0) return []

  return [
    {
      source: 'AniList',
      value: averageScore,
      maxValue: 100,
      votes: (raw.popularity as number | undefined) ?? undefined,
    },
  ]
}

const extractAnilistCast = (raw: Record<string, unknown>): CanonicalCastMember[] => {
  const staff = raw.staff as { edges?: { node: { id: number; name: { full: string } }; role: string }[] } | undefined

  if (!staff?.edges) return []

  return staff.edges.map((edge, idx) => ({
    name: edge.node.name.full,
    role: edge.role ?? null,
    order: idx,
    anilistStaffId: edge.node.id,
  }))
}

const normalize = (raw: Record<string, unknown>): CanonicalMedia => {
  const titleObject = (raw.title ?? {}) as Record<string, string | undefined>
  const id = Number(raw.id)
  const malId = raw.idMal != null ? Number(raw.idMal) : null
  const coverImage = raw.coverImage as Record<string, string | undefined> | undefined
  const posterUrl = coverImage?.extraLarge ?? coverImage?.large ?? null

  return {
    provider: 'ANILIST',
    externalId: String(raw.id),
    externalUrl: `https://anilist.co/anime/${id}`,
    title: pickTitle(titleObject),
    originalTitle: titleObject.native ?? titleObject.romaji ?? null,
    year: ((raw.startDate as Record<string, number | undefined> | undefined)?.year ?? null) as number | null,
    mediaType: 'ANIME',
    overview: (raw.description as string | undefined) ?? null,
    posterUrl,
    backdropUrl: (raw.bannerImage as string | undefined) ?? null,
    anilistId: id,
    malId,
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    countries: raw.countryOfOrigin ? [raw.countryOfOrigin as string] : [],
    runtimeMinutes: (raw.duration as number | undefined) ?? null,
    episodeRuntimeMin: (raw.duration as number | undefined) ?? null,
    episodeRuntimeMax: (raw.duration as number | undefined) ?? null,
    seasonsCount: raw.episodes ? 1 : null,
    episodesCount: (raw.episodes as number | undefined) ?? null,
    seasonBreakdown: raw.episodes ? [{ seasonNumber: 1, episodes: Number(raw.episodes) }] : null,
    isAdult: Boolean(raw.isAdult),
    ratings: extractAnilistRatings(raw),
    cast: extractAnilistCast(raw),
    raw,
  }
}

const gql = async (url: string, query: string, variables: Record<string, unknown>) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

export const anilistAdapter: ProviderAdapter = {
  provider: 'ANILIST',
  requiresKey: false,

  async search(query) {
    const response = await gql(appEnv.anilistApiUrl, searchQuery, { search: query })

    if (!response.ok) return []

    const payload = (await response.json()) as { data?: { Page?: { media?: Record<string, unknown>[] } } }
    const results: SearchResult[] = []

    for (const item of payload.data?.Page?.media ?? []) {
      const normalized = normalize(item)

      results.push({
        provider: 'ANILIST',
        externalId: normalized.externalId,
        title: normalized.title,
        originalTitle: normalized.originalTitle,
        year: normalized.year,
        mediaType: normalized.mediaType,
        overview: normalized.overview,
        posterUrl: normalized.posterUrl,
      })
    }

    return results
  },

  async fetchDetails(externalId) {
    const id = Number.parseInt(externalId, 10)

    if (Number.isNaN(id)) throw error(400, 'Invalid AniList id')

    const response = await gql(appEnv.anilistApiUrl, detailsQuery, { id })

    if (!response.ok) throw error(response.status, 'AniList details not found')

    const payload = (await response.json()) as { data?: { Media?: Record<string, unknown> } }

    if (!payload.data?.Media) throw error(404, 'AniList media not found')

    return normalize(payload.data.Media)
  },
}
