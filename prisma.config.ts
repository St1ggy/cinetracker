import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

const nodeEnv = process.env.NODE_ENV ?? 'development'

if (nodeEnv === 'development') {
  config({ path: '.env.development', override: true })
} else if (nodeEnv === 'production') {
  config({ path: '.env.production', override: true })
}

config()
config({ path: '.env.local', override: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
