import {
  type MediaFilterChip,
  type MediaFiltersState,
  emptyMediaFiltersState,
  normalizeCountryCodes,
  resolveGenreSlugs,
  resolveStatuses,
} from './media-filters'
import { parseMediaFiltersFromSearchParams, writeMediaFiltersToSearchParams } from './media-filters-url'

import type { MediaType, WatchStatus } from '$shared/config/domain'

/** Where filter URL state is edited — shared rules + small per-surface differences. */
export type MediaFilterSurface = 'home' | 'board' | 'wheel'

/** `defaultSort` passed to parse/write for this surface (board omits sort in URL by default). */
export const mediaFilterDefaultSortForSurface = (surface: MediaFilterSurface): string | null =>
  surface === 'board' ? null : 'added_desc'

export const parseFiltersForSurface = (searchParams: URLSearchParams, surface: MediaFilterSurface): MediaFiltersState =>
  parseMediaFiltersFromSearchParams(searchParams, { defaultSort: mediaFilterDefaultSortForSurface(surface) })

/** Board: multi-genre defaults to AND match (kanban); home/wheel keep explicit `genreMatchMode`. */
export const finalizeMediaFiltersForSurface = (state: MediaFiltersState, surface: MediaFilterSurface): void => {
  if (surface !== 'board') return

  const g = resolveGenreSlugs(state)

  state.genreMatchMode = g.length > 1 ? 'and' : 'or'
}

export const patchToggleMediaType = (state: MediaFiltersState, type: MediaType): Pick<MediaFiltersState, 'types'> => {
  const t = state.types

  return { types: t.includes(type) ? t.filter((x) => x !== type) : [...t, type] }
}

export const patchToggleWatchStatus = (
  state: MediaFiltersState,
  status: WatchStatus,
): Pick<MediaFiltersState, 'statuses' | 'status'> => {
  const current = resolveStatuses(state) ?? []
  const next = current.includes(status) ? current.filter((x) => x !== status) : [...current, status]

  return { statuses: next, status: null }
}

export const patchToggleGenreSlug = (
  state: MediaFiltersState,
  slug: string,
): Pick<MediaFiltersState, 'genre' | 'genres'> => {
  const slugs = resolveGenreSlugs(state)
  const next = slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [...slugs, slug]

  return {
    genre: next[0] ?? null,
    genres: next.length > 1 ? next.slice(1) : [],
  }
}

export const patchToggleCountryCode = (
  state: MediaFiltersState,
  code: string,
): Pick<MediaFiltersState, 'countries'> => {
  const u = code.trim().toUpperCase()

  if (u.length !== 2) {
    return { countries: [...state.countries] }
  }

  const set = new Set(state.countries.map((c) => c.toUpperCase()))

  if (set.has(u)) set.delete(u)
  else set.add(u)

  return { countries: normalizeCountryCodes([...set]) }
}

export type AdvancedDraftStrings = {
  yearFrom: string
  yearTo: string
  durationFrom: string
  durationTo: string
  countries: string[]
}

export const advancedDraftFromFilters = (f: MediaFiltersState): AdvancedDraftStrings => ({
  yearFrom: f.yearFrom == null ? '' : String(f.yearFrom),
  yearTo: f.yearTo == null ? '' : String(f.yearTo),
  durationFrom: f.durationFrom == null ? '' : String(f.durationFrom),
  durationTo: f.durationTo == null ? '' : String(f.durationTo),
  countries: [...f.countries],
})

export const advancedDraftToFilterPatch = (
  draft: AdvancedDraftStrings,
): Pick<MediaFiltersState, 'yearFrom' | 'yearTo' | 'durationFrom' | 'durationTo' | 'countries'> => {
  const yf = draft.yearFrom.trim() ? Number.parseInt(draft.yearFrom, 10) : null
  const yt = draft.yearTo.trim() ? Number.parseInt(draft.yearTo, 10) : null
  const df = draft.durationFrom.trim() ? Number.parseInt(draft.durationFrom, 10) : null
  const dt = draft.durationTo.trim() ? Number.parseInt(draft.durationTo, 10) : null

  return {
    yearFrom: yf != null && !Number.isNaN(yf) ? yf : null,
    yearTo: yt != null && !Number.isNaN(yt) ? yt : null,
    durationFrom: df != null && !Number.isNaN(df) ? df : null,
    durationTo: dt != null && !Number.isNaN(dt) ? dt : null,
    countries: [...draft.countries],
  }
}

export const clearAdvancedFilterPatch = (): Pick<
  MediaFiltersState,
  'yearFrom' | 'yearTo' | 'durationFrom' | 'durationTo' | 'countries'
> => ({
  yearFrom: null,
  yearTo: null,
  durationFrom: null,
  durationTo: null,
  countries: [],
})

export type MediaFilterResetOptions = {
  /** Wheel: when URL has no `list`, keep this list id after reset */
  wheelPreserveListId?: string | null
}

export const buildResetMediaFiltersState = (
  base: MediaFiltersState,
  surface: MediaFilterSurface,
  options?: MediaFilterResetOptions,
): MediaFiltersState => {
  const next = emptyMediaFiltersState()

  if (surface === 'home') {
    next.sort = base.sort
    next.listId = base.listId
  } else if (surface === 'board') {
    next.listIds = base.listIds
  } else {
    next.listId = base.listId ?? options?.wheelPreserveListId ?? null
  }

  finalizeMediaFiltersForSurface(next, surface)

  return next
}

export const getMediaFilterChipRemovePatch = (
  chip: MediaFilterChip,
  base: MediaFiltersState,
  surface: MediaFilterSurface,
): Partial<MediaFiltersState> | undefined => {
  switch (chip.kind) {
    case 'q': {
      return { q: null }
    }

    case 'genre': {
      const slug = chip.id.slice('genre:'.length)
      const slugs = resolveGenreSlugs(base).filter((s) => s !== slug)

      return {
        genre: slugs[0] ?? null,
        genres: slugs.length > 1 ? slugs.slice(1) : [],
      }
    }

    case 'status': {
      const st = chip.id.slice('status:'.length) as WatchStatus
      const currentStatuses = resolveStatuses(base) ?? []

      return {
        statuses: currentStatuses.filter((s) => s !== st),
        status: null,
      }
    }

    case 'type': {
      const t = chip.id.slice('type:'.length) as MediaType

      return { types: base.types.filter((x) => x !== t) }
    }

    case 'year': {
      return { yearFrom: null, yearTo: null }
    }

    case 'duration': {
      return { durationFrom: null, durationTo: null }
    }

    case 'country': {
      const c = chip.id.slice('country:'.length)

      return { countries: base.countries.filter((x) => x !== c) }
    }

    case 'sort': {
      if (surface !== 'home') return undefined

      return { sort: null }
    }

    case 'genreMode': {
      return { genreMatchMode: 'or' }
    }

    case 'list': {
      if (surface === 'board') return { listIds: [] }

      if (surface === 'wheel') return { listId: null }

      return undefined
    }

    default: {
      return undefined
    }
  }
}

export const mergeNavigateMediaFilters = (
  pageUrl: URL,
  patch: Partial<MediaFiltersState>,
  surface: MediaFilterSurface,
): URL => {
  const defaultSort = mediaFilterDefaultSortForSurface(surface)
  const base = parseMediaFiltersFromSearchParams(pageUrl.searchParams, { defaultSort })
  const next: MediaFiltersState = { ...base, ...patch }

  finalizeMediaFiltersForSurface(next, surface)
  const url = new URL(pageUrl)

  writeMediaFiltersToSearchParams(url.searchParams, next, { defaultSort })

  return url
}
