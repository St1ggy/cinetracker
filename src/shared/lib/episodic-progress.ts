// Client + server: episodic S/E validation and quick input parsing.
// When structure is unknown (no seasonBreakdown in catalog), only enforce integers ≥ 1.

export type SeasonBreakdownEntry = { seasonNumber: number; episodes: number }

export const parseSeasonBreakdown = (raw: unknown): SeasonBreakdownEntry[] | null => {
  if (raw == null) return null

  if (!Array.isArray(raw)) return null

  const out: SeasonBreakdownEntry[] = []

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue

    const seasonNumber = Number((entry as Record<string, unknown>).seasonNumber)
    const episodes = Number((entry as Record<string, unknown>).episodes)

    if (Number.isFinite(seasonNumber) && seasonNumber >= 1 && Number.isFinite(episodes) && episodes >= 1) {
      out.push({ seasonNumber, episodes })
    }
  }

  return out.length > 0 ? out : null
}

export const isStructureKnown = (seasons: SeasonBreakdownEntry[] | null | undefined): boolean =>
  seasons != null && seasons.length > 0

export const episodesInSeason = (seasons: SeasonBreakdownEntry[] | null, seasonNumber: number): number | null => {
  if (!seasons) return null

  const found = seasons.find((s) => s.seasonNumber === seasonNumber)

  return found?.episodes ?? null
}

export type EpisodicProgressFieldError = 'season' | 'episode'

export type ValidateEpisodicProgressResult =
  | { ok: true }
  | { ok: false; field: EpisodicProgressFieldError; code: 'required' | 'exceeds_season' | 'invalid_season' }

export const validateEpisodicProgress = (args: {
  structureKnown: boolean
  seasons: SeasonBreakdownEntry[] | null
  season: number
  episode: number
}): ValidateEpisodicProgressResult => {
  if (!Number.isInteger(args.season) || args.season < 1) {
    return { ok: false, field: 'season', code: 'invalid_season' }
  }

  if (!Number.isInteger(args.episode) || args.episode < 1) {
    return { ok: false, field: 'episode', code: 'required' }
  }

  if (!args.structureKnown) return { ok: true }

  if (args.seasons == null) {
    return { ok: false, field: 'season', code: 'invalid_season' }
  }

  const { seasons: seasonList, season, episode } = args
  const maxE = episodesInSeason(seasonList, season)

  if (maxE == null) {
    return { ok: false, field: 'season', code: 'invalid_season' }
  }

  if (!seasonList.some((x) => x.seasonNumber === season)) {
    return { ok: false, field: 'season', code: 'invalid_season' }
  }

  if (episode > maxE) {
    return { ok: false, field: 'episode', code: 'exceeds_season' }
  }

  return { ok: true }
}

const SE_EPISODE = /^s\s*(\d{1,4})\s*e\s*(\d{1,4})$/i

/** Matches `2x05`, `s2e5`, `2.05` (as two numbers), "2 5" */
export const parseQuickProgressInput = (s: string): { season: number; episode: number } | null => {
  const trimmed = s.trim()

  if (trimmed === '') return null

  const sLower = trimmed.toLowerCase()
  const sExec = SE_EPISODE.exec(sLower)

  if (sExec) {
    return { season: Number(sExec[1]), episode: Number(sExec[2]) }
  }

  const separators = ['×', 'x', '*', '.', ',', ';', ':', ' ']

  for (const character of separators) {
    const characterIndex = trimmed.indexOf(character)

    if (characterIndex === -1) continue

    const left = trimmed.slice(0, characterIndex).trim()
    const right = trimmed.slice(characterIndex + 1).trim()
    const seasonN = Number.parseInt(left, 10)
    const episodeN = Number.parseInt(right, 10)

    if (
      Number.isFinite(seasonN) &&
      Number.isFinite(episodeN) &&
      seasonN >= 1 &&
      episodeN >= 1 &&
      left.length > 0 &&
      right.length > 0
    ) {
      return { season: seasonN, episode: episodeN }
    }
  }

  return null
}

const MAX_SEASON_BREAKDOWN_LINES = 200

// One non-empty line = "season" × "episodes in that season" (same separators as `parseQuickProgressInput`).
// Example: `1x22`, one season per line.
export const parseQuickSeasonBreakdownInput = (raw: string): SeasonBreakdownEntry[] | null => {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0 || lines.length > MAX_SEASON_BREAKDOWN_LINES) {
    return null
  }

  const seen = new Set<number>()
  const out: SeasonBreakdownEntry[] = []

  for (const line of lines) {
    const one = parseQuickProgressInput(line)

    if (!one) {
      return null
    }

    if (seen.has(one.season) || one.season > 9999 || one.episode > 9999) {
      return null
    }

    if (!Number.isInteger(one.season) || !Number.isInteger(one.episode)) {
      return null
    }

    seen.add(one.season)
    out.push({ seasonNumber: one.season, episodes: one.episode })
  }

  return sortSeasonBreakdown(out)
}

export const sortSeasonBreakdown = (rows: SeasonBreakdownEntry[]): SeasonBreakdownEntry[] =>
  rows.toSorted((a, b) => a.seasonNumber - b.seasonNumber)

const stableKey = (rows: SeasonBreakdownEntry[]) =>
  sortSeasonBreakdown(rows)
    .map((r) => `${r.seasonNumber}:${r.episodes}`)
    .join(',')

export const seasonBreakdownsEqual = (a: SeasonBreakdownEntry[], b: SeasonBreakdownEntry[]) =>
  stableKey(a) === stableKey(b)

/** User override wins when non-empty; otherwise catalog. */
export const effectiveSeasonRows = (
  catalog: SeasonBreakdownEntry[] | null | undefined,
  user: SeasonBreakdownEntry[] | null | undefined,
): SeasonBreakdownEntry[] => {
  if (user && user.length > 0) {
    return sortSeasonBreakdown([...user])
  }

  if (catalog && catalog.length > 0) {
    return sortSeasonBreakdown([...catalog])
  }

  return []
}

/** `AUTO` / null = if both catalog and user have grids, prefer the user (legacy); `CATALOG` / `USER` = force. */
export type SeasonGridSource = 'AUTO' | 'CATALOG' | 'USER'

// Resolves which season/episode structure to use when catalog and/or custom rows exist
// (e.g. list item override, or new data from sources).
export const displaySeasonGrid = (
  catalog: SeasonBreakdownEntry[] | null | undefined,
  user: SeasonBreakdownEntry[] | null | undefined,
  source: SeasonGridSource | null | undefined,
): SeasonBreakdownEntry[] => {
  const cRows = sortSeasonBreakdown(catalog && catalog.length > 0 ? [...catalog] : [])
  const uRows = user && user.length > 0 ? sortSeasonBreakdown([...user]) : []
  const hasC = cRows.length > 0
  const hasU = uRows.length > 0

  if (hasC && hasU) {
    const mode = source == null || source === 'AUTO' ? 'AUTO' : source

    if (mode === 'CATALOG') {
      return cRows
    }

    if (mode === 'USER') {
      return uRows
    }

    return uRows
  }

  if (hasU) {
    return uRows
  }

  if (hasC) {
    return cRows
  }

  return []
}

// Same resolution as the season list UI (`displaySeasonGrid`): only user / only catalog / both + CATALOG|USER|AUTO.
// Falls back to `media.seasonsCount` / `episodesCount` when neither side yields a non-empty grid.
export const effectiveEpisodicCounts = (
  mediaSeasonBreakdown: unknown,
  userSeasonBreakdown: unknown,
  seasonStructureSource: 'CATALOG' | 'USER' | null | undefined,
  mediaSeasonsCount: number | null,
  mediaEpisodesCount: number | null,
): { seasonsCount: number | null; episodesCount: number | null } => {
  const catalog = parseSeasonBreakdown(mediaSeasonBreakdown) ?? null
  const user = parseSeasonBreakdown(userSeasonBreakdown) ?? null
  const source: SeasonGridSource = seasonStructureSource == null ? 'AUTO' : seasonStructureSource
  const grid = displaySeasonGrid(catalog, user, source)

  if (grid.length === 0) {
    return { seasonsCount: mediaSeasonsCount, episodesCount: mediaEpisodesCount }
  }

  return {
    seasonsCount: grid.length,
    episodesCount: grid.reduce((sum, r) => sum + r.episodes, 0),
  }
}
