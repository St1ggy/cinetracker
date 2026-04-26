import { describe, expect, it } from 'vitest'

import { getAdaptiveDefaultStatuses } from '$shared/lib/wheel-adaptive-statuses'

describe('getAdaptiveDefaultStatuses', () => {
  it('returns PLAN_TO_WATCH only when at least two plan items', () => {
    expect(getAdaptiveDefaultStatuses([{ status: 'PLAN_TO_WATCH' }, { status: 'PLAN_TO_WATCH' }])).toEqual([
      'PLAN_TO_WATCH',
    ])
    expect(getAdaptiveDefaultStatuses([{ status: 'PLAN_TO_WATCH' }])).toEqual([])
    expect(getAdaptiveDefaultStatuses([{ status: null }, { status: null }])).toEqual(['PLAN_TO_WATCH'])
  })
})
