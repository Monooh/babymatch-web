#!/usr/bin/env node
// Well-known people for each name, from Wikidata (CC0). Real data, so name pages say something no other page says.
//   node scripts/fetch-people.mjs            every name still missing, best-known names first (resumable, hours)
//   node scripts/fetch-people.mjs 500        only the next 500 missing names
//   node scripts/fetch-people.mjs creators   the best-known youtubers, tiktokers, singers… and their given names
//   node scripts/fetch-people.mjs creators actor model   only those kinds
// Writes data/people.json and data/creators.json; `npm run data` turns them into what the site reads.
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PEOPLE = join(ROOT, 'data/people.json')
const CREATORS = join(ROOT, 'data/creators.json')
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt']
const UA = 'name-data-fetch/1.0'
const KEEP = 8          // people kept per name
const CANDIDATES = 40   // ranked candidates looked at per name (many carry the name only as a middle name)
const MIN_LINKS = 10    // Wikipedia language editions: a floor for "well known"

// Occupations that make a list of their own ("Names of youtubers"). Wikidata ids → our kind.
export const KINDS = {
  youtuber: ['Q17125263'],
  tiktoker: ['Q94791573'],
  influencer: ['Q2906862', 'Q2045208'],
  singer: ['Q177220'],
  actor: ['Q33999', 'Q10800557', 'Q10798782'],
  footballer: ['Q937857'],
  model: ['Q4610556'],
}
// Wikidata lists every occupation a person ever had (Camus kept goal, Brian May has a channel). A kind only counts
// when the person's own one-line description says so.
const KIND_SAYS = {
  youtuber: /youtube|vlogger|streamer/i, tiktoker: /tiktok|social media|influencer|internet|content creator|youtuber|dancer|comedian/i, influencer: /influencer|internet (celebrity|personality)|social media|content creator/i,
  singer: /singer|songwriter|rapper|vocalist/i, actor: /\bact(or|ress)\b/i, footballer: /football|soccer/i, model: /\bmodel\b/i,
}
const KIND_OF = Object.fromEntries(Object.entries(KINDS).flatMap(([k, ids]) => ids.map(id => [id, k])))
// A baby-name page is not the place for these, however well known.
const UNWELCOME = /\b(murder|killer|criminal|nazi|terroris|porn|dictator|rapist|mobster|gangster|drug lord|trafficker|assassin|sex offender|fraudster|kidnapp|cult leader|shooter|war crim|concentration camp|genocid|asesin|narcotraf|violador|terrorista|dictador)\w*/i

const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const qid = uri => uri.split('/').pop()
const year = v => { const m = /^(-?\d{1,4})-/.exec(v || ''); return m ? parseInt(m[1], 10) : null }

async function http(url, accept) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(70000) })
      if (res.status === 429 || res.status === 503) { await sleep((parseInt(res.headers.get('retry-after') || '20', 10) + 2) * 1000); continue }
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } catch (e) {
      if (attempt === 3) throw e
      await sleep(4000 * (attempt + 1))
    }
  }
  throw new Error('gave up')
}
const sparql = async q => (await http('https://query.wikidata.org/sparql?query=' + encodeURIComponent(q), 'application/sparql-results+json')).results.bindings

/** Labels, descriptions and Wikipedia titles for up to 50 ids at a time. */
async function entities(ids) {
  const out = {}
  for (let i = 0; i < ids.length; i += 50) {
    const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|sitelinks'
      + '&languages=' + [...LANGS, 'mul'].join('|') + '&sitefilter=' + LANGS.map(l => l + 'wiki').join('|') + '&ids=' + ids.slice(i, i + 50).join('|')
    const data = await http(url, 'application/json')
    for (const [id, e] of Object.entries(data.entities || {})) {
      const mul = e.labels?.mul?.value
      const label = {}, desc = {}, wiki = {}
      for (const l of LANGS) {
        const v = e.labels?.[l]?.value || mul
        if (v) label[l] = v
        if (e.descriptions?.[l]?.value) desc[l] = e.descriptions[l].value
        if (e.sitelinks?.[l + 'wiki']?.title) wiki[l] = e.sitelinks[l + 'wiki'].title
      }
      out[id] = { label, desc, wiki }
    }
  }
  return out
}

/** True when the person goes by this name (it opens their usual name), not when it is a middle name. */
function goesBy(entity, spellings) {
  const wanted = spellings.map(fold)
  return Object.values(entity.label).some(v => { const f = fold(v); return wanted.some(w => f === w || f.startsWith(w + ' ') || f.startsWith(w + '-')) })
}
const welcome = e => !UNWELCOME.test(e.desc.en || '') && !UNWELCOME.test(e.desc.es || '')
/** Store a label only where it differs from the English one. Wikipedia titles are kept whole: a missing one means no article. */
const lean = (o) => Object.fromEntries(Object.entries(o).filter(([l, v]) => l === 'en' || v !== o.en))

async function peopleFor(spellings) {
  const labels = spellings.flatMap(s => ['mul', ...LANGS].map(l => `"${s.replace(/["\\]/g, '')}"@${l}`)).join(' ')
  const rows = await sparql(`SELECT DISTINCT ?p ?links WHERE {
    VALUES ?lbl { ${labels} } ?g rdfs:label ?lbl ; wdt:P31 ?t . VALUES ?t { wd:Q11879590 wd:Q12308941 wd:Q3409032 wd:Q202444 }
    ?p wdt:P735 ?g ; wdt:P31 wd:Q5 ; wikibase:sitelinks ?links . FILTER(?links >= ${MIN_LINKS})
  } ORDER BY DESC(?links) LIMIT ${CANDIDATES}`)
  const ranked = [...new Map(rows.map(r => [qid(r.p.value), parseInt(r.links.value, 10)]))]
  if (!ranked.length) return []
  const info = await entities(ranked.map(([id]) => id))
  const kept = ranked.filter(([id]) => info[id] && goesBy(info[id], spellings) && welcome(info[id]) && Object.keys(info[id].desc).length).slice(0, KEEP)
  if (!kept.length) return []
  const facts = await sparql(`SELECT ?p ?birth ?death ?occ WHERE { VALUES ?p { ${kept.map(([id]) => 'wd:' + id).join(' ')} }
    OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death } OPTIONAL { ?p wdt:P106 ?occ } }`)
  return kept.map(([id, links]) => {
    const mine = facts.filter(f => qid(f.p.value) === id)
    const kinds = [...new Set(mine.map(f => f.occ && KIND_OF[qid(f.occ.value)]).filter(Boolean))].filter(k => KIND_SAYS[k].test(info[id].desc.en || ''))
    const e = info[id]
    return { id, links, b: year(mine.find(f => f.birth)?.birth.value), d: year(mine.find(f => f.death)?.death.value), k: kinds, l: lean(e.label), t: e.desc, w: e.wiki }
  })
}

function save(path, data) {
  writeFileSync(path + '.tmp', JSON.stringify(data))
  renameSync(path + '.tmp', path)
}

async function crawlPass(limit) {
  const master = JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8'))
  const done = existsSync(PEOPLE) ? JSON.parse(readFileSync(PEOPLE, 'utf8')) : {}
  const todo = master.filter(e => !(e.slug in done)).sort((a, b) => b.p - a.p || a.slug.localeCompare(b.slug)).slice(0, limit)
  console.log(`${Object.keys(done).length} names done, ${todo.length} to fetch`)
  let n = 0, found = 0, failed = 0
  const worker = async () => {
    for (;;) {
      const e = todo.shift()
      if (!e) return
      const spellings = [...new Set(Object.values(e.f))]
      try {
        const people = await peopleFor(spellings)
        done[e.slug] = people
        if (people.length) found++
      } catch (err) {
        failed++ // left out of the file on purpose, so the next pass tries again
        console.log(`  ! ${e.slug}: ${err.message}`)
        await sleep(30000) // most failures are the network dropping: no point rushing through the next names
      }
      if (++n % 20 === 0) { save(PEOPLE, done); console.log(`${n} fetched · ${found} with people · ${failed} failed · last ${e.slug}`) }
      await sleep(300)
    }
  }
  await Promise.all([worker(), worker()])
  save(PEOPLE, done)
  console.log(`pass finished: ${n} fetched · ${found} with people · ${failed} failed`)
  return failed
}

/** Every name still missing; whatever fails (a dropped connection, a throttled request) gets up to three more passes. */
async function crawlNames(limit) {
  for (let pass = 1; pass <= 4; pass++) {
    const failed = await crawlPass(limit)
    if (!failed) break
    console.log(`${failed} names failed; waiting two minutes before trying them again`)
    await sleep(120000)
  }
}

async function crawlCreators(only) {
  const out = existsSync(CREATORS) ? JSON.parse(readFileSync(CREATORS, 'utf8')) : {}
  for (const [kind, ids] of Object.entries(KINDS)) {
    if (only.length && !only.includes(kind)) continue
    const big = ['singer', 'actor', 'footballer', 'model'].includes(kind)
    // Rank first, on its own: joining the given names into this query makes the big occupations time out.
    const rows = await sparql(`SELECT DISTINCT ?p ?links WHERE {
      VALUES ?occ { ${ids.map(i => 'wd:' + i).join(' ')} } ?p wdt:P106 ?occ ; wdt:P31 wd:Q5 ; wikibase:sitelinks ?links . FILTER(?links >= ${big ? 45 : 2})
    } ORDER BY DESC(?links) LIMIT ${big ? 1200 : 3000}`)
    const links = new Map(rows.map(r => [qid(r.p.value), parseInt(r.links.value, 10)]))
    const info = await entities([...links.keys()])
    const fits = [...links.keys()].filter(id => info[id] && welcome(info[id]) && KIND_SAYS[kind].test(info[id].desc.en || ''))
    const givens = new Map()
    for (let i = 0; i < fits.length; i += 150) {
      const found = await sparql(`SELECT ?p ?given WHERE { VALUES ?p { ${fits.slice(i, i + 150).map(id => 'wd:' + id).join(' ')} }
        ?p wdt:P735 ?g . ?g rdfs:label ?given . FILTER(LANG(?given) IN ("mul", "en")) }`)
      for (const r of found) { const id = qid(r.p.value); if (!givens.has(id)) givens.set(id, new Set()); givens.get(id).add(r.given.value) }
      await sleep(500)
    }
    out[kind] = fits.filter(id => givens.has(id))
      .map(id => ({ id, links: links.get(id), given: [...givens.get(id)].filter(g => goesBy(info[id], [g])), l: lean(info[id].label), t: info[id].desc, w: lean(info[id].wiki) }))
      .filter(p => p.given.length)
    console.log(`${kind}: ${out[kind].length} people`)
    save(CREATORS, out)
    await sleep(2000)
  }
}

const arg = process.argv[2]
if (arg === 'creators') await crawlCreators(process.argv.slice(3))
else await crawlNames(arg ? parseInt(arg, 10) : Infinity)
