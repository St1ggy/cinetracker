import { MEDIA_TYPES, WATCH_STATUSES } from '$shared/config/domain'

import type { MediaType, WatchStatus } from '$shared/config/domain'

export type GenreMatchMode = 'and' | 'or'

/** Canonical filter state shared across home / board / wheel. */
export type MediaFiltersState = {
  q: string | null
  /** Legacy single genre slug (URL `genre`); merged into `genres` when parsing. */
  genre: string | null
  genres: string[]
  /** Legacy single status (URL `status`). */
  status: WatchStatus | null
  statuses: WatchStatus[]
  types: MediaType[]
  yearFrom: number | null
  yearTo: number | null
  durationFrom: number | null
  durationTo: number | null
  countries: string[]
  sort: string | null
  genreMatchMode: GenreMatchMode
  /** Board: selected list UUIDs; empty = all lists (not serialized). */
  listIds: string[]
  /** Wheel / optional: single list UUID. */
  listId: string | null
}

export const emptyMediaFiltersState = (): MediaFiltersState => ({
  q: null,
  genre: null,
  genres: [],
  status: null,
  statuses: [],
  types: [],
  yearFrom: null,
  yearTo: null,
  durationFrom: null,
  durationTo: null,
  countries: [],
  sort: null,
  genreMatchMode: 'or',
  listIds: [],
  listId: null,
})

const isWatchStatus = (value: string): value is WatchStatus => (WATCH_STATUSES as readonly string[]).includes(value)

const isMediaType = (value: string): value is MediaType => (MEDIA_TYPES as readonly string[]).includes(value)

export const parseCommaList = (raw: string | null | undefined): string[] =>
  raw
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? []

/** Split and validate watch statuses (order preserved, deduped). */
export const parseStatusesParameter = (raw: string | null | undefined): WatchStatus[] => {
  const out: WatchStatus[] = []
  const seen = new Set<string>()

  for (const part of parseCommaList(raw)) {
    const upper = part.toUpperCase()

    if (isWatchStatus(upper) && !seen.has(upper)) {
      seen.add(upper)
      out.push(upper)
    }
  }

  return out
}

/** Split and validate media types. */
export const parseTypesParameter = (raw: string | null | undefined): MediaType[] => {
  const out: MediaType[] = []
  const seen = new Set<string>()

  for (const part of parseCommaList(raw)) {
    const upper = part.toUpperCase()

    if (isMediaType(upper) && !seen.has(upper)) {
      seen.add(upper)
      out.push(upper)
    }
  }

  return out
}

export const parseGenreMatchMode = (raw: string | null | undefined): GenreMatchMode => (raw === 'and' ? 'and' : 'or')

export const normalizeCountryCodes = (codes: string[]): string[] => {
  const out: string[] = []
  const seen = new Set<string>()

  for (const c of codes) {
    const u = c.trim().toUpperCase()

    if (u.length === 2 && !seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }

  return out
}

// Resolved genres for API/repository: merges legacy `genre` with `genres`, normalizes slugs.
export const resolveGenreSlugs = (state: Pick<MediaFiltersState, 'genre' | 'genres'>): string[] => {
  const fromMulti = state.genres.map((g) => g.toLowerCase().replaceAll(' ', '-').trim()).filter(Boolean)
  const legacy = state.genre?.toLowerCase().replaceAll(' ', '-').trim()

  if (legacy && !fromMulti.includes(legacy)) return [legacy, ...fromMulti]

  return fromMulti
}

// Resolved statuses: prefers explicit `statuses`; falls back to legacy `status`.
export const resolveStatuses = (state: Pick<MediaFiltersState, 'status' | 'statuses'>): WatchStatus[] | undefined => {
  if (state.statuses.length > 0) return state.statuses

  if (state.status) return [state.status]

  return undefined
}

export type MediaFilterChipKind =
  | 'q'
  | 'genre'
  | 'status'
  | 'type'
  | 'year'
  | 'duration'
  | 'country'
  | 'sort'
  | 'genreMode'
  | 'list'

export type MediaFilterChip = {
  kind: MediaFilterChipKind
  id: string
  label: string
}

/** Structured chips for UI (labels are already localized by caller if needed). */
export const collectMediaFilterChips = (
  state: MediaFiltersState,
  labels: {
    genreName?: (slug: string) => string | undefined
    statusName: (s: WatchStatus) => string
    typeName: (t: MediaType) => string
    sortName?: (sort: string) => string | undefined
    genreModeAnd: string
    listTitle?: (id: string) => string | undefined
    listIdsCount?: (count: number) => string
  },
): MediaFilterChip[] => {
  const chips: MediaFilterChip[] = []

  if (state.q?.trim()) {
    chips.push({ kind: 'q', id: 'q', label: state.q.trim() })
  }

  const slugs = resolveGenreSlugs(state)

  for (const slug of slugs) {
    chips.push({
      kind: 'genre',
      id: `genre:${slug}`,
      label: labels.genreName?.(slug) ?? slug,
    })
  }

  const st = resolveStatuses(state)

  if (st) {
    for (const s of st) {
      chips.push({ kind: 'status', id: `status:${s}`, label: labels.statusName(s) })
    }
  }

  for (const t of state.types) {
    chips.push({ kind: 'type', id: `type:${t}`, label: labels.typeName(t) })
  }

  if (state.yearFrom != null || state.yearTo != null) {
    const a = state.yearFrom ?? '…'
    const b = state.yearTo ?? '…'

    chips.push({ kind: 'year', id: 'year', label: `${a}–${b}` })
  }

  if (state.durationFrom != null || state.durationTo != null) {
    const a = state.durationFrom ?? '…'
    const b = state.durationTo ?? '…'

    chips.push({ kind: 'duration', id: 'duration', label: `${a}–${b} min` })
  }

  for (const c of state.countries) {
    chips.push({ kind: 'country', id: `country:${c}`, label: c })
  }

  if (state.sort && state.sort !== 'added_desc') {
    chips.push({
      kind: 'sort',
      id: 'sort',
      label: labels.sortName?.(state.sort) ?? state.sort,
    })
  }

  if (state.genreMatchMode === 'and' && slugs.length > 1) {
    chips.push({ kind: 'genreMode', id: 'genreMode', label: labels.genreModeAnd })
  }

  if (state.listId) {
    chips.push({
      kind: 'list',
      id: `list:${state.listId}`,
      label: labels.listTitle?.(state.listId) ?? state.listId,
    })
  }

  if (state.listIds.length > 0) {
    chips.push({
      kind: 'list',
      id: `lists:${state.listIds.toSorted((a, b) => a.localeCompare(b)).join(',')}`,
      label: labels.listIdsCount?.(state.listIds.length) ?? String(state.listIds.length),
    })
  }

  return chips
}

export const mediaFiltersHasAdvanced = (state: MediaFiltersState): boolean =>
  state.yearFrom != null ||
  state.yearTo != null ||
  state.durationFrom != null ||
  state.durationTo != null ||
  state.countries.length > 0 ||
  state.types.length > 0 ||
  (resolveGenreSlugs(state).length > 1 && state.genreMatchMode === 'and')

/** Params for `listsRepository.findItemsByListWithFilters` / `findItemsByListIds` (media + status slice). */
export type ListItemsFilterRepoParams = {
  q?: string
  yearFrom?: number
  yearTo?: number
  genresFilter?: string[]
  genreMatchMode?: GenreMatchMode
  types?: MediaType[]
  cast?: string[]
  statuses?: WatchStatus[]
  durationFrom?: number
  durationTo?: number
  countries?: string[]
}

export const mediaFiltersToRepoParams = (state: MediaFiltersState): ListItemsFilterRepoParams => {
  const out: ListItemsFilterRepoParams = {}
  const q = state.q?.trim()

  if (q) out.q = q

  if (state.yearFrom != null) out.yearFrom = state.yearFrom

  if (state.yearTo != null) out.yearTo = state.yearTo

  const genres = resolveGenreSlugs(state)

  if (genres.length > 0) out.genresFilter = genres

  if (state.genreMatchMode === 'and') out.genreMatchMode = 'and'

  if (state.types.length > 0) out.types = state.types

  const st = resolveStatuses(state)

  if (st && st.length > 0) out.statuses = st

  if (state.durationFrom != null) out.durationFrom = state.durationFrom

  if (state.durationTo != null) out.durationTo = state.durationTo

  if (state.countries.length > 0) out.countries = state.countries

  return out
}

export const mediaFiltersHasAny = (state: MediaFiltersState): boolean =>
  !!state.q?.trim() ||
  resolveGenreSlugs(state).length > 0 ||
  (resolveStatuses(state)?.length ?? 0) > 0 ||
  state.types.length > 0 ||
  state.yearFrom != null ||
  state.yearTo != null ||
  state.durationFrom != null ||
  state.durationTo != null ||
  state.countries.length > 0 ||
  (state.sort != null && state.sort !== '' && state.sort !== 'added_desc') ||
  state.listId != null ||
  state.listIds.length > 0 ||
  (state.genreMatchMode === 'and' && resolveGenreSlugs(state).length > 1)
