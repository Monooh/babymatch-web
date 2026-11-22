#!/usr/bin/env node
// Deploys every Worker packaged by build-cf.mjs. Usage: node scripts/deploy-cf.mjs [name …]  (default: all)
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist/cf')
if (!existsSync(DIST)) { console.error('dist/cf not found: run `npm run build` first'); process.exit(1) }
const wanted = process.argv.slice(2)
const targets = readdirSync(DIST).filter(d => !wanted.length || wanted.includes(d)).sort((a, b) => (a === 'root' ? 1 : b === 'root' ? -1 : a.localeCompare(b)))
for (const t of targets) {
  console.log(`\n── deploying ${t} ──`)
  const r = spawnSync('npx', ['--yes', 'wrangler@latest', 'deploy'], { cwd: join(DIST, t), stdio: 'inherit' })
  if (r.status !== 0) { console.error(`deploy of ${t} failed`); process.exit(r.status || 1) }
}
