// Legal links for About page: authentication and data providers.
// Used to display terms of use and privacy policy links.
import type { MediaProvider } from '$shared/config/domain'

export const AUTH_LEGAL: {
  id: string
  labelKey: 'about_auth_google' | 'about_auth_apple' | 'about_auth_github'
  termsUrl: string
  privacyUrl: string
}[] = [
  {
    id: 'google',
    labelKey: 'about_auth_google',
    termsUrl: 'https://policies.google.com/terms',
    privacyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'apple',
    labelKey: 'about_auth_apple',
    termsUrl: 'https://www.apple.com/legal/internet-services/terms/',
    privacyUrl: 'https://www.apple.com/legal/privacy/',
  },
  {
    id: 'github',
    labelKey: 'about_auth_github',
    termsUrl: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    privacyUrl: 'https://docs.github.com/en/site-policy/github-privacy-statement',
  },
]

export const DATA_PROVIDER_LEGAL: Record<
  MediaProvider,
  { termsUrl: string; privacyUrl?: string; attributionUrl?: string }
> = {
  TMDB: {
    termsUrl: 'https://www.themoviedb.org/api-terms-of-use',
    attributionUrl: 'https://www.themoviedb.org/about/logos-attribution',
  },
  ANILIST: {
    termsUrl: 'https://anilist.co/terms',
    privacyUrl: 'https://anilist.co/privacy',
  },
  OMDB: {
    termsUrl: 'https://www.omdbapi.com/legal.htm',
  },
  TVDB: {
    termsUrl: 'https://thetvdb.com/terms-of-use',
  },
  JIKAN: {
    termsUrl: 'https://myanimelist.net/about/terms_of_use',
    privacyUrl: 'https://myanimelist.net/about/privacy_policy',
  },
  KITSU: {
    termsUrl: 'https://kitsu.io/terms',
    privacyUrl: 'https://kitsu.io/privacy',
  },
  TRAKT: {
    termsUrl: 'https://trakt.tv/terms',
    privacyUrl: 'https://trakt.tv/privacy',
  },
  SHIKIMORI: {
    termsUrl: 'https://shikimori.one/terms',
  },
  SIMKL: {
    termsUrl: 'https://simkl.com/about/terms/',
    privacyUrl: 'https://simkl.com/about/privacy/',
  },
  WIKIDATA: {
    termsUrl: 'https://foundation.wikimedia.org/wiki/Terms_of_Use',
    privacyUrl: 'https://foundation.wikimedia.org/wiki/Privacy_policy',
  },
}
