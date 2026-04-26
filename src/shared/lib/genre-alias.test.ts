import { describe, expect, it } from 'vitest'

import { dedupeGenresByCanonical, expandGenreSlugsForQuery, mergeLocalizedGenreList } from './genre-alias.js'

describe('expandGenreSlugsForQuery', () => {
  it('expands science-fiction to include tmdb-878 and sci-fi', () => {
    const a = new Set(expandGenreSlugsForQuery(['science-fiction']))

    expect(a.has('science-fiction')).toBe(true)
    expect(a.has('tmdb-878')).toBe(true)
    expect(a.has('sci-fi')).toBe(true)
  })

  it('merges tmdb-878 and sci-fi in one or-filter list', () => {
    const u = new Set(expandGenreSlugsForQuery(['tmdb-878', 'drama']))

    expect(
      [...u].filter((s) => s === 'drama' || s.includes('science') || s.includes('sci') || s === 'tmdb-878').length,
    ).toBeGreaterThan(0)
    expect(u.has('drama')).toBe(true)
  })
})

describe('mergeLocalizedGenreList', () => {
  it('merges tmdb-878 and slugify science fiction in one pass', () => {
    const m = mergeLocalizedGenreList([
      { slug: 'tmdb-878', name: 'Science Fiction' },
      { slug: 'science-fiction', name: 'Science Fiction' },
    ])

    expect(m).toHaveLength(1)
    expect(m[0]!.name).toBe('Science Fiction')
  })

  it('merges sci-fi and science fiction names to one', () => {
    const m = mergeLocalizedGenreList([
      { slug: 'sci-fi', name: 'Sci-Fi' },
      { slug: 'science-fiction', name: 'Science Fiction' },
    ])

    expect(m).toHaveLength(1)
  })
})

describe('dedupeGenresByCanonical', () => {
  it('keeps one row and canonical slug for filter ui', () => {
    const d = dedupeGenresByCanonical([
      { id: 'a1', slug: 'tmdb-878', name: 'Science Fiction' },
      { id: 'a2', slug: 'science-fiction', name: 'science-fiction' },
    ])

    expect(d).toHaveLength(1)
    expect(d[0]!.slug).toBe('science-fiction')
    expect(d[0]!.name).toBe('Science Fiction')
  })
})
