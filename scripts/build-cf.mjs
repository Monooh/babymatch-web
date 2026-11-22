#!/usr/bin/env node
// Packages the static export (out/) for Cloudflare Workers static assets.
//
// A Worker version may hold 20,000 files on the free plan and the site has far more pages than that, so each
// language gets its own assets-only Worker, routed by path prefix, and a small "root" Worker takes everything else:
//
//   babymatch.app/es, /es/*  -> babymatch-es   (dist/cf/es)
//   …one per language…
//   babymatch.app/*          -> babymatch-root (dist/cf/root): "/" language redirect, old-URL redirects,
//                                                              robots.txt, sitemaps, /_next, /data, icons
//
// Requests answered by a static file never run code, so they are free and unlimited.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'out')
const DIST = join(ROOT, 'dist/cf')
const CF = join(ROOT, 'cloudflare')
const LOCALES = ['es', 'en', 'fr', 'de', 'it', 'pt']
const DOMAIN = process.env.BM_DOMAIN || 'babymatch.app'
// Routes need the domain to be an active zone on this Cloudflare account. Until then, deploy with BM_ROUTES=0
// and each Worker is reachable on its own workers.dev address.
const ROUTES = process.env.BM_ROUTES !== '0'
const COMPAT = '2026-11-01'
const FILE_LIMIT = 20000

if (!existsSync(OUT)) { console.error('out/ not found: run `next build` first'); process.exit(1) }
rmSync(DIST, { recursive: true, force: true })

// React Server Component payloads (.txt beside each .html) are only fetched by next/link navigation.
// The site uses plain links, so they are dead weight: skip them and halve the upload.
const isRscPayload = (name) => name.endsWith('.txt') && name !== 'robots.txt'
// Name, list and hub pages have no client components: the only script they need is /search.js. Removing the
// framework runtime and the inlined RSC payload takes each of them from about 38 KB to about 10 KB.
const NEXT_SCRIPT = /<script\b(?![^>]*type="application\/ld\+json")(?![^>]*src="\/search\.js")[^>]*>[\s\S]*?<\/script>/g
const SCRIPT_PRELOAD = /<link\b[^>]*\bas="script"[^>]*>/g
const staticHtml = html => html.replace(NEXT_SCRIPT, '').replace(SCRIPT_PRELOAD, '')
// These keep React: the home (live deck in the hero) and the app itself.
const keepsScripts = rel => /^[a-z]{2}\.html$/.test(rel) || /^[a-z]{2}\/app\.html$/.test(rel) || rel === '404.html'

let stripped = 0
function copy(from, to, rel = '') {
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true })
    for (const name of readdirSync(from)) copy(join(from, name), join(to, name), rel ? `${rel}/${name}` : name)
    return
  }
  const name = from.split('/').pop()
  if (isRscPayload(name)) return
  mkdirSync(dirname(to), { recursive: true })
  if (name.endsWith('.html') && !keepsScripts(rel)) { writeFileSync(to, staticHtml(readFileSync(from, 'utf8'))); stripped++ }
  else copyFileSync(from, to)
}
const count = dir => readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(dir, e.name)) : 1), 0)

const top = readdirSync(OUT)
const isLocaleEntry = name => LOCALES.some(l => name === l || name === `${l}.html` || name === `${l}.txt`)
const shared = top.filter(name => !isLocaleEntry(name) && !isRscPayload(name))

function writeConfig(dir, config) {
  writeFileSync(join(dir, 'wrangler.jsonc'), JSON.stringify(config, null, 2) + '\n')
}
function addShared(assets, { everything }) {
  // Language Workers carry the shared files too, so each also works alone on its workers.dev address.
  for (const name of shared) {
    if (!everything && !['_next', 'data', '404.html', 'search.js', 'logo.png', 'icon-192.png', 'icon-512.png', 'favicon.ico'].includes(name)) continue
    copy(join(OUT, name), join(assets, name), name)
  }
  copyFileSync(join(CF, '_headers'), join(assets, '_headers'))
}

const report = []
for (const l of LOCALES) {
  const dir = join(DIST, l), assets = join(dir, 'assets')
  mkdirSync(assets, { recursive: true })
  copy(join(OUT, `${l}.html`), join(assets, `${l}.html`), `${l}.html`)
  copy(join(OUT, l), join(assets, l), l)
  addShared(assets, { everything: false })
  writeConfig(dir, {
    name: `babymatch-${l}`,
    compatibility_date: COMPAT,
    assets: { directory: './assets', html_handling: 'auto-trailing-slash', not_found_handling: '404-page' },
    workers_dev: true,
    ...(ROUTES ? { routes: [{ pattern: `${DOMAIN}/${l}`, zone_name: DOMAIN }, { pattern: `${DOMAIN}/${l}/*`, zone_name: DOMAIN }] } : {}),
  })
  report.push([`babymatch-${l}`, count(assets)])
}

{
  const dir = join(DIST, 'root'), assets = join(dir, 'assets')
  mkdirSync(assets, { recursive: true })
  addShared(assets, { everything: true })
  copyFileSync(join(CF, '_redirects'), join(assets, '_redirects'))
  copyFileSync(join(CF, 'root-worker.js'), join(dir, 'worker.js'))
  writeConfig(dir, {
    name: 'babymatch-root',
    main: './worker.js',
    compatibility_date: COMPAT,
    assets: { directory: './assets', binding: 'ASSETS', html_handling: 'auto-trailing-slash', not_found_handling: '404-page' },
    workers_dev: true,
    ...(ROUTES ? { routes: [{ pattern: `${DOMAIN}/*`, zone_name: DOMAIN }, { pattern: `www.${DOMAIN}/*`, zone_name: DOMAIN }] } : {}),
  })
  report.push(['babymatch-root', count(assets)])
}

let ok = true
for (const [name, files] of report) {
  const over = files > FILE_LIMIT
  if (over) ok = false
  console.log(`${name.padEnd(16)} ${String(files).padStart(6)} files${over ? `  ← over the ${FILE_LIMIT} free-plan limit` : ''}`)
}
const size = dir => readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0)
console.log(`${stripped} pages shipped as plain HTML · total ${(size(DIST) / 1e6).toFixed(0)} MB in dist/cf · routes ${ROUTES ? `on ${DOMAIN}` : 'off (workers.dev only)'}`)
if (!ok) process.exit(1)
