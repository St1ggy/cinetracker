const parseIntOr = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)

  return Number.isNaN(parsed) ? fallback : parsed
}

export const appEnv = {
  anilistApiUrl: process.env.ANILIST_API_URL ?? 'https://graphql.anilist.co',
  externalCacheTtlSeconds: parseIntOr(process.env.EXTERNAL_CACHE_TTL_SECONDS, 60 * 60 * 24 * 7),
  externalSearchTtlSeconds: parseIntOr(process.env.EXTERNAL_SEARCH_TTL_SECONDS, 60 * 60 * 24),
  apiRateLimitPerMinute: parseIntOr(process.env.API_RATE_LIMIT_PER_MINUTE, 120),
}
