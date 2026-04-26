import { describe, expect, it } from 'vitest'

import { type BoardItemForDuration, boardItemDurationMinutes, cumulativeWatchedEpisodes } from './board-kanban-duration'

const baseMedia = (over: Partial<BoardItemForDuration['media']> = {}): BoardItemForDuration['media'] => ({
  mediaType: 'TV',
  runtimeMinutes: null,
  episodeRuntimeMin: null,
  episodeRuntimeMax: null,
  seasonsCount: 1,
  episodesCount: null,
  seasonBreakdown: null,
  ...over,
})

const item = (over: Partial<BoardItemForDuration> = {}): BoardItemForDuration => ({
  status: 'IN_PROGRESS',
  currentEpisode: 0,
  media: baseMedia(),
  ...over,
})

describe('boardItemDurationMinutes', () => {
  it('episodic total: known episodes = episodes × avg, avg from fallbacks (TV 50) if unset', () => {
    const it_ = item({
      status: 'PLAN_TO_WATCH',
      currentEpisode: 0,
      media: baseMedia({ mediaType: 'TV', episodesCount: 4 }),
    })

    expect(boardItemDurationMinutes(it_, 'total')).toBe(4 * 50)
  })

  it('episodic total: unknown count uses one episode at avg (matches remaining-null rule)', () => {
    const it_ = item({
      status: 'PLAN_TO_WATCH',
      currentEpisode: 0,
      media: baseMedia({ mediaType: 'ANIME', episodesCount: null, seasonBreakdown: null }),
    })

    expect(boardItemDurationMinutes(it_, 'total')).toBe(24)
  })

  it('episodic remaining: null total is treated as 1 ep; subtracts watched', () => {
    const it_ = item({
      status: 'IN_PROGRESS',
      currentEpisode: 0,
      media: baseMedia({ mediaType: 'TV', episodesCount: null }),
    })

    expect(boardItemDurationMinutes(it_, 'remaining')).toBe(1 * 50)
  })

  it('episodic remaining: with known total 10 and watched 3, remaining 7', () => {
    const it_ = item({
      status: 'IN_PROGRESS',
      currentEpisode: 3,
      media: baseMedia({ mediaType: 'TV', episodesCount: 10 }),
    })

    expect(boardItemDurationMinutes(it_, 'remaining')).toBe(7 * 50)
  })

  it('WATCHED episodic: full series if episodes known; else at least one ep', () => {
    const complete = item({
      status: 'WATCHED',
      currentEpisode: 12,
      media: baseMedia({ mediaType: 'TV', episodesCount: 12 }),
    })

    expect(boardItemDurationMinutes(complete, 'watched')).toBe(12 * 50)

    const noCount = item({
      status: 'WATCHED',
      currentEpisode: 0,
      media: baseMedia({ mediaType: 'TV', episodesCount: null }),
    })

    expect(boardItemDurationMinutes(noCount, 'watched')).toBe(1 * 50)
  })

  it('IN_PROGRESS ghost: watched = current only (not full total)', () => {
    const it_ = item({
      status: 'IN_PROGRESS',
      currentEpisode: 2,
      media: baseMedia({ mediaType: 'ANIME', episodesCount: 24, episodeRuntimeMin: 20, episodeRuntimeMax: 28 }),
    })
    const avg = 24

    expect(boardItemDurationMinutes(it_, 'watched')).toBe(2 * avg)
  })

  it('movie: all kinds use runtime or fallback 90 (MOVIE type)', () => {
    const itR = item({
      status: 'WATCHED',
      media: baseMedia({ mediaType: 'MOVIE', runtimeMinutes: 120 }),
    })
    const itNo = item({ status: 'PLAN_TO_WATCH', media: baseMedia({ mediaType: 'MOVIE', runtimeMinutes: null }) })

    expect(boardItemDurationMinutes(itR, 'watched')).toBe(120)
    expect(boardItemDurationMinutes(itR, 'total')).toBe(120)
    expect(boardItemDurationMinutes(itR, 'remaining')).toBe(120)
    expect(boardItemDurationMinutes(itNo, 'total')).toBe(90)
  })

  it('uses season breakdown when episodesCount missing', () => {
    const it_ = item({
      status: 'PLAN_TO_WATCH',
      currentEpisode: 0,
      media: baseMedia({
        mediaType: 'TV',
        episodesCount: null,
        seasonBreakdown: [{ seasonNumber: 1, episodes: 6 }],
      }),
    })

    expect(boardItemDurationMinutes(it_, 'total')).toBe(6 * 50)
  })

  it('multi-season: S5E14 = 4 full prior seasons + 13 in S5; remaining = rest of S5 + S6 + S7', () => {
    const seasonBreakdown = [
      { seasonNumber: 1, episodes: 5 },
      { seasonNumber: 2, episodes: 5 },
      { seasonNumber: 3, episodes: 5 },
      { seasonNumber: 4, episodes: 5 },
      { seasonNumber: 5, episodes: 20 },
      { seasonNumber: 6, episodes: 10 },
      { seasonNumber: 7, episodes: 8 },
    ]
    const total = 5 * 4 + 20 + 10 + 8
    const prior4 = 5 * 4
    const inS5 = 13
    const watched = prior4 + inS5
    const remainingEps = total - watched
    const it_ = item({
      status: 'IN_PROGRESS',
      currentSeason: 5,
      currentEpisode: 14,
      media: baseMedia({ mediaType: 'TV', episodesCount: null, seasonBreakdown }),
    })

    expect(cumulativeWatchedEpisodes(it_)).toBe(watched)
    expect(cumulativeWatchedEpisodes(it_)).toBe(33)
    expect(remainingEps).toBe(25)
    expect(boardItemDurationMinutes(it_, 'remaining')).toBe(remainingEps * 50)
  })
})
