// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session } from '@auth/sveltekit'
import '@auth/sveltekit'

declare module '@auth/sveltekit' {
  type Session = {
    user?: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare global {
  namespace App {
    type Locals = {
      auth: () => Promise<Session | null>
    }
    type PageData = {
      session?: Session | null
    }
  }
  const __APP_VERSION__: string
}
