import { deLocalizeUrl } from '$lib/paraglide/runtime'

type Request = {
  url: URL
  fetch: typeof fetch
}

export const reroute = (request: Request) => deLocalizeUrl(request.url).pathname
