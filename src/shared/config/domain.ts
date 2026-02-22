export const MEDIA_PROVIDERS = ['TMDB', 'ANILIST', 'OMDB', 'TVDB', 'JIKAN', 'KITSU', 'TRAKT'] as const
export type MediaProvider = (typeof MEDIA_PROVIDERS)[number]

export const FREE_PROVIDERS = ['ANILIST', 'JIKAN', 'KITSU'] as const satisfies readonly MediaProvider[]
export const KEY_REQUIRED_PROVIDERS = ['TMDB', 'OMDB', 'TVDB', 'TRAKT'] as const satisfies readonly MediaProvider[]

export const LIST_VISIBILITIES = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const
export type ListVisibility = (typeof LIST_VISIBILITIES)[number]

export const WATCH_STATUSES = ['WATCHED', 'IN_PROGRESS', 'PLAN_TO_WATCH'] as const
export type WatchStatus = (typeof WATCH_STATUSES)[number]

export const WATCH_STATUS_META: Record<
  WatchStatus,
  { bgColor: string; icon: 'circle-check' | 'circle-play' | 'clock' }
> = {
  WATCHED: { bgColor: '#22c55e', icon: 'circle-check' },
  IN_PROGRESS: { bgColor: '#3b82f6', icon: 'circle-play' },
  PLAN_TO_WATCH: { bgColor: '#eab308', icon: 'clock' },
}

export const MEDIA_TYPES = ['MOVIE', 'TV', 'ANIME', 'CARTOON', 'OTHER'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const MEDIA_TYPE_META: Record<MediaType, { label: string; color: string }> = {
  MOVIE: {
    label: 'Movie',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  TV: {
    label: 'TV Show',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  },
  ANIME: {
    label: 'Anime',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  CARTOON: {
    label: 'Cartoon',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  OTHER: {
    label: 'Other',
    color: 'bg-muted text-muted-foreground border-border',
  },
}

export const isMediaProvider = (value: string): value is MediaProvider =>
  (MEDIA_PROVIDERS as readonly string[]).includes(value)

export const PROVIDER_META: Record<
  MediaProvider,
  { label: string; description: string; requiresKey: boolean; keyUrl?: string; steps?: string[] }
> = {
  TMDB: {
    label: 'TMDB',
    description: 'Movies & TV series — the most complete database',
    requiresKey: true,
    keyUrl: 'https://www.themoviedb.org/settings/api',
    steps: [
      'Sign in at themoviedb.org',
      'Open Settings → API (left sidebar)',
      'Click "Create" and choose "Developer" type',
      'Fill in the application form (any values for personal use)',
      'Copy the Read Access Token (Bearer Token, v4) — recommended',
      'Alternatively copy the API Key (v3) field',
    ],
  },
  ANILIST: {
    label: 'AniList',
    description: 'Anime & manga — free, no key required',
    requiresKey: false,
  },
  OMDB: {
    label: 'OMDb (IMDb)',
    description: 'Movies, series & episodes with IMDb ratings',
    requiresKey: true,
    keyUrl: 'https://www.omdbapi.com/apikey.aspx',
    steps: [
      'Go to omdbapi.com/apikey.aspx',
      'Select "FREE! (1,000 daily limit)" plan',
      'Enter your email and submit the form',
      'Check your inbox and click the activation link',
      'Copy the API key from the activation email',
    ],
  },
  TVDB: {
    label: 'TheTVDB',
    description: 'TV series, seasons and episode data',
    requiresKey: true,
    keyUrl: 'https://thetvdb.com/api-information/signup',
    steps: [
      'Create an account at thetvdb.com',
      'Go to thetvdb.com/api-information and subscribe (free tier available)',
      'Open your dashboard and generate an API key',
      'Optionally set a PIN for extra security (enter it in the PIN field below)',
      'Copy the API key',
    ],
  },
  JIKAN: {
    label: 'Jikan (MyAnimeList)',
    description: 'Anime & manga via MyAnimeList — free, no key required',
    requiresKey: false,
  },
  KITSU: {
    label: 'Kitsu',
    description: 'Anime & manga — free, no key required',
    requiresKey: false,
  },
  TRAKT: {
    label: 'Trakt',
    description: 'Movies & TV series with watch history sync',
    requiresKey: true,
    keyUrl: 'https://trakt.tv/oauth/applications',
    steps: [
      'Sign in at trakt.tv',
      'Go to Settings → Your API Apps',
      'Click "New Application"',
      'Fill in the Name; set Redirect URI to urn:ietf:wg:oauth:2.0:oob',
      'Save the application',
      'Copy the Client ID (not the Client Secret)',
    ],
  },
}
