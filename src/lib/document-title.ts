// Client + server: single source of truth for <title> (see `layout.svelte`).
import { L } from '$lib'
import { getMediaTitlePair } from '$shared/lib/media-title'

export type DocumentTitleInput = { pathname: string; data: unknown; params: Record<string, string | undefined> }
type RouteParams = { mediaId?: string; listId?: string; handle?: string }

const withSuffix = (label: string, app: string) => `${label} — ${app}`

const tryMedia = (d: unknown, id: string | undefined): string | null => {
  if (!id) {
    return null
  }

  const m = (d as { media?: { id: string; title: string; originalTitle: string | null } })?.media

  if (m?.id === id && m.title?.trim()) {
    return getMediaTitlePair({ title: m.title, originalTitle: m.originalTitle ?? null }).primary
  }

  return null
}

const tryList = (d: unknown, id: string | undefined): string | null => {
  if (!id) {
    return null
  }

  const list = (d as { list?: { id: string; title: string } })?.list

  if (list?.id === id && list.title?.trim()) {
    return list.title.trim()
  }

  return null
}

const atHandle = (d: unknown, handle: string): string => {
  const p = (d as { profile?: { handle: string } })?.profile

  if (p?.handle === handle) {
    return `@${p.handle}`
  }

  return `@${handle}`
}

const staticRouteTitle = (p: string, app: string): string | null => {
  if (p === '/' || p === '') {
    return withSuffix(L.nav_home(), app)
  }

  if (p.startsWith('/board')) {
    return withSuffix(L.board_title(), app)
  }

  if (p.startsWith('/wheel')) {
    return withSuffix(L.wheel_page_title(), app)
  }

  if (p.startsWith('/profile')) {
    return withSuffix(L.profile_title(), app)
  }

  if (p.startsWith('/about')) {
    return withSuffix(L.about_title(), app)
  }

  if (p === '/lists' || p === '/lists/') {
    return withSuffix(L.lists_my_title(), app)
  }

  if (p.startsWith('/explore')) {
    return withSuffix(L.explore_title(), app)
  }

  if (p.startsWith('/signin')) {
    return withSuffix(L.common_sign_in(), app)
  }

  if (p.startsWith('/signout')) {
    return withSuffix(L.common_sign_out(), app)
  }

  return null
}

const fromPath = (p: string, d: unknown, r: RouteParams, app: string): string | null => {
  const s = staticRouteTitle(p, app)

  if (s != null) {
    return s
  }

  if (p.startsWith('/lists/') && r.listId) {
    const t = tryList(d, r.listId)

    if (t != null) {
      return withSuffix(t, app)
    }

    return null
  }

  if (p.startsWith('/media/') && r.mediaId) {
    const t = tryMedia(d, r.mediaId)

    if (t != null) {
      return withSuffix(t, app)
    }

    return null
  }

  if (p.startsWith('/u/') && r.handle) {
    return withSuffix(atHandle(d, r.handle), app)
  }

  return null
}

export const getDocumentTitle = (input: DocumentTitleInput): string => {
  const app = L.app_name()
  const r = input.params as RouteParams
  const title = fromPath(input.pathname, input.data, r, app)

  if (title != null) {
    return title
  }

  if (input.pathname.startsWith('/media/') || input.pathname.startsWith('/lists/')) {
    return app
  }

  return app
}
