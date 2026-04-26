import { describe, expect, it } from 'vitest'

import { emptyMediaFiltersState, resolveGenreSlugs } from '$shared/lib/media-filters'
import {
  buildBoardItemsApiUrl,
  buildListItemsApiUrl,
  parseMediaFiltersFromSearchParams,
  writeMediaFiltersToSearchParams,
} from '$shared/lib/media-filters-url'

describe('parseMediaFiltersFromSearchParams', () => {
  it('parses legacy single genre and status', () => {
    const u = new URLSearchParams()

    u.set('genre', 'sci-fi')
    u.set('status', 'PLAN_TO_WATCH')

    const s = parseMediaFiltersFromSearchParams(u, { defaultSort: null })

    expect(s.genre).toBe('sci-fi')
    expect(s.status).toBe('PLAN_TO_WATCH')
    expect(resolveGenreSlugs(s)).toContain('sci-fi')
  })

  it('parses multi genres and statuses', () => {
    const u = new URLSearchParams()

    u.set('genres', 'drama,comedy')
    u.set('statuses', 'WATCHED,IN_PROGRESS')

    const s = parseMediaFiltersFromSearchParams(u, { defaultSort: null })

    expect(s.genres).toEqual(['drama', 'comedy'])
    expect(s.statuses).toEqual(['WATCHED', 'IN_PROGRESS'])
  })

  it('parses duration and countries', () => {
    const u = new URLSearchParams()

    u.set('durationFrom', '45')
    u.set('durationTo', '120')
    u.set('countries', 'us, jp')

    const s = parseMediaFiltersFromSearchParams(u, { defaultSort: null })

    expect(s.durationFrom).toBe(45)
    expect(s.durationTo).toBe(120)
    expect(s.countries).toEqual(['US', 'JP'])
  })
})

describe('writeMediaFiltersToSearchParams', () => {
  it('round-trips core fields', () => {
    const a = emptyMediaFiltersState()

    a.q = 'matrix'
    a.yearFrom = 1990
    a.yearTo = 2000
    a.types = ['MOVIE']
    a.genreMatchMode = 'and'
    a.listIds = ['a', 'b']

    const p = new URLSearchParams()

    writeMediaFiltersToSearchParams(p, a, { defaultSort: 'added_desc' })

    const b = parseMediaFiltersFromSearchParams(p, { defaultSort: 'added_desc' })

    expect(b.q).toBe('matrix')
    expect(b.yearFrom).toBe(1990)
    expect(b.yearTo).toBe(2000)
    expect(b.types).toEqual(['MOVIE'])
    expect(b.genreMatchMode).toBe('and')
    expect(b.listIds).toEqual(['a', 'b'])
  })
})

describe('buildListItemsApiUrl', () => {
  it('puts list id only in path', () => {
    const f = emptyMediaFiltersState()

    f.listId = 'should-not-appear'
    f.q = 'x'

    const url = buildListItemsApiUrl('list-uuid', f, { limit: 60 })

    expect(url).toContain('/api/lists/list-uuid/items')
    expect(url).toContain('limit=60')
    expect(url).toContain('q=x')
    expect(url).not.toContain('should-not-appear')
  })
})

describe('buildBoardItemsApiUrl', () => {
  it('includes listIds first', () => {
    const f = emptyMediaFiltersState()

    f.q = 'test'

    const url = buildBoardItemsApiUrl(['u1', 'u2'], f)

    expect(url.startsWith('/api/board/items?')).toBe(true)
    expect(url).toContain('listIds=u1%2Cu2')
    expect(url).toContain('q=test')
  })
})
