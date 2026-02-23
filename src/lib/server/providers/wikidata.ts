import { error } from '@sveltejs/kit'

import type { CanonicalMedia, ProviderAdapter, SearchResult } from './types'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

const WIKIDATA_HEADERS = {
  Accept: 'application/sparql-results+json',
  'User-Agent': 'CineTracker/1.0 (https://github.com/St1ggy/cinetracker)',
}

const buildQuery = (imdbId: string): string => `
SELECT ?item ?itemLabel ?countryLabel ?boxOffice ?budget ?duration
       ?productionCompanyLabel ?awardLabel
WHERE {
  ?item wdt:P345 "${imdbId}" .
  OPTIONAL { ?item wdt:P495 ?country . }
  OPTIONAL { ?item wdt:P2142 ?boxOffice . }
  OPTIONAL { ?item wdt:P2130 ?budget . }
  OPTIONAL { ?item wdt:P2047 ?duration . }
  OPTIONAL { ?item wdt:P272 ?productionCompany . }
  OPTIONAL { ?item wdt:P166 ?award . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
LIMIT 10
`

type SparqlBinding = Record<string, { value: string; type: string } | undefined>

const extractValue = (binding: SparqlBinding, key: string): string | null => binding[key]?.value ?? null

const normalize = (bindings: SparqlBinding[], imdbId: string): CanonicalMedia => {
  const first = bindings[0] ?? {}
  const title = extractValue(first, 'itemLabel') ?? imdbId
  const wikidataUrl = extractValue(first, 'item')

  const countries = [
    ...new Set(bindings.map((b) => extractValue(b, 'countryLabel')).filter((c): c is string => c !== null)),
  ]

  const awards = [...new Set(bindings.map((b) => extractValue(b, 'awardLabel')).filter((a): a is string => a !== null))]

  const productionCompanies = [
    ...new Set(bindings.map((b) => extractValue(b, 'productionCompanyLabel')).filter((p): p is string => p !== null)),
  ]

  const boxOfficeRaw = extractValue(first, 'boxOffice')
  const budgetRaw = extractValue(first, 'budget')
  const durationRaw = extractValue(first, 'duration')

  const runtimeMinutes = durationRaw ? Math.round(Number.parseFloat(durationRaw)) : null

  return {
    provider: 'WIKIDATA',
    externalId: imdbId,
    externalUrl: wikidataUrl ?? null,
    title,
    originalTitle: null,
    mediaType: 'MOVIE',
    genres: [],
    countries,
    isAdult: false,
    runtimeMinutes: runtimeMinutes && Number.isFinite(runtimeMinutes) ? runtimeMinutes : null,
    raw: {
      imdbId,
      wikidataUrl,
      boxOffice: boxOfficeRaw ? Number.parseFloat(boxOfficeRaw) : null,
      budget: budgetRaw ? Number.parseFloat(budgetRaw) : null,
      productionCompanies,
      awards,
    },
  }
}

export const wikidataAdapter: ProviderAdapter = {
  provider: 'WIKIDATA',
  requiresKey: false,

  // Wikidata SPARQL is not suitable for free-text search
  async search(): Promise<SearchResult[]> {
    return []
  },

  async fetchDetails(externalId) {
    // externalId is the IMDb ID (e.g. "tt1234567")
    const imdbId = externalId.startsWith('tt') ? externalId : `tt${externalId}`

    const url = new URL(SPARQL_ENDPOINT)

    url.searchParams.set('query', buildQuery(imdbId))
    url.searchParams.set('format', 'json')

    const response = await fetch(url, { headers: WIKIDATA_HEADERS })

    if (!response.ok) throw error(response.status, 'Wikidata query failed')

    const payload = (await response.json()) as {
      results?: { bindings?: SparqlBinding[] }
    }

    const bindings = payload.results?.bindings ?? []

    if (bindings.length === 0) throw error(404, 'Wikidata: no results for IMDb ID')

    return normalize(bindings, imdbId)
  },
}
