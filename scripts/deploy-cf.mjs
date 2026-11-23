#!/usr/bin/env node
// Deploys every Worker packaged by build-cf.mjs. Usage: node scripts/deploy-cf.mjs [name …]  (default: all)
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist/cf')
const API = join(ROOT, 'cloudflare/api')
const wanted = process.argv.slice(2)
const wrangler = (args, cwd) => spawnSync('npx', ['--yes', 'wrangler@4', ...args], { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } }).status === 0

// The API (lists and partners) goes first, so the app never talks to an older one than it expects. It is the only
// Worker with a database: its migrations are applied before the code that needs them.
if (!wanted.length || wanted.includes('api')) {
  console.log('\n── deploying api ──')
  const done = wrangler(['d1', 'migrations', 'apply', 'babymatch', '--remote'], API) && wrangler(['deploy'], API)
  if (!done) {
    // The site must still go out: the app keeps working on the device alone and syncs when the API is back.
    console.error('::warning::The API (cloudflare/api) was not deployed. If this is CI, the Cloudflare token probably lacks the D1 permission; run `npm run deploy api` from a logged-in machine.')
    if (wanted.includes('api')) process.exit(1)
  }
  if (wanted.length === 1) process.exit(0)
}
if (!existsSync(DIST)) { console.error('dist/cf not found: run `npm run build` first'); process.exit(1) }
const targets = readdirSync(DIST).filter(d => !wanted.length || wanted.includes(d)).sort((a, b) => (a === 'root' ? 1 : b === 'root' ? -1 : a.localeCompare(b)))
for (const t of targets) {
  console.log(`\n── deploying ${t} ──`)
  const r = spawnSync('npx', ['--yes', 'wrangler@4', 'deploy'], { cwd: join(DIST, t), stdio: 'inherit' })
  if (r.status !== 0) { console.error(`deploy of ${t} failed`); process.exit(r.status || 1) }
}
