import { describe, expect, it } from 'vitest'

import { emptyMediaFiltersState, resolveGenreSlugs } from './media-filters'
import {
  advancedDraftFromFilters,
  advancedDraftToFilterPatch,
  buildResetMediaFiltersState,
  finalizeMediaFiltersForSurface,
  getMediaFilterChipRemovePatch,
  mergeNavigateMediaFilters,
  parseFiltersForSurface,
  patchToggleGenreSlug,
} from './media-filters-surface'

describe('parseFiltersForSurface', () => {
  it('uses added_desc default for home and wheel, not for board', () => {
    const u = new URLSearchParams()

    expect(parseFiltersForSurface(u, 'home').sort).toBe('added_desc')
    expect(parseFiltersForSurface(u, 'wheel').sort).toBe('added_desc')
    expect(parseFiltersForSurface(u, 'board').sort).toBeNull()
  })
})

describe('finalizeMediaFiltersForSurface (board)', () => {
  it('forces AND when multiple genres', () => {
    const s = emptyMediaFiltersState()

    s.genre = 'a'
    s.genres = ['b']
    s.genreMatchMode = 'or'
    finalizeMediaFiltersForSurface(s, 'board')
    expect(s.genreMatchMode).toBe('and')
  })

  it('does not change genre mode on home', () => {
    const s = emptyMediaFiltersState()

    s.genre = 'a'
    s.genres = ['b']
    s.genreMatchMode = 'or'
    finalizeMediaFiltersForSurface(s, 'home')
    expect(s.genreMatchMode).toBe('or')
  })
})

describe('getMediaFilterChipRemovePatch', () => {
  it('returns undefined for list chip on home', () => {
    const base = emptyMediaFiltersState()

    expect(getMediaFilterChipRemovePatch({ kind: 'list', id: 'list:x', label: 'x' }, base, 'home')).toBeUndefined()
  })

  it('clears listIds for list chip on board', () => {
    const base = emptyMediaFiltersState()

    base.listIds = ['a', 'b']
    expect(getMediaFilterChipRemovePatch({ kind: 'list', id: 'lists:a,b', label: '2' }, base, 'board')).toEqual({
      listIds: [],
    })
  })
})

describe('buildResetMediaFiltersState', () => {
  it('preserves home sort and listId', () => {
    const base = emptyMediaFiltersState()

    base.sort = 'title_asc'
    base.listId = 'list-1'
    base.q = 'x'
    const next = buildResetMediaFiltersState(base, 'home')

    expect(next.q).toBeNull()
    expect(next.sort).toBe('title_asc')
    expect(next.listId).toBe('list-1')
  })

  it('preserves board listIds', () => {
    const base = emptyMediaFiltersState()

    base.listIds = ['a']
    base.types = ['MOVIE']
    const next = buildResetMediaFiltersState(base, 'board')

    expect(next.listIds).toEqual(['a'])
    expect(next.types).toEqual([])
  })

  it('wheel uses preserve list id when base has no listId', () => {
    const base = emptyMediaFiltersState()

    base.q = 'x'
    const next = buildResetMediaFiltersState(base, 'wheel', { wheelPreserveListId: 'fallback' })

    expect(next.q).toBeNull()
    expect(next.listId).toBe('fallback')
  })
})

describe('advanced draft helpers', () => {
  it('round-trips numbers and countries', () => {
    const patch = advancedDraftToFilterPatch({
      yearFrom: '1999',
      yearTo: '2001',
      durationFrom: '90',
      durationTo: '120',
      countries: ['US'],
    })

    expect(patch).toMatchObject({
      yearFrom: 1999,
      yearTo: 2001,
      durationFrom: 90,
      durationTo: 120,
      countries: ['US'],
    })

    const back = advancedDraftFromFilters({
      ...emptyMediaFiltersState(),
      ...patch,
    })

    expect(back.yearFrom).toBe('1999')
    expect(back.countries).toEqual(['US'])
  })
})

describe('mergeNavigateMediaFilters', () => {
  it('applies board genre finalize after patch', () => {
    let url = new URL('https://example.com/board')

    url = mergeNavigateMediaFilters(url, patchToggleGenreSlug(emptyMediaFiltersState(), 'a'), 'board')
    let s = parseFiltersForSurface(url.searchParams, 'board')

    expect(s.genreMatchMode).toBe('or')

    url = mergeNavigateMediaFilters(url, patchToggleGenreSlug(s, 'b'), 'board')
    s = parseFiltersForSurface(url.searchParams, 'board')

    expect(resolveGenreSlugs(s)).toEqual(['a', 'b'])
    expect(s.genreMatchMode).toBe('and')
  })
})
