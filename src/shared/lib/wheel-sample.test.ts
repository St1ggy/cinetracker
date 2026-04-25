import { describe, expect, it } from 'vitest'

import { buildWheelSpinSectors, sampleWheelPreview, shuffleInPlace } from './wheel-sample'

const rngFromSeed = (seed: number) => {
  let state = seed

  return (maxExclusive: number) => {
    if (maxExclusive <= 1) return 0

    state = (state * 1_103_515_245 + 12_345) & 2_147_483_647

    return state % maxExclusive
  }
}

describe('sampleWheelPreview', () => {
  it('returns at most k items', () => {
    const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

    const out = sampleWheelPreview(pool, 2, rngFromSeed(42))

    expect(out).toHaveLength(2)
    expect(new Set(out.map((x) => x.id)).size).toBe(2)
  })

  it('returns empty for empty pool', () => {
    expect(sampleWheelPreview([], 5, rngFromSeed(1))).toEqual([])
  })
})

describe('buildWheelSpinSectors', () => {
  it('includes winner exactly once when pool > k', () => {
    const pool = Array.from({ length: 10 }, (_, index) => ({ id: `id-${index}` }))
    const randomInt = rngFromSeed(99)
    const winnerIndex = 3
    const k = 4

    const { sectors, winnerSectorIndex } = buildWheelSpinSectors(pool, winnerIndex, k, randomInt)

    expect(sectors).toHaveLength(k)
    expect(sectors.filter((s) => s.id === 'id-3')).toHaveLength(1)
    expect(sectors[winnerSectorIndex]?.id).toBe('id-3')
  })

  it('returns all items when pool.length <= k', () => {
    const pool = [{ id: 'a' }, { id: 'b' }]
    const randomInt = rngFromSeed(7)

    const { sectors, winnerSectorIndex } = buildWheelSpinSectors(pool, 1, 5, randomInt)

    expect(sectors).toHaveLength(2)
    expect(sectors[winnerSectorIndex]?.id).toBe('b')
  })

  it('throws on empty pool', () => {
    expect(() => buildWheelSpinSectors([], 0, 3, rngFromSeed(1))).toThrow()
  })
})

describe('shuffleInPlace', () => {
  it('permutes length', () => {
    const array = [1, 2, 3, 4, 5]

    shuffleInPlace(array, rngFromSeed(123))

    expect([...array].toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })
})
