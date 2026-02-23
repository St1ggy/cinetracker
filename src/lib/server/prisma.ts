import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Vite loads .env.development / .env.production by mode, but server modules may run before that.
// Load in order: base, then mode, then local. Later files override (override: true).
config() // .env
const nodeEnv = process.env.NODE_ENV ?? 'development'

if (nodeEnv === 'development') {
  config({ path: '.env.development', override: true })
} else if (nodeEnv === 'production') {
  config({ path: '.env.production', override: true })
}

config({ path: '.env.local', override: true }) // local overrides (no error if missing)

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const resolveDatabaseUrl = () =>
  process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.DIRECT_URL

const createPrismaClient = () => {
  const databaseUrl = resolveDatabaseUrl()?.trim()

  if (!databaseUrl) {
    throw new Error(
      'Database URL is required to initialize PrismaClient. Set one of: DATABASE_URL, PRISMA_DATABASE_URL, POSTGRES_URL, DIRECT_URL.',
    )
  }

  if (databaseUrl.startsWith('prisma://')) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    })
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  })

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
