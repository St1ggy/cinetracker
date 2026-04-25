import { describe, expect, it } from 'vitest'

import {
  displaySeasonGrid,
  effectiveEpisodicCounts,
  effectiveSeasonRows,
  parseQuickProgressInput,
  parseQuickSeasonBreakdownInput,
  parseSeasonBreakdown,
  seasonBreakdownsEqual,
  sortSeasonBreakdown,
  validateEpisodicProgress,
} from './episodic-progress'

describe('parseSeasonBreakdown', () => {
  it('parses valid array', () => {
    const r = parseSeasonBreakdown([
      { seasonNumber: 1, episodes: 7 },
      { seasonNumber: 2, episodes: 10 },
    ])

    expect(r).toEqual([
      { seasonNumber: 1, episodes: 7 },
      { seasonNumber: 2, episodes: 10 },
    ])
  })

  it('returns null for empty or invalid', () => {
    expect(parseSeasonBreakdown(null)).toBeNull()
    expect(parseSeasonBreakdown([])).toBeNull()
    expect(parseSeasonBreakdown('x')).toBeNull()
  })
})

describe('validateEpisodicProgress', () => {
  const seasons = [
    { seasonNumber: 1, episodes: 6 },
    { seasonNumber: 2, episodes: 8 },
  ]

  it('known structure: ok within cap', () => {
    expect(validateEpisodicProgress({ structureKnown: true, seasons, season: 2, episode: 6 })).toEqual({ ok: true })
  })

  it('known structure: episode over cap', () => {
    const v = validateEpisodicProgress({ structureKnown: true, seasons, season: 1, episode: 9 })

    expect(v.ok).toBe(false)

    if (!v.ok) {
      expect(v.code).toBe('exceeds_season')
      expect(v.field).toBe('episode')
    }
  })

  it('unknown structure: allows large numbers', () => {
    expect(validateEpisodicProgress({ structureKnown: false, seasons: null, season: 10, episode: 99 })).toEqual({
      ok: true,
    })
  })
})

describe('parseQuickProgressInput', () => {
  it('parses common forms', () => {
    expect(parseQuickProgressInput('2x5')).toEqual({ season: 2, episode: 5 })
    expect(parseQuickProgressInput('2×05')).toEqual({ season: 2, episode: 5 })
    expect(parseQuickProgressInput('s2e5')).toEqual({ season: 2, episode: 5 })
    expect(parseQuickProgressInput('2.5')).toEqual({ season: 2, episode: 5 })
    expect(parseQuickProgressInput('2 5')).toEqual({ season: 2, episode: 5 })
  })

  it('rejects empty', () => {
    expect(parseQuickProgressInput('')).toBeNull()
    expect(parseQuickProgressInput('  ')).toBeNull()
  })
})

describe('sortSeasonBreakdown & seasonBreakdownsEqual', () => {
  it('sorts by season number', () => {
    expect(
      sortSeasonBreakdown([
        { seasonNumber: 3, episodes: 1 },
        { seasonNumber: 1, episodes: 10 },
      ]),
    ).toEqual([
      { seasonNumber: 1, episodes: 10 },
      { seasonNumber: 3, episodes: 1 },
    ])
  })

  it('equals is order-insensitive', () => {
    const a = [
      { seasonNumber: 1, episodes: 6 },
      { seasonNumber: 2, episodes: 8 },
    ]
    const b = [
      { seasonNumber: 2, episodes: 8 },
      { seasonNumber: 1, episodes: 6 },
    ]

    expect(seasonBreakdownsEqual(a, b)).toBe(true)
    expect(seasonBreakdownsEqual(a, [{ seasonNumber: 1, episodes: 6 }])).toBe(false)
  })
})

describe('effectiveSeasonRows', () => {
  const catalog = [{ seasonNumber: 1, episodes: 5 }]

  it('uses user when non-empty', () => {
    const user = [{ seasonNumber: 1, episodes: 12 }]

    expect(effectiveSeasonRows(catalog, user)).toEqual([{ seasonNumber: 1, episodes: 12 }])
  })

  it('falls back to catalog when user empty or null', () => {
    expect(effectiveSeasonRows(catalog, null)).toEqual(catalog)
    expect(effectiveSeasonRows(catalog, [])).toEqual(catalog)
  })

  it('empty when neither has rows', () => {
    expect(effectiveSeasonRows(null, null)).toEqual([])
  })
})

describe('parseQuickSeasonBreakdownInput', () => {
  it('parses multiline season x episode count', () => {
    const text = '1x22\n2x22\n3x16'
    const r = parseQuickSeasonBreakdownInput(text)

    expect(r).toEqual([
      { seasonNumber: 1, episodes: 22 },
      { seasonNumber: 2, episodes: 22 },
      { seasonNumber: 3, episodes: 16 },
    ])
  })

  it('rejects duplicate season numbers', () => {
    expect(parseQuickSeasonBreakdownInput('1x5\n1x6')).toBeNull()
  })

  it('rejects invalid line', () => {
    expect(parseQuickSeasonBreakdownInput('1x5\nbad')).toBeNull()
  })
})

describe('displaySeasonGrid', () => {
  const catalog = [
    { seasonNumber: 1, episodes: 5 },
    { seasonNumber: 2, episodes: 8 },
  ]
  const user = [
    { seasonNumber: 1, episodes: 12 },
    { seasonNumber: 2, episodes: 1 },
  ]

  it('AUTO picks user when both', () => {
    expect(displaySeasonGrid(catalog, user, 'AUTO')).toEqual(sortSeasonBreakdown([...user]))
  })

  it('CATALOG forces catalog', () => {
    expect(displaySeasonGrid(catalog, user, 'CATALOG')).toEqual(sortSeasonBreakdown([...catalog]))
  })

  it('USER forces user', () => {
    expect(displaySeasonGrid(catalog, user, 'USER')).toEqual(sortSeasonBreakdown([...user]))
  })
})

describe('effectiveEpisodicCounts', () => {
  it('catalog only: counts from displaySeasonGrid (sum of seasonBreakdown), not media scalars', () => {
    expect(effectiveEpisodicCounts([{ seasonNumber: 1, episodes: 5 }], null, null, 2, 13)).toEqual({
      seasonsCount: 1,
      episodesCount: 5,
    })
  })

  it('falls back to media seasons/episodes when grid is empty on both sides', () => {
    expect(effectiveEpisodicCounts(null, null, null, 2, 13)).toEqual({
      seasonsCount: 2,
      episodesCount: 13,
    })
  })

  it('sums from user grid when user specified structure', () => {
    const user = [
      { seasonNumber: 1, episodes: 7 },
      { seasonNumber: 2, episodes: 8 },
    ]

    expect(effectiveEpisodicCounts([{ seasonNumber: 1, episodes: 5 }], user, 'USER', 2, 13)).toEqual({
      seasonsCount: 2,
      episodesCount: 15,
    })
  })

  it('CATALOG uses catalog counts from grid', () => {
    const catalog = [
      { seasonNumber: 1, episodes: 5 },
      { seasonNumber: 2, episodes: 8 },
    ]
    const user = [{ seasonNumber: 1, episodes: 99 }]

    expect(effectiveEpisodicCounts(catalog, user, 'CATALOG', 2, 13)).toEqual({ seasonsCount: 2, episodesCount: 13 })
  })
})
