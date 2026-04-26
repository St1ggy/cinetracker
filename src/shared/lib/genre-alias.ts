// Deduplication rules for filter queries, UI, and imports — driven by `GenreAliasConfig` (app settings + default).

export type GenreAliasConfig = {
  groups: { canonical: string; displayName: string; slugs: string[] }[]
}

/** Baked-in example group; also the default if DB is empty or invalid. */
export const DEFAULT_GENRE_ALIAS_CONFIG: GenreAliasConfig = {
  groups: [
    {
      canonical: 'science-fiction',
      displayName: 'Science Fiction',
      slugs: ['tmdb-878', 'sci-fi', 'science-fiction', 'scifi', 'sciencefiction'],
    },
  ],
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replaceAll(' ', '-')
    .replaceAll(/[^a-z0-9-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '')

const slugifyGenreName = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '')

type RuntimeMaps = {
  variantToCanonical: Map<string, string>
  expandByCanonical: Record<string, string[]>
  displayByCanonical: Map<string, string>
}

const buildRuntimeMaps = (config: GenreAliasConfig): RuntimeMaps => {
  const variantToCanonical = new Map<string, string>()
  const expandByCanonical: Record<string, string[]> = {}
  const displayByCanonical = new Map<string, string>()

  for (const g of config.groups) {
    displayByCanonical.set(g.canonical, g.displayName)
    const expanded = [g.canonical, ...g.slugs]
    const unique = [...new Set(expanded)]

    expandByCanonical[g.canonical] = unique
    for (const raw of unique) {
      variantToCanonical.set(norm(raw), g.canonical)
    }
  }

  return { variantToCanonical, expandByCanonical, displayByCanonical }
}

const getMaps = (config: GenreAliasConfig = DEFAULT_GENRE_ALIAS_CONFIG) => buildRuntimeMaps(config)

const canonicalGenreKeyWithMaps = (slug: string, name: string, maps: RuntimeMaps) => {
  const a = norm(slug)

  if (a.length > 0) {
    const fromSlug = maps.variantToCanonical.get(a)

    if (fromSlug) return fromSlug
  }

  if (name) {
    const fromName = maps.variantToCanonical.get(slugifyGenreName(name))

    if (fromName) return fromName
  }

  if (a.length > 0) return a

  if (name) return slugifyGenreName(name) || a

  return a
}

/** @param config — omit to use the default (tests / SSR without layout data). */
export const canonicalGenreKeyFromInputs = (
  slug: string,
  name = '',
  config: GenreAliasConfig = DEFAULT_GENRE_ALIAS_CONFIG,
) => {
  const maps = getMaps(config)

  return canonicalGenreKeyWithMaps(slug, name, maps)
}

/** @param config — omit to use the default. */
export const expandGenreSlugsForQuery = (slugs: string[], config: GenreAliasConfig = DEFAULT_GENRE_ALIAS_CONFIG) => {
  const maps = getMaps(config)
  const out = new Set<string>()

  for (const raw of slugs) {
    const a = norm(raw)

    if (!a) continue

    const canon = maps.variantToCanonical.get(a) ?? a
    const ex = maps.expandByCanonical[canon]

    if (ex) for (const alias of ex) out.add(alias)
    else out.add(a)
  }

  return [...out]
}

const scoreForPick = (slug: string, name: string): [number, number, number] => {
  const tmdb = /^tmdb-\d+$/i.test(slug) ? 0 : 1

  return [tmdb, -name.length, 0]
}

type WithSlug = { id: string; slug: string; name: string }

const pickGroupRepresentative = (rows: WithSlug[]): WithSlug => {
  if (rows.length === 0) {
    return rows[0]! // unreachable
  }

  return rows.toSorted((a, b) => {
    const [ta, la] = scoreForPick(a.slug, a.name)
    const [tb, lb] = scoreForPick(b.slug, b.name)

    if (ta !== tb) return ta - tb

    if (la !== lb) return la - lb

    return a.id.localeCompare(b.id)
  })[0]!
}

const applyCanonicalDisplayName = <T extends { id: string; slug: string; name: string }>(
  r: T,
  maps: RuntimeMaps,
): T => {
  const ckey = canonicalGenreKeyWithMaps(r.slug, r.name, maps)
  const name = maps.displayByCanonical.get(ckey)

  if (name) {
    return { ...r, slug: ckey, name } as T
  }

  return r
}

/** @param config — omit to use the default. */
export const dedupeGenresByCanonical = <T extends { id: string; slug: string; name: string }>(
  rows: T[],
  config: GenreAliasConfig = DEFAULT_GENRE_ALIAS_CONFIG,
) => {
  if (rows.length <= 1) return [...rows].toSorted((a, b) => a.name.localeCompare(b.name))

  const maps = getMaps(config)
  const byKey = new Map<string, T[]>()

  for (const r of rows) {
    const k = canonicalGenreKeyWithMaps(r.slug, r.name, maps)

    if (!byKey.has(k)) byKey.set(k, [])

    byKey.get(k)!.push(r)
  }
  const out: T[] = []

  for (const g of byKey.values()) {
    if (g.length === 1) {
      out.push(applyCanonicalDisplayName(g[0]! as WithSlug, maps) as T)
    } else {
      out.push(applyCanonicalDisplayName(pickGroupRepresentative(g as WithSlug[]), maps) as T)
    }
  }

  return out.toSorted((a, b) => a.name.localeCompare(b.name))
}

const mergeListOne = (entry: { slug: string; name: string }, maps: RuntimeMaps) => {
  const ckey = canonicalGenreKeyWithMaps(entry.slug, entry.name, maps)
  const dname = maps.displayByCanonical.get(ckey)

  if (dname) {
    if (/^tmdb-\d+$/i.test(entry.slug)) {
      return { slug: entry.slug, name: dname }
    }

    return { slug: ckey, name: dname }
  }

  return entry
}

const mergeLocalizedGenreGroup = (g: { slug: string; name: string }[], maps: RuntimeMaps) => {
  if (g.length === 0) return null

  if (g.length === 1) {
    return mergeListOne(g[0]!, maps)
  }

  const tmdb = g.find((row) => /^tmdb-\d+$/i.test(row.slug))
  const ckey = canonicalGenreKeyWithMaps(g[0]!.slug, g[0]!.name, maps)
  const dname = maps.displayByCanonical.get(ckey)

  if (tmdb && dname) {
    return { slug: tmdb.slug, name: dname }
  }

  if (dname) {
    return { slug: ckey, name: dname }
  }

  const w = g.toSorted((a, b) => scoreForPick(b.slug, b.name)[0] - scoreForPick(a.slug, a.name)[0])[0]!

  return mergeListOne(w, maps)
}

/** @param config — omit to use the default. */
export const mergeLocalizedGenreList = (
  items: { slug: string; name: string }[],
  config: GenreAliasConfig = DEFAULT_GENRE_ALIAS_CONFIG,
) => {
  if (items.length === 0) return []

  const maps = getMaps(config)
  const byKey = new Map<string, { slug: string; name: string }[]>()

  for (const it of items) {
    const k = canonicalGenreKeyWithMaps(it.slug, it.name, maps)

    if (!byKey.has(k)) byKey.set(k, [])

    byKey.get(k)!.push(it)
  }
  const out: { slug: string; name: string }[] = []

  for (const g of byKey.values()) {
    const m = mergeLocalizedGenreGroup(g, maps)

    if (m) out.push(m)
  }

  return out.toSorted((a, b) => a.name.localeCompare(b.name))
}

export const dedupeGenreNameRows = (
  rows: { slug: string; name: string }[],
  config: GenreAliasConfig = DEFAULT_GENRE_ALIAS_CONFIG,
) => {
  const d = dedupeGenresByCanonical(
    rows.map((r) => ({ id: r.slug, ...r })),
    config,
  )

  return d.map((r) => ({ slug: r.slug, name: r.name }))
}
