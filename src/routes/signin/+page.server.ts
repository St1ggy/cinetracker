import { signIn } from '../../auth'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => ({
  providers: {
    google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    apple: !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
    github: !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  },
})

export const actions: Actions = { default: signIn }
