import type { WatchStatus } from '$shared/config/domain'

/** When URL has no status filter, wheel defaults to plan-to-watch only if enough candidates exist. */
export const getAdaptiveDefaultStatuses = (items: { status?: WatchStatus | null }[]): WatchStatus[] => {
  let planToWatchCount = 0

  for (const item of items) {
    if ((item.status ?? 'PLAN_TO_WATCH') === 'PLAN_TO_WATCH') planToWatchCount += 1
  }

  return planToWatchCount >= 2 ? ['PLAN_TO_WATCH'] : []
}
