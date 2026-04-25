import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')
const releaseMessage = 'fix(release): trigger release [DO_RELEASE]'

function run(command, options = {}) {
  return execSync(command, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  }).trim()
}

function assertCleanWorktree() {
  const status = run('git status --porcelain', { capture: true })
  if (status.length > 0) {
    throw new Error(
      `Working tree is not clean. Commit or stash your changes before running release:trigger.\n\n${status}`,
    )
  }
}

function assertOnMainBranch() {
  const branch = run('git rev-parse --abbrev-ref HEAD', { capture: true })
  if (branch !== 'main') {
    throw new Error(`Current branch is "${branch}". Switch to "main" first.`)
  }
}

try {
  run('git rev-parse --is-inside-work-tree', { capture: true })
  assertOnMainBranch()
  assertCleanWorktree()

  if (dryRun) {
    console.log('[dry-run] Checks passed.')
    console.log(`[dry-run] Would run: git commit --allow-empty -m "${releaseMessage}"`)
    console.log('[dry-run] Would run: git push origin main')
    process.exit(0)
  }

  run(`git commit --allow-empty -m "${releaseMessage}"`)
  run('git push origin main')
  console.log('Release trigger commit pushed to origin/main.')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`release:trigger failed: ${message}`)
  process.exit(1)
}
