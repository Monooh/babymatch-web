#!/usr/bin/env node
// Name days (santoral) for each name, from Wikidata (CC0): the feast day of the best-known saints and blesseds who go
// by that name, plus the Marian titles many Spanish names come from (Pilar, Carmen, Guadalupe…).
//   node scripts/fetch-saints.mjs           fetch (or reuse what an earlier run already fetched) and write data/saints.json
//   node scripts/fetch-saints.mjs --fresh   ignore what earlier runs fetched
// About 25 SPARQL queries, one at a time and six seconds apart: Wikidata throttles this machine hard, the query service
// and the API alike, so labels, descriptions and Wikipedia titles come from a few large queries, never from one request
// per saint. Each answer is kept in the system temp folder for a week, so a run that dies picks up where it stopped.
// Also writes data/raw/saints-ambiguous.json: the kept saints with more than one feast day, and how the day was picked.
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data/saints.json')
const AMBIGUOUS = join(ROOT, 'data/raw/saints-ambiguous.json')
const CACHE = join(tmpdir(), 'name-data-fetch')
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt']
const UA = 'name-data-fetch/1.0'
const KEEP = 3          // saints kept per name
const MIN_LINKS = 1     // at least one Wikipedia article somewhere
const GAP = 6000        // between two queries
const BATCH = 400       // saints per details query
// "Best known" is the number of Wikipedias, but a modern pope or tsar has far more of them than the saint a name day
// is actually named after (John XXIII over John the Baptist, Nicholas II over Saint Nicholas). People known by a regnal
// name and number count for half when ranking. Set to 1 for a plain ranking by Wikipedias; `links` is never altered.
const REGNAL_WEIGHT = 0.5
const FRESH = process.argv.includes('--fresh')

// Same list as fetch-people.mjs. Martyrs were murdered, so those words alone do not rule a saint out.
const UNWELCOME = /\b(murder|killer|criminal|nazi|terroris|porn|dictator|rapist|mobster|gangster|drug lord|trafficker|assassin|sex offender|fraudster|kidnapp|cult leader|shooter|war crim|concentration camp|genocid|asesin|narcotraf|violador|terrorista|dictador)\w*/i
const MARTYRED = /\b(murdered|murder victim|assassinated|asesinad[oa]s?|killed by \w+|victim of (the )?nazi\w*|nazi (victim|concentration camp)\w*|concentration camp (victim|prisoner|inmate)\w*|(died|killed) (in|at) (the )?[\w-]+ concentration camp)\b/gi

// What a feast day belongs to. People first; a few angels; nothing that is a group, a place or an image.
const PERSON = new Set(['Q5', 'Q20643955', 'Q21070568', 'Q13002315', 'Q178342', 'Q10822464', 'Q690175'])
const GROUP = new Set(['Q16334295', 'Q10648343', 'Q109288825', 'Q125258836', 'Q109288828', 'Q3046146', 'Q125143602', 'Q22813674', 'Q14073567',
  'Q16979650', 'Q109289221', 'Q109288863', 'Q125258812', 'Q29430681', 'Q16145172', 'Q132776456'])
const MARIAN = 'Q1509831' // title of Mary, mother of Jesus: Our Lady of the Pillar, of Guadalupe, of Mount Carmel…

// Which calendar a feast-day statement speaks for, read from its qualifiers. Our six languages keep the Roman calendar,
// so when a saint has several days: the current General Roman Calendar, then anything Catholic, then a day with no
// qualifier, then a local feast, then the other rites and the calendars no longer in use.
const ROMAN = new Set(['Q13012667', 'Q98782022'])
const CATHOLIC = new Set(['Q9592', 'Q1841', 'Q14705108', 'Q7361618', 'Q597526', 'Q842798', 'Q160381', 'Q2138391', 'Q379564', 'Q3075684', 'Q17520839', 'Q2668281'])
const OTHER_RITE = new Set(['Q35032', 'Q3333484', 'Q60995', 'Q1142865', 'Q7883976', 'Q5532158', 'Q11184', 'Q6423963', 'Q682443', 'Q245177', 'Q205653', 'Q198998',
  'Q683724', 'Q7970362', 'Q49376', 'Q59778', 'Q188814', 'Q906685', 'Q179829', 'Q192173', 'Q730726', 'Q989799', 'Q242758', 'Q181901', 'Q750430', 'Q540405',
  'Q199993', 'Q23540', 'Q1771682', 'Q472189', 'Q56242045'])
const LOCAL = new Set(['P1001', 'P276', 'P17'])            // applies to a place
const ENDED = new Set(['P582', 'P1326', 'P576'])           // no longer kept on that day
const ABANDONED = 'Q63065035'
const SEX = { Q6581097: 'm', Q6581072: 'f' }

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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "December 13" → "12-13". Day-of-the-year items carry no month or day number, only this label. Movable feasts give null. */
function monthDay(label) {
  const m = /^([A-Z][a-z]+) (\d{1,2})$/.exec(label || '') || /^(\d{1,2}) ([A-Z][a-z]+)$/.exec(label || '')
  if (!m) return null
  const [month, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]]
  const i = MONTHS.indexOf(month), d = parseInt(day, 10)
  return i < 0 || d < 1 || d > 31 ? null : String(i + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
}

/** Every feast-day statement: the day it points to, how much weight it carries, and how many Wikipedias cover the saint. */
async function statements() {
  // A few saints point to a feast ("Michaelmas") instead of a day: P837 on the feast gives its day.
  const rows = await sparql(`SELECT ?p ?s ?rank ?links ?dayEn ?viaEn WHERE {
    ?p p:P841 ?s . ?s ps:P841 ?day ; wikibase:rank ?rank . ?p wikibase:sitelinks ?links . FILTER(?links >= ${MIN_LINKS})
    OPTIONAL { ?day rdfs:label ?dayEn . FILTER(LANG(?dayEn) = "en") }
    OPTIONAL { ?day wdt:P837 ?via . ?via rdfs:label ?viaEn . FILTER(LANG(?viaEn) = "en") }
  }`)
  const quals = await sparql(`SELECT ?s ?prop ?v WHERE { ?p p:P841 ?s . ?s ?pq ?v . ?prop wikibase:qualifier ?pq }`)
  const types = await sparql(`SELECT ?p ?t WHERE { ?p wdt:P841 [] ; wdt:P31 ?t }`)
  const sexes = await sparql(`SELECT ?p ?g WHERE { ?p wdt:P841 [] ; wdt:P21 ?g }`)
  const qualifiers = new Map()
  for (const q of quals) { const k = q.s.value; if (!qualifiers.has(k)) qualifiers.set(k, []); qualifiers.get(k).push([qid(q.prop.value), q.v.type === 'uri' ? qid(q.v.value) : q.v.value]) }
  // One row per statement and per day its feast falls on; a feast that moves (Easter, "the Sunday after…") has several and tells us nothing.
  const found = new Map()
  for (const r of rows) {
    const k = r.s.value
    if (!found.has(k)) found.set(k, { id: qid(r.p.value), links: parseInt(r.links.value, 10), rank: r.rank.value.split('#')[1], direct: monthDay(r.dayEn?.value), via: new Set() })
    const via = monthDay(r.viaEn?.value)
    if (via) found.get(k).via.add(via)
  }
  const saints = new Map()
  for (const [sid, st] of found) {
    if (!saints.has(st.id)) saints.set(st.id, { id: st.id, links: st.links, types: new Set(), sex: new Set(), statements: [] })
    const day = st.direct || (st.via.size === 1 ? [...st.via][0] : null)
    if (!day || st.rank === 'DeprecatedRank') continue
    const q = qualifiers.get(sid) || []
    const values = q.map(([, v]) => v)
    const calendar = values.some(v => ROMAN.has(v)) ? 8 : values.some(v => CATHOLIC.has(v)) ? 6 : values.some(v => OTHER_RITE.has(v)) ? 0 : q.some(([p]) => LOCAL.has(p)) ? 2 : 4
    const score = (st.rank === 'PreferredRank' ? 100 : 0) + (q.some(([p]) => ENDED.has(p)) || values.includes(ABANDONED) ? -20 : 0) + calendar
    // The API writes a statement id as "Q1$GUID", the query service as "…/statement/Q1-GUID".
    saints.get(st.id).statements.push({ key: qid(sid).replace('-', '$').toLowerCase(), day, score })
  }
  for (const t of types) saints.get(qid(t.p.value))?.types.add(qid(t.t.value))
  for (const g of sexes) { const sex = SEX[qid(g.g.value)]; if (sex) saints.get(qid(g.p.value))?.sex.add(sex) }
  return saints
}

/** Labels, descriptions and Wikipedia titles for these ids. The ids are listed inside every branch on purpose: that
 *  keeps each one to direct look-ups. With the list outside the UNION, or with "every item that has a feast day"
 *  instead of a list, the query service walks all of Wikipedia's titles and times out. A batch that still times out is halved. */
async function details(ids, into) {
  const these = `VALUES ?p { ${ids.map(id => 'wd:' + id).join(' ')} }`
  const langs = `FILTER(LANG(?v) IN (${[...LANGS, 'mul'].map(l => `"${l}"`).join(', ')}))`
  let rows
  try {
    rows = await sparql(`SELECT ?p ?k ?v WHERE {
      { ${these} ?p rdfs:label ?v . ${langs} BIND("l" AS ?k) }
      UNION { ${these} ?p schema:description ?v . ${langs} BIND("t" AS ?k) }
      UNION { ${these} ?a schema:about ?p ; schema:isPartOf ?site ; schema:name ?v . FILTER(?site IN (${LANGS.map(l => `<https://${l}.wikipedia.org/>`).join(', ')})) BIND("w" AS ?k) }
    }`)
  } catch (e) {
    if (!(e instanceof Timeout) || ids.length < 20) throw e
    console.log(`  a batch of ${ids.length} timed out; halving it`)
    await details(ids.slice(0, ids.length >> 1), into)
    await details(ids.slice(ids.length >> 1), into)
    return
  }
  for (const r of rows) {
    const id = qid(r.p.value), lang = r.v['xml:lang']
    if (!into.has(id)) into.set(id, { l: {}, t: {}, w: {} })
    into.get(id)[r.k.value][lang] = r.v.value
  }
}

/** The order of each saint's feast-day statements, which only the API knows. It is throttled far below the query
 *  service here, so this is asked for the handful of saints whose days tie, fifty at a time, and given up on quietly. */
async function statementOrder(ids) {
  const order = new Map()
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const { f, hit } = cached('order ' + batch.join(' '))
    let data = hit ? JSON.parse(readFileSync(f, 'utf8')) : null
    for (let attempt = 0; !data && attempt < 8; attempt++) {
      try {
        const res = await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + batch.join('|'),
          { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(90000) })
        if (res.status === 429 || res.status === 503) { const pause = parseInt(res.headers.get('retry-after') || '30', 10) + 5; console.log(`  API throttled, waiting ${pause}s`); await sleep(pause * 1000); continue }
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const json = await res.json()
        data = Object.fromEntries(Object.entries(json.entities || {}).map(([id, e]) => [id, (e.claims?.P841 || []).map(c => c.id.toLowerCase())]))
        keep(f, data)
      } catch (e) { console.log(`  API: ${e.message}`); await sleep(10000 * (attempt + 1)) }
    }
    if (!data) { console.log(`  no statement order for ${batch.length} saints; their ties go to the earliest day`); continue }
    for (const [id, keys] of Object.entries(data)) order.set(id, keys)
    console.log(`  ${Math.min(i + 50, ids.length)} of ${ids.length}`)
    await sleep(2000)
  }
  return order
}

const HONORIFIC = /^(?:sant'|(?:saint|sainte|st\.?|san|santa|santo|sao|sankt|heiliger|heilige|hl\.?|blessed|beato|beata|bienheureux|bienheureuse|seliger|selige|pope|papa|pape|papst|venerable|mother|madre|mere|padre|pere|father|fray|fra|sor|sister|brother|frere) +)/
const NUMERAL = /^(?:[IVXLC]+\.?|Ier|Ire|1er|1re)$/
/** The given names a label can stand for: "Saint Lucy" → lucy; "Jean-Marie Vianney" → jean-marie vianney, jean, jean-marie;
 *  "John Paul II" → only "john paul", because a regnal name is the whole name, not a first name followed by a second. */
function givenNames(label) {
  const words = label.trim().split(/\s+/)
  const numeral = words.findIndex((w, i) => i > 0 && NUMERAL.test(w))
  let f = fold(numeral > 0 ? words.slice(0, numeral).join(' ') : label.trim())
  for (let i = 0; i < 2; i++) f = f.replace(HONORIFIC, '')
  if (numeral > 0) return [f]
  const out = [f]
  for (let i = 0, cuts = 0; i < f.length && cuts < 3; i++) if (f[i] === ' ' || f[i] === '-') { out.push(f.slice(0, i)); cuts++ }
  return out
}
const regnal = labels => labels.some(v => v.trim().split(/\s+/).some((w, i) => i > 0 && NUMERAL.test(w)))

const OUR_LADY = /^(?:our lady|virgin|blessed virgin mary|nuestra senora|virgen|santa maria|notre-dame|vierge|madonna|nostra signora|beata vergine|nossa senhora|virgem|unsere liebe frau|maria|mare de deu) (?:(?:of the|of|de los|de las|de la|de l'|del|della|delle|dei|des|dos|das|du|di|do|da|de|von|vom|der) )?(.+)$/
// The one title whose name is not the word in it: Mercedes is "María de las Mercedes", the Virgin of Mercy (la Merced).
const MARIAN_ALIAS = [[/^merced\b/, 'mercedes']]
/** "Virgen del Pilar" → pilar, "Nuestra Señora de los Dolores" → dolores: the name is whatever the title is "of". */
function marianName(label) {
  const m = OUR_LADY.exec(fold(label.trim()))
  if (!m) return null
  const alias = MARIAN_ALIAS.find(([re]) => re.test(m[1]))
  return alias ? alias[1] : m[1]
}

const welcome = e => !UNWELCOME.test((e.t.en || '').replace(MARTYRED, '')) && !UNWELCOME.test((e.t.es || '').replace(MARTYRED, ''))
const lean = o => Object.fromEntries(Object.entries(o).filter(([l, v]) => l === 'en' || v !== o.en))
const inLangs = (o, fallback) => Object.fromEntries(LANGS.map(l => [l, o[l] || fallback]).filter(([, v]) => v))

function save(path, data) {
  writeFileSync(path + '.tmp', JSON.stringify(data))
  renameSync(path + '.tmp', path)
}

const master = JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8'))
const slugsBySpelling = new Map()
for (const e of master) for (const s of new Set(Object.values(e.f))) { const k = fold(s); if (!slugsBySpelling.has(k)) slugsBySpelling.set(k, new Set()); slugsBySpelling.get(k).add(e.slug) }
// A spelling shared across languages must not hand a man's feast to a woman's name: Andrea is Andrew in Italian, and
// "Julià" folds to Julia. A name takes a saint when it is used for that sex in some language (`u` is either).
const usedFor = new Map(master.map(e => [e.slug, new Set(Object.values(e.g))]))
const fits = (slug, sex) => !sex.size || usedFor.get(slug).has('u') || [...sex].some(x => usedFor.get(slug).has(x))

console.log('feast-day statements…')
const saints = await statements()
console.log(`${saints.size} items with a feast day`)

console.log('labels, descriptions and Wikipedia titles…')
const isMarian = s => s.types.has(MARIAN)
const isPerson = s => [...s.types].some(t => PERSON.has(t)) && ![...s.types].some(t => GROUP.has(t))
const wanted = [...saints.values()].filter(s => s.statements.length && (isMarian(s) || isPerson(s))).map(s => s.id).sort()
const info = new Map()
for (let i = 0; i < wanted.length; i += BATCH) {
  await details(wanted.slice(i, i + BATCH), info)
  console.log(`  ${Math.min(i + BATCH, wanted.length)} of ${wanted.length}`)
}

// Who goes by which of our names.
const bySlug = new Map()
let persons = 0, marian = 0
for (const id of wanted) {
  const s = saints.get(id), e = info.get(id)
  if (!e || !welcome(e)) continue
  const mary = isMarian(s)
  const labels = Object.values(inLangs(e.l, e.l.mul))
  const names = new Set(labels.flatMap(v => mary ? [marianName(v)].filter(Boolean) : givenNames(v)))
  const sex = mary ? new Set(['f']) : s.sex
  const slugs = new Set([...names].flatMap(n => [...(slugsBySpelling.get(n) || [])]).filter(slug => fits(slug, sex)))
  if (!slugs.size) continue
  mary ? marian++ : persons++
  const row = { id, day: null, links: s.links, l: lean(inLangs(e.l, e.l.mul)), t: inLangs(e.t), w: inLangs(e.w) }
  if (sex.size === 1) row.g = [...sex][0]
  if (mary) row.k = 'mary'
  const weight = s.links * (!mary && regnal(labels) ? REGNAL_WEIGHT : 1)
  for (const slug of slugs) { if (!bySlug.has(slug)) bySlug.set(slug, []); bySlug.get(slug).push({ row, weight }) }
}
const out = {}
for (const slug of [...bySlug.keys()].sort()) out[slug] = bySlug.get(slug).sort((a, b) => b.weight - a.weight || b.row.links - a.row.links || a.row.id.localeCompare(b.row.id)).slice(0, KEEP).map(x => x.row)

// The day of each saint kept. Several days: the best statement wins (preferred rank, then calendar, see above); statements
// that tie go to the one Wikidata lists first, and to the earliest day of the year when the API would not say.
const kept = new Map(Object.values(out).flat().map(r => [r.id, r]))
const best = s => Math.max(...s.statements.map(x => x.score))
const tied = [...kept.keys()].filter(id => { const s = saints.get(id), top = best(s); return new Set(s.statements.filter(x => x.score === top).map(x => x.day)).size > 1 }).sort()
console.log(`${tied.length} saints with feast days that tie: asking the API which statement comes first…`)
const order = tied.length ? await statementOrder(tied) : new Map()
const ambiguous = []
for (const [id, row] of kept) {
  const s = saints.get(id), top = best(s)
  const days = [...new Set(s.statements.map(x => x.day))]
  const candidates = s.statements.filter(x => x.score === top)
  const listed = order.get(id) || []
  const first = candidates.map(x => ({ ...x, at: listed.indexOf(x.key) })).filter(x => x.at >= 0).sort((a, b) => a.at - b.at)[0]
  const tie = new Set(candidates.map(x => x.day)).size > 1
  row.day = tie && first ? first.day : candidates.map(x => x.day).sort()[0]
  if (days.length > 1) {
    row.alt = days.filter(d => d !== row.day).sort()
    const by = !tie ? (top >= 100 ? 'preferred rank' : 'calendar') : first ? 'first statement' : 'earliest day'
    ambiguous.push({ id, en: row.l.en || Object.values(row.l)[0], day: row.day, by, alt: row.alt })
  }
}
save(OUT, out)
save(AMBIGUOUS, ambiguous.sort((a, b) => a.en.localeCompare(b.en)))
const count = by => ambiguous.filter(a => a.by === by).length
console.log(`${persons} saints and ${marian} Marian titles go by one of our names`)
console.log(`${Object.keys(out).length} of ${master.length} names have a name day · ${kept.size} saints kept · ${ambiguous.length} of them with more than one day `
  + `(${count('preferred rank')} settled by rank, ${count('calendar')} by calendar, ${count('first statement')} by statement order, ${count('earliest day')} by earliest day)`)
