import type { EmblaCarouselType } from 'embla-carousel'

// Tunes Embla ScrollBody like before: strong initial pull, longer runs with a bit more glide.
// Tamer than the old jolt=16 + friction→0.98: that pair caused overshoot / wobble (felt “springy”).
// - `jolt` (useDuration) ~36: slightly softer start than 32; still snappier than reInit’s 1s–5s.
// - `coast` stays near default 0.68 and is capped to avoid a friction runaway on long spins.
export const applyWheelStripSpinPhysics = (api: EmblaCarouselType, targetTotalDurationMs: number): void => {
  const { scrollBody } = api.internalEngine()
  const total = Math.min(5000, Math.max(1000, targetTotalDurationMs))
  const t = (total - 1000) / 4000
  const jolt = 36
  const coast = Math.min(0.84, 0.68 + 0.2 * t)

  scrollBody.useDuration(jolt).useFriction(coast)
}

/** Minimum scroll path length in px for a satisfying spin (viewport- and card-based). */
export const wheelStripMinTravelPx = (api: EmblaCarouselType): number => {
  const w = api.slideNodes()[0]?.getBoundingClientRect().width ?? 112
  const stride = w + 12
  const vw = api.rootNode().clientWidth

  return Math.max(vw * 2, stride * 5)
}

/** At least `minLaps` full Embla loop lengths (`limit.length`) before the strip may stop (caller may randomize). */
export const wheelStripMinSpinTravelPx = (api: EmblaCarouselType, minLaps = 3): number => {
  const base = wheelStripMinTravelPx(api)
  const period = api.internalEngine().limit.length

  if (period >= 0.1) {
    return Math.max(base, minLaps * period)
  }

  const w = api.slideNodes()[0]?.getBoundingClientRect().width ?? 112
  const stride = w + 12
  const slides = api.slideNodes().length
  const approxLap = slides > 0 ? slides * stride : stride

  return Math.max(base, minLaps * approxLap)
}

const tryDistanceForTargetSnap = (
  api: EmblaCarouselType,
  targetSnapIndex: number,
  D: number,
): { ok: boolean; scrollDistance: number } => {
  if (!Number.isFinite(D)) {
    return { ok: false, scrollDistance: 0 }
  }

  const t = api.internalEngine().scrollTarget.byDistance(D, true)

  return { ok: t.index === targetSnapIndex, scrollDistance: t.distance }
}

const scrollDistanceToWinner = (api: EmblaCarouselType, index: number, sign: 0 | 1 | -1): number =>
  api.internalEngine().scrollTarget.byIndex(index, sign).distance

const findScrollDistanceMeetingMinTravel = (
  api: EmblaCarouselType,
  targetSnapIndex: number,
  base: number,
  period: number,
  maxK: number,
  minTravel: number,
): number | null => {
  const r0 = tryDistanceForTargetSnap(api, targetSnapIndex, base)

  if (r0.ok && Math.abs(r0.scrollDistance) + 0.1 >= minTravel) {
    return r0.scrollDistance
  }

  for (let k = 1; k <= maxK; k += 1) {
    for (const rotSign of [-1, 1] as const) {
      const D = base + rotSign * k * period
      const r = tryDistanceForTargetSnap(api, targetSnapIndex, D)

      if (r.ok && Math.abs(r.scrollDistance) + 0.1 >= minTravel) {
        return r.scrollDistance
      }
    }
  }

  return null
}

// Picks a scroll distance so `scrollTo.distance(·, true)` ends on `targetSnapIndex`, at least
// `minTravel` when the loop period allows extra full rotations. With repeated list, index is
// 0..(copies * n - 1) for the duplicated strip.
export const findWheelStripSpinScrollDistance = (
  api: EmblaCarouselType,
  targetSnapIndex: number,
  minTravel: number,
): number => {
  const { scrollTarget, limit } = api.internalEngine()
  const period = limit.length

  if (period < 0.1) {
    return scrollTarget.byIndex(targetSnapIndex, 0).distance
  }

  const maxK = Math.min(80, Math.max(28, Math.ceil(minTravel / period) + 20))

  for (const sign of [0, -1, 1] as const) {
    const base = scrollDistanceToWinner(api, targetSnapIndex, sign)
    const hit = findScrollDistanceMeetingMinTravel(api, targetSnapIndex, base, period, maxK, minTravel)

    if (hit !== null) {
      return hit
    }
  }

  for (const sign of [0, -1, 1] as const) {
    const base = scrollDistanceToWinner(api, targetSnapIndex, sign)
    const r = tryDistanceForTargetSnap(api, targetSnapIndex, base)

    if (r.ok) {
      return r.scrollDistance
    }
  }

  return scrollDistanceToWinner(api, targetSnapIndex, 0)
}
