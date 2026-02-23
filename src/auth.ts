import { PrismaAdapter } from '@auth/prisma-adapter'
import { SvelteKitAuth } from '@auth/sveltekit'
import Apple from '@auth/sveltekit/providers/apple'
import GitHub from '@auth/sveltekit/providers/github'
import Google from '@auth/sveltekit/providers/google'

import { prisma } from '$lib/server/prisma'
import { listsRepository } from '$lib/server/repositories'

const providers = [
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : []),
  ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
    ? [
        Apple({
          clientId: process.env.AUTH_APPLE_ID,
          clientSecret: process.env.AUTH_APPLE_SECRET,
        }),
      ]
    : []),
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
    ? [
        GitHub({
          clientId: process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
      ]
    : []),
]

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
