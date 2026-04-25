/** `randomInt(n)` returns uniform integer in `[0, n)`. */
export type RandomIntFunction = (maxExclusive: number) => number

export type WheelSampleId = { id: string }

/** Fisher–Yates shuffle in-place using `randomInt`. */
export function shuffleInPlace<T>(items: T[], randomInt: RandomIntFunction): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const temporary = items[index]!

    items[index] = items[swapIndex]!
    items[swapIndex] = temporary
  }
}

/** Random `k` distinct items from `pool` (copy), for wheel preview between spins. */
export function sampleWheelPreview<T extends WheelSampleId>(
  pool: readonly T[],
  k: number,
  randomInt: RandomIntFunction,
): T[] {
  if (pool.length === 0 || k <= 0) return []

  const take = Math.min(k, pool.length)
  const copy = [...pool]

  shuffleInPlace(copy, randomInt)

  return copy.slice(0, take)
}

// Build `k` wheel sectors containing `pool[winnerIndex]`, shuffle order.
// When `pool.length <= k`, returns all items shuffled; `winnerSectorIndex` locates the winner.
export function buildWheelSpinSectors<T extends WheelSampleId>(
  pool: readonly T[],
  winnerIndex: number,
  k: number,
  randomInt: RandomIntFunction,
): { sectors: T[]; winnerSectorIndex: number } {
  if (pool.length === 0) {
    throw new Error('buildWheelSpinSectors: empty pool')
  }

  if (winnerIndex < 0 || winnerIndex >= pool.length) {
    throw new Error('buildWheelSpinSectors: winnerIndex out of range')
  }

  const winner = pool[winnerIndex]!

  if (pool.length <= k) {
    const sectors = [...pool]

    shuffleInPlace(sectors, randomInt)
    const winnerSectorIndex = sectors.findIndex((item) => item.id === winner.id)

    return { sectors, winnerSectorIndex }
  }

  const others = pool.filter((_, index) => index !== winnerIndex)

  const idxs = others.map((_, index) => index)

  shuffleInPlace(idxs, randomInt)
  const picked = idxs.slice(0, k - 1).map((index) => others[index]!)

  const sectors = [winner, ...picked]

  shuffleInPlace(sectors, randomInt)
  const winnerSectorIndex = sectors.findIndex((item) => item.id === winner.id)

  return { sectors, winnerSectorIndex }
}
