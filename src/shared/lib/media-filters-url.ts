import {
  type MediaFiltersState,
  emptyMediaFiltersState,
  normalizeCountryCodes,
  parseCommaList,
  parseGenreMatchMode,
  parseStatusesParameter,
  parseTypesParameter,
} from '$shared/lib/media-filters'

import type { WatchStatus } from '$shared/config/domain'

const parseIntOrNull = (raw: string | null): number | null => {
  if (raw == null || raw === '') return null

  const n = Number.parseInt(raw, 10)

  return Number.isNaN(n) ? null : n
}

/** Keys managed by media filters (route-agnostic). Caller may preserve other params. */
export const MEDIA_FILTER_PARAM_KEYS = [
  'q',
  'genre',
  'genres',
  'status',
  'statuses',
  'types',
  'yearFrom',
  'yearTo',
  'durationFrom',
  'durationTo',
  'countries',
  'sort',
  'genreMode',
  'listIds',
  'list',
] as const

export const parseMediaFiltersFromSearchParams = (
  searchParams: URLSearchParams,
  options?: { defaultSort?: string | null },
): MediaFiltersState => {
  const state = emptyMediaFiltersState()

  state.q = searchParams.get('q')?.trim() || null

  state.genre = searchParams.get('genre')?.trim() || null

  const genresParameter = searchParams.get('genres')

  state.genres = parseCommaList(genresParameter).map((g) => g.toLowerCase().replaceAll(' ', '-'))

  const statusRaw = searchParams.get('status')?.trim().toUpperCase()

  state.status =
    statusRaw && (['WATCHED', 'IN_PROGRESS', 'PLAN_TO_WATCH'] as const).includes(statusRaw as WatchStatus)
      ? (statusRaw as WatchStatus)
      : null

  state.statuses = parseStatusesParameter(searchParams.get('statuses'))

  state.types = parseTypesParameter(searchParams.get('types'))

  state.yearFrom = parseIntOrNull(searchParams.get('yearFrom'))
  state.yearTo = parseIntOrNull(searchParams.get('yearTo'))
  state.durationFrom = parseIntOrNull(searchParams.get('durationFrom'))
  state.durationTo = parseIntOrNull(searchParams.get('durationTo'))

  state.countries = normalizeCountryCodes(parseCommaList(searchParams.get('countries')))

  const sort = searchParams.get('sort')?.trim() || null

  state.sort = sort && sort.length > 0 ? sort : (options?.defaultSort ?? null)

  state.genreMatchMode = parseGenreMatchMode(searchParams.get('genreMode'))

  state.listIds = parseCommaList(searchParams.get('listIds')).filter((id) => id.length > 0)

  const list = searchParams.get('list')?.trim()

  state.listId = list && list.length > 0 ? list : null

  return state
}

const appendListParameter = (params: URLSearchParams, key: string, values: string[]) => {
  if (values.length === 0) return

  params.set(key, values.join(','))
}

const normalizedGenreSlugsForWrite = (state: MediaFiltersState): string[] => {
  const genreSlugs = [...state.genres]

  if (state.genre?.trim()) {
    const g = state.genre.trim().toLowerCase().replaceAll(' ', '-')

    if (g && !genreSlugs.includes(g)) genreSlugs.unshift(g)
  }

  return genreSlugs
}

const writeGenreQueryParams = (params: URLSearchParams, state: MediaFiltersState) => {
  const genreSlugs = normalizedGenreSlugsForWrite(state)

  if (genreSlugs.length > 1) {
    appendListParameter(params, 'genres', genreSlugs)
  } else if (genreSlugs.length === 1) {
    params.set('genre', genreSlugs[0]!)
  }
}

const resolvedStatusesForWrite = (state: MediaFiltersState): WatchStatus[] => {
  if (state.statuses.length > 0) return state.statuses

  if (state.status) return [state.status]

  return []
}

const writeStatusQueryParams = (params: URLSearchParams, state: MediaFiltersState) => {
  const statuses = resolvedStatusesForWrite(state)

  if (statuses.length > 1) {
    appendListParameter(params, 'statuses', statuses)
  } else if (statuses.length === 1) {
    params.set('status', statuses[0]!)
  }
}

const writeRangeAndListQueryParams = (params: URLSearchParams, state: MediaFiltersState, defaultSort: string) => {
  if (state.types.length > 0) appendListParameter(params, 'types', state.types)

  if (state.yearFrom != null) params.set('yearFrom', String(state.yearFrom))

  if (state.yearTo != null) params.set('yearTo', String(state.yearTo))

  if (state.durationFrom != null) params.set('durationFrom', String(state.durationFrom))

  if (state.durationTo != null) params.set('durationTo', String(state.durationTo))

  if (state.countries.length > 0) appendListParameter(params, 'countries', state.countries)

  if (state.sort && state.sort !== defaultSort) params.set('sort', state.sort)

  if (state.genreMatchMode === 'and') params.set('genreMode', 'and')

  if (state.listIds.length > 0) appendListParameter(params, 'listIds', state.listIds)

  if (state.listId) params.set('list', state.listId)
}

//
// Writes filter state into URLSearchParams. Omits defaults / empty values.
// Does not clear unrelated params — merge into existing URL on the caller side.
//
export const writeMediaFiltersToSearchParams = (
  params: URLSearchParams,
  state: MediaFiltersState,
  options?: { defaultSort?: string | null },
) => {
  const defaultSort = options?.defaultSort ?? 'added_desc'

  for (const key of MEDIA_FILTER_PARAM_KEYS) {
    params.delete(key)
  }

  if (state.q?.trim()) params.set('q', state.q.trim())

  writeGenreQueryParams(params, state)
  writeStatusQueryParams(params, state)
  writeRangeAndListQueryParams(params, state, defaultSort)
}

export const mediaFiltersToQueryString = (
  state: MediaFiltersState,
  options?: { defaultSort?: string | null },
): string => {
  const params = new URLSearchParams()

  writeMediaFiltersToSearchParams(params, state, options)

  const s = params.toString()

  return s
}

/** GET `/api/lists/:id/items` — list id is path-only; omit `list` / `listIds` from query. */
export const buildListItemsApiUrl = (
  listId: string,
  filterState: MediaFiltersState,
  options: { limit: number },
): string => {
  const params = new URLSearchParams()

  params.set('limit', String(options.limit))
  writeMediaFiltersToSearchParams(params, { ...filterState, listId: null, listIds: [] }, { defaultSort: 'added_desc' })

  return `/api/lists/${listId}/items?${params}`
}

/** GET `/api/board/items` — `listIds` required; other filters in `filterState` (without `listIds`). */
export const buildBoardItemsApiUrl = (listIds: string[], filterState: MediaFiltersState): string => {
  const params = new URLSearchParams()

  writeMediaFiltersToSearchParams(params, { ...filterState, listIds: [] }, { defaultSort: null })
  params.set('listIds', listIds.join(','))

  return `/api/board/items?${params}`
}
