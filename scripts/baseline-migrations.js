/**
 * Mark all migrations in prisma/migrations as applied (baseline).
 * Use when the DB schema already matches the migrations (e.g. after db push or restore).
 * Run: npm run prisma:migrate:baseline
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'prisma', 'migrations')

const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
const names = entries
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

for (const name of names) {
  execSync(`npx prisma migrate resolve --applied ${name}`, {
    cwd: root,
    stdio: 'inherit',
  })
}
