#!/usr/bin/env node
// Fictional characters who carry one of our names, by universe, from Wikidata (CC0): "Harry Potter names", "Disney names"…
//   node scripts/fetch-characters.mjs                 every universe below (reusing what an earlier run already fetched)
//   node scripts/fetch-characters.mjs friends naruto  only those, merged into the file
//   node scripts/fetch-characters.mjs --fresh         ignore what earlier runs fetched
// Two or three SPARQL queries per universe, one at a time and six seconds apart (Wikidata throttles this machine hard).
// Each answer is kept in the system temp folder for a week, so a run that dies picks up where it stopped.
// Writes data/characters.json (the universes that yield enough of our names) and data/raw/characters-universes.json
// (every universe tried, with its counts, whether it was kept, and its best-known characters whose name we do not have).
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data/characters.json')
const STATS = join(ROOT, 'data/raw/characters-universes.json')
const CACHE = join(tmpdir(), 'name-data-fetch')
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt']
const UA = 'name-data-fetch/1.0'
const KEEP = 60         // characters kept per universe
const PER_NAME = 3      // of which at most this many share a name, so sixty rows do not turn into twenty Johns
const MIN_LINKS = 1     // at least one Wikipedia article somewhere
const MIN_NAMES = 12    // a universe with fewer of our names than this does not make a list
const MISSED = 15       // best-known characters without a name of ours, listed per universe in the stats file
const GAP = 6000        // between two queries
const BATCH = 400       // characters per details query
const FRESH = process.argv.includes('--fresh')

// Where a universe's characters hang in Wikidata. `in`: the fictional universes (P1080), franchises (P8345) and works
// (P1441) a character can point to. `studio`: every work that studio produced (P272). `author`: every work by that
// writer (P50), plus the characters credited to them (P170). `qid` is the item the list is named after; `name`
// replaces its label when Wikidata's would read oddly as a title. `skip`: English labels that are not what they seem
// (a guest from another franchise, a code name, a family name written first). `surnameFirst`: the labels put the
// family name first, so only one-word names can be trusted. `list: false`: fetched and counted in the stats file, but
// left out of characters.json to keep it to sixteen lists; delete the flag to add the list.
const UNIVERSES = {
  'harry-potter': { qid: 'Q8337', in: ['Q5410773', 'Q30739117', 'Q8337', 'Q216930'] },
  'disney': { qid: 'Q1047410', name: 'Disney', studio: ['Q1047410'], in: ['Q1140303', 'Q18148065', 'Q246283', 'Q6548398', 'Q2901452', 'Q16155122', 'Q15731902', 'Q20649552', 'Q113674891', 'Q3260246', 'Q12301358'],
    skip: ['Ryu', 'Ken Masters', 'Donald Duckling'] }, // Street Fighter guests in Wreck-It Ralph; a duplicate of Donald Duck
  'pixar': { qid: 'Q127552', studio: ['Q127552'], in: ['Q2316015', 'Q15885268', 'Q5046850'], skip: ['Lewis Hamilton'] }, // the racing driver, as himself in Cars 2
  'star-wars': { qid: 'Q462', in: ['Q462', 'Q19786052', 'Q3551295'] },
  'marvel': { qid: 'Q931597', name: 'Marvel', in: ['Q931597', 'Q2246088', 'Q642878'], skip: ['Storm', 'Falcon', 'Echo', 'Nova', 'Vision', 'Angel', 'Rogue', 'Cable', 'Bishop', 'Havok', 'Sentry'] },
  'dc': { qid: 'Q1152150', name: 'DC', in: ['Q1152150', 'Q20775209'], skip: ['Flash', 'Oracle', 'Huntress', 'Arsenal', 'Speedy', 'Steel'] },
  'game-of-thrones': { qid: 'Q23572', in: ['Q2461698', 'Q45875', 'Q23572', 'Q17164884'] },
  'middle-earth': { qid: 'Q79734', in: ['Q81738', 'Q15228', 'Q74287', 'Q79762'] },
  'twilight': { qid: 'Q44523', in: ['Q20645685', 'Q44523', 'Q652599', 'Q189378', 'Q160071', 'Q53945'] },
  'hunger-games': { qid: 'Q11679', in: ['Q748351', 'Q11679', 'Q11885031', 'Q11678'] },
  'stranger-things': { qid: 'Q19798734', in: ['Q19798734', 'Q123728481'] },
  'friends': { qid: 'Q79784', in: ['Q79784'] },
  'simpsons': { qid: 'Q886', in: ['Q61468436', 'Q7764350', 'Q886'] },
  'naruto': { qid: 'Q642', in: ['Q1088263', 'Q642'] },
  'dragon-ball': { qid: 'Q2020', in: ['Q3551230', 'Q2020'] },
  'one-piece': { qid: 'Q673', in: ['Q16682047', 'Q673'], surnameFirst: true }, // Nico Robin, Charlotte Linlin, Bartholomew Kuma: all family names
  'pokemon': { qid: 'Q864', in: ['Q17562848', 'Q864'] },
  'ghibli': { qid: 'Q182950', studio: ['Q182950'] },
  'shakespeare': { qid: 'Q692', author: ['Q692'] },
  // Not on the first wish list, but well covered and full of ordinary given names.
  'attack-on-titan': { qid: 'Q586025', in: ['Q123784069', 'Q586025'] },
  'greys-anatomy': { qid: 'Q438406', in: ['Q438406'] },
  'star-trek': { qid: 'Q1092', in: ['Q18043309', 'Q1092'], list: false, skip: ['Kira Nerys', 'Kai Opaka', 'Li Nalas', 'Tora Ziyal'] }, // Bajoran family names come first; Kai is a title
  'doctor-who': { qid: 'Q34316', in: ['Q3567870', 'Q98137611', 'Q34316'], list: false },
  'walking-dead': { qid: 'Q232737', in: ['Q99429862', 'Q3177580', 'Q232737'], list: false },
  'big-bang-theory': { qid: 'Q8539', in: ['Q141934409', 'Q8539'], list: false },
  'narnia': { qid: 'Q501121', name: 'Narnia', in: ['Q501121'], list: false },
  'peanuts': { qid: 'Q7115636', in: ['Q98149594', 'Q7115636'], list: false },
  'peppa-pig': { qid: 'Q938985', in: ['Q109061852', 'Q938985'] },
  'how-i-met-your-mother': { qid: 'Q147235', in: ['Q147235'] },
  'the-witcher': { qid: 'Q11835640', in: ['Q1989642', 'Q11835640', 'Q47500433'] },
  'little-women': { qid: 'Q523076', in: ['Q523076'] },
  'pride-and-prejudice': { qid: 'Q170583', in: ['Q170583'] },
}

// A baby-name page is not the place for these as the example of a name. Villains in general are fine.
const UNWELCOME = /\b(murder|killer|criminal|nazi|terroris|porn|dictator|rapist|mobster|gangster|drug lord|trafficker|assassin|sex offender|fraudster|kidnapp|cult leader|shooter|war crim|concentration camp|genocid|asesin|narcotraf|violador|terrorista|dictador)\w*/i
const CHARACTER = 'Q95074'
const SEX = { Q6581097: 'm', Q6581072: 'f' }
// "Princess Leia", "Aunt May", "Sir Lancelot": the name follows. "Captain America", "Doctor Strange", "Lord Voldemort",
// "Darth Vader": what follows is not a first name, and the few times it is, the label rarely starts this way.
const COURTESY = new Set(['princess', 'prince', 'queen', 'king', 'aunt', 'auntie', 'uncle', 'sir', 'ser', 'lady', 'grandma', 'granny', 'grandpa', 'cousin', 'saint', 'st.'])
const RANK = new Set(['lord', 'darth', 'professor', 'prof.', 'captain', 'capt.', 'doctor', 'dr.', 'dr', 'mister', 'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'miss', 'general', 'gen.',
  'commander', 'colonel', 'col.', 'major', 'sergeant', 'sgt.', 'lieutenant', 'lt.', 'admiral', 'agent', 'detective', 'officer', 'inspector', 'master', 'mistress', 'baron', 'baroness',
  'count', 'countess', 'duke', 'duchess', 'emperor', 'empress', 'chief', 'judge', 'principal', 'coach', 'nurse', 'reverend', 'rev.', 'father', 'mother', 'brother', 'sister',
  'the', 'a', 'an', 'big', 'little', 'old', 'young', 'baby', 'mama', 'papa', 'madame', 'madam', 'monsieur', 'señor', 'senor', 'don', 'el', 'la', 'le', 'de', 'di', 'von', 'van'])
// Second words that give away a code name: Scarlet Witch, Winter Soldier, Iron Man.
const CODE_NAME = new Set(['witch', 'soldier', 'knight', 'man', 'woman', 'girl', 'boy', 'lad', 'lass', 'surfer', 'widow', 'panther', 'lantern', 'hornet', 'rider', 'torch', 'spider',
  'hulk', 'raccoon', 'beetle', 'devil', 'demon', 'sorcerer', 'monster', 'machine', 'squad', 'corps', 'patrol', 'america', 'marvel', 'lord', 'ranger', 'racer', 'avenger', 'guardian',
  'titan', 'ninja', 'bot', 'prime', 'master', 'trio', 'duo', 'family', 'twins', 'brothers', 'sisters', 'siblings', 'gang', 'team', 'clan'])

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const qid = uri => uri.split('/').pop()
const cached = key => { const f = join(CACHE, createHash('sha1').update(key).digest('hex') + '.json'); return { f, hit: !FRESH && existsSync(f) && Date.now() - statSync(f).mtimeMs < 7 * 864e5 } }
const keep = (file, data) => { mkdirSync(CACHE, { recursive: true }); writeFileSync(file + '.tmp', JSON.stringify(data)); renameSync(file + '.tmp', file) }

class Timeout extends Error {}

let lastQuery = 0
/** One SPARQL query: politely spaced, retried when the network drops, never retried unchanged when it times out. */
async function sparql(query) {
  const { f, hit } = cached(query)
  if (hit) return JSON.parse(readFileSync(f, 'utf8'))
  for (let attempt = 0; ; attempt++) {
    const wait = lastQuery + GAP - Date.now()
    if (wait > 0) await sleep(wait)
    const started = Date.now()
    try {
      const res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST', body: new URLSearchParams({ query }),
        headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(75000),
      })
      lastQuery = Date.now()
      if (res.status === 429 || res.status === 503) {
        const pause = parseInt(res.headers.get('retry-after') || '30', 10) + 5
        console.log(`  throttled, waiting ${pause}s`)
        await sleep(pause * 1000)
        if (attempt >= 7) throw new Error('still throttled after eight tries')
        continue
      }
      if (!res.ok) {
        const body = await res.text()
        if (/TimeoutException|timed out/i.test(body)) throw new Timeout('query timed out')
        throw new Error('HTTP ' + res.status)
      }
      const rows = (await res.json()).results.bindings
      keep(f, rows)
      return rows
    } catch (e) {
      lastQuery = Date.now()
      if (e instanceof Timeout) throw e
      if (Date.now() - started > 58000) throw new Timeout('query ran past the limit') // cut off mid-answer: the same query would be cut again
      if (attempt >= 4) throw e
      console.log(`  ${e.message}; trying again`)
      await sleep(8000 * (attempt + 1))
    }
  }
}

const values = (v, ids) => `VALUES ${v} { ${ids.map(id => 'wd:' + id).join(' ')} }`

/** Everything that points to the universe, with its English label and how many Wikipedias cover it. Works, places and
 *  objects come along too; they are weeded out later, once we know which ones start with one of our names. */
async function candidates(u) {
  const parts = []
  if (u.in) for (const p of ['P1080', 'P8345', 'P1441']) parts.push(`{ ${values('?u', u.in)} ?c wdt:${p} ?u }`)
  if (u.studio) parts.push(`{ ${values('?x', u.studio)} ?w wdt:P272 ?x . ?c wdt:P1441 ?w }`)
  if (u.author) parts.push(`{ ${values('?x', u.author)} ?w wdt:P50 ?x . ?c wdt:P1441 ?w }`, `{ ${values('?x', u.author)} ?c wdt:P170 ?x }`)
  // Without the hint the query service starts from "everything that has a sitelink count" and times out; with it, it works top to bottom.
  const rows = await sparql(`SELECT ?c ?links ?en ?mul WHERE {
    hint:Query hint:optimizer "None" .
    { SELECT DISTINCT ?c WHERE { ${parts.join(' UNION ')} } }
    ?c wikibase:sitelinks ?links . FILTER(?links >= ${MIN_LINKS})
    OPTIONAL { ?c rdfs:label ?en . FILTER(LANG(?en) = "en") }
    OPTIONAL { ?c rdfs:label ?mul . FILTER(LANG(?mul) = "mul") }
  }`)
  return rows.map(r => ({ id: qid(r.c.value), links: parseInt(r.links.value, 10), label: r.en?.value || r.mul?.value })).filter(c => c.label)
}

/** Labels, descriptions, Wikipedia titles, sex, and whether the item is a fictional character at all. The ids are
 *  listed inside every branch on purpose: with the list outside the UNION the query service walks all of Wikipedia's titles. */
async function details(ids, into) {
  const these = values('?p', ids)
  const langs = `FILTER(LANG(?v) IN (${[...LANGS, 'mul'].map(l => `"${l}"`).join(', ')}))`
  let rows
  try {
    rows = await sparql(`SELECT ?p ?k ?v WHERE {
      { ${these} ?p rdfs:label ?v . ${langs} BIND("l" AS ?k) }
      UNION { ${these} ?p schema:description ?v . ${langs} BIND("t" AS ?k) }
      UNION { ${these} ?a schema:about ?p ; schema:isPartOf ?site ; schema:name ?v . FILTER(?site IN (${LANGS.map(l => `<https://${l}.wikipedia.org/>`).join(', ')})) BIND("w" AS ?k) }
      UNION { ${these} ?p wdt:P21 ?v . BIND("g" AS ?k) }
      UNION { ${these} ?p wdt:P31 ?v . BIND("i" AS ?k) }
      UNION { ${these} ?p wdt:P31 ?t . ?t wdt:P279* wd:${CHARACTER} . BIND("c" AS ?k) BIND(?t AS ?v) }
    }`)
  } catch (e) {
    if (!(e instanceof Timeout) || ids.length < 20) throw e
    console.log(`  a batch of ${ids.length} timed out; halving it`)
    await details(ids.slice(0, ids.length >> 1), into)
    await details(ids.slice(ids.length >> 1), into)
    return
  }
  for (const r of rows) {
    const id = qid(r.p.value), k = r.k.value
    if (!into.has(id)) into.set(id, { l: {}, t: {}, w: {}, types: new Set(), character: false })
    const e = into.get(id)
    if (k === 'c') e.character = true
    else if (k === 'i') e.types.add(qid(r.v.value))
    else if (k === 'g') { if (SEX[qid(r.v.value)]) e.g = SEX[qid(r.v.value)] }
    else e[k][r.v['xml:lang']] = r.v.value
  }
}

const master = JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8'))
const slugBySpelling = new Map()
// A spelling can belong to two names (Andrea, Andréa): the more popular one takes it.
for (const e of [...master].sort((a, b) => b.p - a.p || a.slug.localeCompare(b.slug))) for (const s of new Set(Object.values(e.f))) if (!slugBySpelling.has(fold(s))) slugBySpelling.set(fold(s), e.slug)

/** The name of ours a character goes by, from the label English-speaking fans know them by, or null.
 *  "Hermione Granger" → hermione, "Mary Jane Watson" → mary-jane if we have it, else mary, "Jean-Luc Picard" → jean-luc or jean,
 *  "Princess Leia" → leia; nothing for "Lord Voldemort", "Captain America", "Scarlet Witch" or "Timon and Pumbaa". */
function nameOf(label, surnameFirst) {
  let words = label.replace(/["“”«»]/g, '').replace(/\s*\(.*\)\s*$/, '').trim().split(/\s+/)
  if (words.some(w => /^(and|&|'n'|n'|vs\.?)$/i.test(w)) || (surnameFirst && words.length > 1)) return null
  if (words.length > 1 && COURTESY.has(fold(words[0]))) words = words.slice(1)
  const first = fold(words[0].replace(/[,.:;]+$/, ''))
  if (RANK.has(first) || COURTESY.has(first)) return null
  if (words.length > 1 && words.length < 4 && CODE_NAME.has(fold(words[words.length - 1]))) return null
  if (words.length > 2) { const two = slugBySpelling.get(first + ' ' + fold(words[1])) || slugBySpelling.get(first + '-' + fold(words[1])); if (two) return two }
  if (slugBySpelling.has(first)) return slugBySpelling.get(first)
  // "Jean-Luc" and "Jack-Jack" are a first name and another one; "Obi-Wan" and "Bo-Katan" only look like it.
  const dash = first.indexOf('-')
  if (dash > 0 && slugBySpelling.has(first.slice(dash + 1))) return slugBySpelling.get(first.slice(0, dash)) || null
  return null
}

const welcome = e => !UNWELCOME.test(e.t.en || '') && !UNWELCOME.test(e.t.es || '')
const lean = o => Object.fromEntries(Object.entries(o).filter(([l, v]) => l === 'en' || v !== o.en))
const inLangs = (o, fallback) => Object.fromEntries(LANGS.map(l => [l, o[l] || fallback]).filter(([, v]) => v))

function save(path, data) {
  writeFileSync(path + '.tmp', JSON.stringify(data))
  renameSync(path + '.tmp', path)
}

const only = process.argv.slice(2).filter(a => !a.startsWith('--'))
const out = only.length && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const stats = only.length && existsSync(STATS) ? JSON.parse(readFileSync(STATS, 'utf8')) : {}

for (const [key, u] of Object.entries(UNIVERSES)) {
  if (only.length && !only.includes(key)) continue
  const all = (await candidates(u)).filter(c => !u.skip?.includes(c.label))
  const named = all.map(c => ({ ...c, slug: nameOf(c.label, u.surnameFirst) })).filter(c => c.slug)
  // The best-known ones we have no name for, to see what a list is missing (Draco, Sirius, Leia…).
  const unnamed = all.filter(c => !nameOf(c.label, u.surnameFirst)).sort((a, b) => b.links - a.links || a.id.localeCompare(b.id)).slice(0, MISSED * 3)
  const info = new Map()
  const ids = [...new Set([u.qid, ...named.map(c => c.id), ...unnamed.map(c => c.id)])].sort()
  for (let i = 0; i < ids.length; i += BATCH) await details(ids.slice(i, i + BATCH), info)

  // One row per character: Wikidata often has the book's, the film's and the game's version of the same one.
  const seen = new Set(), perName = new Map(), people = []
  let characters = 0
  const names = new Set()
  for (const c of named.sort((a, b) => b.links - a.links || a.id.localeCompare(b.id))) {
    const e = info.get(c.id)
    if (!e || !e.character || !welcome(e) || seen.has(fold(c.label))) continue
    seen.add(fold(c.label))
    characters++
    names.add(c.slug)
    const n = perName.get(c.slug) || 0
    if (people.length >= KEEP || n >= PER_NAME) continue
    perName.set(c.slug, n + 1)
    const row = { id: c.id, links: c.links, slug: c.slug, l: lean(inLangs(e.l, e.l.mul)), t: inLangs(e.t), w: inLangs(e.w) }
    if (e.g) row.g = e.g
    people.push(row)
  }
  const label = u.name ? Object.fromEntries(LANGS.map(l => [l, u.name])) : inLangs(info.get(u.qid)?.l || {}, info.get(u.qid)?.l.mul)
  const enough = names.size >= MIN_NAMES, kept = enough && u.list !== false
  const missed = unnamed.filter(c => info.get(c.id)?.character).slice(0, MISSED).map(c => c.label)
  // Named, but Wikidata does not call it a fictional character (a ship, a place, a film, a real person): worth a look when a list seems thin.
  const notCharacters = named.filter(c => info.get(c.id) && !info.get(c.id).character).map(c => c.label)
  stats[key] = { qid: u.qid, label: label.en, items: all.length, characters, names: names.size, rows: people.length, kept,
    why: kept ? undefined : enough ? 'enough names, left out to keep the file to sixteen lists (list: false)' : `fewer than ${MIN_NAMES} of our names`,
    missed, notCharacters: notCharacters.slice(0, 12), notCharactersCount: notCharacters.length }
  if (kept) out[key] = { qid: u.qid, label, people }
  else delete out[key]
  console.log(`${kept ? '✓' : enough ? '·' : '✗'} ${key}: ${all.length} items with a Wikipedia article · ${characters} characters go by one of our names · ${names.size} names · ${people.length} rows`)
  save(OUT, out)
  save(STATS, stats)
}
console.log(`${Object.keys(out).length} universes kept: ${Object.keys(out).join(', ')}`)
