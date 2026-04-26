import { describe, expect, it } from 'vitest'

import { seasonProgressRowsForGrid } from './episodic-progress'

const grid3 = [
  { seasonNumber: 1, episodes: 22 },
  { seasonNumber: 2, episodes: 22 },
  { seasonNumber: 3, episodes: 22 },
]

describe('seasonProgressRowsForGrid', () => {
  it('WATCHED: all rows done with full fill', () => {
    const rows = seasonProgressRowsForGrid(grid3, 'WATCHED', 1, 1)

    expect(rows).toHaveLength(3)
    for (const r of rows) {
      expect(r.highlight).toBe('done')
      expect(r.fillRatio).toBe(1)
      expect(r.watchedInSeason).toBe(r.episodes)
    }
  })

  it('PLAN_TO_WATCH: all none', () => {
    const rows = seasonProgressRowsForGrid(grid3, 'PLAN_TO_WATCH', 1, 5)

    expect(rows.every((r) => r.highlight === 'none' && r.fillRatio === 0)).toBe(true)
  })

  it('IN_PROGRESS: prior seasons done, current in_progress with partial fill', () => {
    const rows = seasonProgressRowsForGrid(grid3, 'IN_PROGRESS', 2, 10)
    const s1 = rows.find((r) => r.seasonNumber === 1)
    const s2 = rows.find((r) => r.seasonNumber === 2)
    const s3 = rows.find((r) => r.seasonNumber === 3)

    expect(s1?.highlight).toBe('done')
    expect(s2?.highlight).toBe('in_progress')
    expect(s2?.watchedInSeason).toBe(9)
    expect(s2?.fillRatio).toBeCloseTo(9 / 22, 5)
    expect(s3?.highlight).toBe('none')
  })

  it('IN_PROGRESS: end of S3, next S4E1 — S3 done', () => {
    const rows = seasonProgressRowsForGrid(grid3, 'IN_PROGRESS', 4, 1)

    expect(rows.find((r) => r.seasonNumber === 3)?.highlight).toBe('done')
  })

  it('IN_PROGRESS: currentSeason null uses season 1', () => {
    const g = [{ seasonNumber: 1, episodes: 10 }]
    const rows = seasonProgressRowsForGrid(g, 'IN_PROGRESS', null, 3)

    expect(rows[0]?.highlight).toBe('in_progress')
    expect(rows[0]?.watchedInSeason).toBe(2)
  })

  it('IN_PROGRESS: current season full → done for that row', () => {
    const g = [{ seasonNumber: 1, episodes: 5 }]
    const rows = seasonProgressRowsForGrid(g, 'IN_PROGRESS', 1, 6)

    expect(rows[0]?.highlight).toBe('done')
    expect(rows[0]?.watchedInSeason).toBe(5)
  })
})
