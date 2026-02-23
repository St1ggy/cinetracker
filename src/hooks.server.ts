import { sequence } from '@sveltejs/kit/hooks'

import { paraglideMiddleware } from '$lib/paraglide/server'

import { authHandle } from './auth'

import type { Handle } from '@sveltejs/kit'

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }: { request: Request; locale: string }) => {
    event.request = request

    return resolve(event, {
      transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale),
    })
  })

export const handle: Handle = sequence(authHandle, handleParaglide)
