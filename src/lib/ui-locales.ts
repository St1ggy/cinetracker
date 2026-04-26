/** Paraglide UI languages — single source (keep in sync with `project.inlang/settings.json`). */
export const UI_BASE_LOCALE = 'en' as const

export const UI_LOCALES = ['en', 'ru', 'ja', 'fr', 'zh'] as const

export type UiLocale = (typeof UI_LOCALES)[number]

export const isUiLocale = (s: string): s is UiLocale => (UI_LOCALES as readonly string[]).includes(s)
