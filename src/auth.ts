import { PrismaAdapter } from '@auth/prisma-adapter'
import { SvelteKitAuth } from '@auth/sveltekit'
import Google from '@auth/sveltekit/providers/google'

import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'

const googleClientId = process.env.AUTH_GOOGLE_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET
const providers =
  googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : []

export const {
  handle: authHandle,
  signIn,
  signOut,
} = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: 'database' },
  providers,
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id
      }

      return session
    },
  },
  events: {
    createUser: async ({ user }) => {
      if (!user.id) {
        return
      }

      await listsRepository.findOrCreateMain(user.id)
    },
  },
})
