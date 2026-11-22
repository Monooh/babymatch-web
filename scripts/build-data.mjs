#!/usr/bin/env node
// Merges data/raw/*.txt (pipe-separated, see data/BRIEF.md) into:
//   src/data/master.json            every name with every language (server only)
//   public/data/names.<lang>.json   compact rows for the app, one file per language
//   data/ids.json                   slug -> numeric id, append-only so shared links keep working
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAW = join(ROOT, 'data/raw')
const LOCALES = ['es', 'en', 'fr', 'de', 'it', 'pt']
const ROOTS = ['latin', 'greek', 'hebrew', 'germanic', 'celtic', 'norse', 'slavic', 'arabic', 'persian', 'turkish', 'sanskrit', 'japanese', 'chinese', 'korean', 'african', 'polynesian', 'basque', 'native', 'other']
const CULTURES = ['spanish', 'basque', 'catalan', 'galician', 'portuguese', 'french', 'italian', 'german', 'english', 'irish', 'scottish', 'welsh', 'scandinavian', 'dutch', 'russian', 'polish', 'greek', 'hebrew', 'arabic', 'turkish', 'persian', 'indian', 'japanese', 'chinese', 'korean', 'african', 'hawaiian', 'intl']
const TAGS = ['biblical', 'saint', 'mythology', 'nature', 'flower', 'celestial', 'sea', 'royal', 'literary', 'classic', 'vintage', 'modern', 'trendy', 'strong', 'sweet', 'virtue', 'gem', 'animal', 'place', 'warrior', 'light', 'love', 'music']
const TAG_ALIASES = { noble: 'royal', mythological: 'mythology', mythic: 'mythology', floral: 'flower', star: 'celestial', moon: 'celestial', water: 'sea', bible: 'biblical', saints: 'saint', royalty: 'royal', popular: 'trendy', unique: 'modern' }
const LOCALE_CULTURES = { es: ['spanish', 'basque', 'catalan', 'galician'], en: ['english', 'irish', 'scottish', 'welsh'], fr: ['french'], de: ['german'], it: ['italian'], pt: ['portuguese'] }

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd')
  .replace(/[ıİ]/g, 'i').replace(/[þÞ]/g, 'th').replace(/[ðÐ]/g, 'd').replace(/[œŒ]/g, 'oe').toLowerCase()
const slugify = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function syllables(name) {
  let total = 0
  for (const word of name.split(/[\s-]+/)) {
    const w = fold(word).replace(/[^a-z]/g, '')
    if (!w) continue
    let n = (w.match(/[aeiouy]+/g) || []).length
    n += (w.match(/eo|ao/g) || []).length                      // Le-o, Pa-o-lo
    if (/(ea|oa|ia|ua)h?$/.test(w) && w.length > 3) n += 1          // An-dre-a, No-ah, Ma-ri-a
    else if (/[íúÍÚ][aeoAEO]|[aeoAEO][íúÍÚ]/.test(word.normalize('NFC'))) n += 1 // Lu-cí-a, Ra-úl
    total += Math.max(1, n)
  }
  return Math.max(1, total)
}

const NAME_OK = /^[\p{L}][\p{L}\p{M}' ’·-]*$/u
const clean = s => s.trim().replace(/\s+/g, ' ').replace(/[.。]+$/, '')

const stats = { files: 0, lines: 0, bad: 0, merged: 0 }
const bad = []
const bySlug = new Map()

for (const file of readdirSync(RAW).filter(f => f.endsWith('.txt')).sort()) {
  stats.files++
  const text = readFileSync(join(RAW, file), 'utf8')
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return
    stats.lines++
    const f = line.split('|').map(clean)
    const fail = why => { stats.bad++; bad.push(`${file}:${i + 1} ${why}: ${line.slice(0, 80)}`) }
    if (f.length !== 12) return fail(`fields=${f.length}`)
    let [name, g, root, cultures, pop, tags, ...m] = f
    name = name.replace(/’/g, "'").normalize('NFC')
    if (!NAME_OK.test(name) || name.length > 28) return fail('name')
    if (!['f', 'm', 'u'].includes(g)) return fail('gender')
    if (!ROOTS.includes(root)) root = 'other'
    const cs = [...new Set(cultures.split(',').map(s => s.trim().toLowerCase()).filter(c => CULTURES.includes(c)))]
    if (!cs.length) return fail('cultures')
    const p = Math.min(5, Math.max(1, parseInt(pop, 10) || 2))
    const ts = [...new Set(tags.split(',').map(s => s.trim().toLowerCase()).map(t => TAG_ALIASES[t] || t).filter(t => TAGS.includes(t)))].slice(0, 4)
    if (m.some(x => !x || x.length > 90)) return fail('meaning')
    const slug = slugify(name)
    if (!slug) return fail('slug')
    const rec = { name, g, root, cs, p, ts, m: Object.fromEntries(LOCALES.map((l, k) => [l, m[k][0].toUpperCase() + m[k].slice(1)])) }
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    else stats.merged++
    bySlug.get(slug).push(rec)
  })
}

// Two different names can fold to one slug (Julia, a girl; Julià, a Catalan boy). When the spellings never share a
// gender they are different names: the better-known one keeps the slug, the other gets a gender suffix.
for (const [slug, recs] of [...bySlug]) {
  const spellings = new Map()
  for (const r of recs) { if (!spellings.has(r.name)) spellings.set(r.name, new Set()); spellings.get(r.name).add(r.g) }
  if (spellings.size < 2) continue
  const pure = g => [...spellings].filter(([, gs]) => gs.size === 1 && gs.has(g)).map(([n]) => n)
  const fs = pure('f'), ms = pure('m')
  if (!fs.length || !ms.length) continue
  const weight = names => Math.max(...recs.filter(r => names.includes(r.name)).map(r => r.p))
  const [keep, move, g] = weight(fs) >= weight(ms) ? [fs, ms, 'm'] : [ms, fs, 'f']
  bySlug.set(slug, recs.filter(r => !move.includes(r.name)))
  bySlug.set(`${slug}-${g}`, recs.filter(r => move.includes(r.name)))
  stats.split = (stats.split || 0) + 1
}

// Stable ids.
const idsPath = join(ROOT, 'data/ids.json')
const ids = existsSync(idsPath) ? JSON.parse(readFileSync(idsPath, 'utf8')) : {}
let nextId = Math.max(0, ...Object.values(ids)) + 1
for (const slug of [...bySlug.keys()].sort()) if (!(slug in ids)) ids[slug] = nextId++

const localeOf = c => LOCALES.find(l => LOCALE_CULTURES[l].includes(c))

const master = []
for (const [slug, recs] of bySlug) {
  // The best-known spelling leads; the others contribute cultures, tags and per-language forms.
  const lead = [...recs].sort((a, b) => b.p - a.p)[0]
  const forms = { _: lead.name }
  const genders = { _: recs.every(r => r.g === lead.g) ? lead.g : 'u' }
  // The line whose main culture belongs to a site language decides how that language spells and genders the
  // name; secondary cultures only fill languages nobody claimed.
  const assigned = {}
  for (const r of recs) { const l = localeOf(r.cs[0]); if (l && !assigned[l]) assigned[l] = r }
  for (const r of [lead, ...recs]) for (const l of r.cs.map(localeOf)) if (l && !assigned[l]) assigned[l] = r
  for (const [l, r] of Object.entries(assigned)) {
    if (r.name !== forms._) forms[l] = r.name
    // Writers of the same language who disagree on gender mean the name is unisex there.
    const same = recs.filter(x => localeOf(x.cs[0]) === l)
    const g = same.length && same.some(x => x.g !== same[0].g) ? 'u' : r.g
    if (g !== genders._) genders[l] = g
  }
  const cultures = [...new Set(recs.flatMap(r => r.cs))].sort((a, b) => CULTURES.indexOf(a) - CULTURES.indexOf(b))
  // keep the lead's main culture first
  cultures.sort((a, b) => (a === lead.cs[0] ? -1 : b === lead.cs[0] ? 1 : 0))
  const tags = [...new Set([...lead.ts, ...recs.flatMap(r => r.ts)])].slice(0, 5)
  master.push({
    id: ids[slug], slug, f: forms, g: genders, root: lead.root, c: cultures,
    p: Math.max(...recs.map(r => r.p)), t: tags, s: syllables(lead.name), m: lead.m,
  })
}
master.sort((a, b) => a.slug.localeCompare(b.slug))

mkdirSync(join(ROOT, 'src/data'), { recursive: true })
mkdirSync(join(ROOT, 'public/data'), { recursive: true })
writeFileSync(join(ROOT, 'src/data/master.json'), JSON.stringify(master))
writeFileSync(idsPath, JSON.stringify(ids))

// Each language sees its own cultures first, so a Spanish reader meets Helena as a Spanish name.
const homeFirst = (cs, l) => [...cs.filter(c => LOCALE_CULTURES[l].includes(c)), ...cs.filter(c => !LOCALE_CULTURES[l].includes(c))]
for (const l of LOCALES) {
  const rows = master.map(e => [
    e.id, e.slug, e.f[l] || e.f._, e.g[l] || e.g._, ROOTS.indexOf(e.root), homeFirst(e.c, l).map(c => CULTURES.indexOf(c)), e.p,
    e.t.map(t => TAGS.indexOf(t)), e.s, e.m[l],
    e.c.some(c => LOCALE_CULTURES[l].includes(c)) ? 2 : e.c.includes('intl') ? 1 : 0,
  ])
  writeFileSync(join(ROOT, `public/data/names.${l}.json`), JSON.stringify(rows))
}

const count = (fn) => master.filter(fn).length
console.log(`files ${stats.files} · lines ${stats.lines} · rejected ${stats.bad} · merged duplicates ${stats.merged} · split by gender ${stats.split || 0}`)
console.log(`names ${master.length} · girls ${count(e => e.g._ === 'f')} · boys ${count(e => e.g._ === 'm')} · unisex ${count(e => e.g._ === 'u')}`)
console.log('native per language: ' + LOCALES.map(l => `${l} ${count(e => e.c.includes('intl') || e.c.some(c => LOCALE_CULTURES[l].includes(c)))}`).join(' · '))
if (bad.length) {
  writeFileSync(join(ROOT, 'data/rejected.txt'), bad.join('\n') + '\n')
  console.log(`rejected lines listed in data/rejected.txt (first 5):\n  ${bad.slice(0, 5).join('\n  ')}`)
}
