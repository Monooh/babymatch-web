#!/usr/bin/env node
// Official population statistics per given name, one file per country: data/stats/<lang>.json.
// Real published figures only: nothing here is estimated, and a figure a source does not publish is left out.
//   node scripts/fetch-stats.mjs            every country below
//   node scripts/fetch-stats.mjs es         Spain only (also: en, fr, it)
//   node scripts/fetch-stats.mjs es 500     Spain, at most 500 per-name lookups this run (best-known names first)
//   node scripts/fetch-stats.mjs --refresh  download the bulk files again instead of using data/stats/cache/
// Resumable: bulk downloads and per-name lookups are kept in data/stats/cache/, so a dropped connection costs nothing.
//
// Output, data/stats/<lang>.json:
//   { source, url, asOf, license, measure, notes, names: { <slug>: STATS } }
//   STATS for a girl's or a boy's name (the sex our database gives the name in that language);
//   for a unisex name it is { f: STATS, m: STATS } with whichever sexes the source has.
//
//   es  INE (Spain), people resident in Spain on the reference date:
//       n         people with exactly this name (compound names such as "María Carmen" are separate names)
//       age       their mean age
//       rank      place among the names of that sex
//       rate      bearers per 1,000 residents of that sex
//       byDecade  bearers by decade of birth, { "<1930": 494, "1930": 3120, … "2020": 16690 }; "2020" is 2020 up to the
//                 reference date; INE withholds small cells, so the decades can add up to slightly less than n
//       top       up to 5 provinces of residence with most bearers:   [province, bearers, per 1,000 of that sex there]
//       topRate   up to 5 provinces where the name is most frequent:  same triples, ordered by the rate
//   fr  INSEE (France), babies born in France given the name as first forename, 1900 onwards (civil register).
//       INSEE rounds every yearly count to the nearest 5, so every figure here is a sum of rounded counts:
//       n         births since 1900
//       byDecade  births per decade of birth, { "1900": 120, … "2020": 6105 }; "2020" runs to the last year published
//       peak      [year, births] of the best year · first: the earliest year with births
//       last      [year, births, rank among that sex] in the last year published (absent if none that year)
//       top       up to 5 regions of birth with most births since 1900: [region, births] (INSEE publishes no rate)
//       as        the INSEE spelling used, only when ours matched without its accents ("Helene" → "HÉLÈNE")
//   it  ISTAT (Italy), babies registered with the name, 1999 onwards. ISTAT shows counts under 5 as "<5": those years are left out,
//       and names ISTAT writes with an apostrophe (final accent: Nicolò, Giosuè) cannot be looked up, so they are absent:
//       n         births in the years kept · byYear { "1999": 1335, … } · peak [year, births]
//       last      [year, births, % of that sex's births] in the last year published (absent if under 5 that year)
//   en  SSA (USA), babies given the name, 1880 onwards (Social Security card applications); SSA withholds counts under 5:
//       n · byDecade · peak · first as for fr · last [year, births, rank among that sex]
//       www.ssa.gov refuses scripted downloads (HTTP 403): save https://www.ssa.gov/oact/babynames/names.zip from a
//       browser as data/stats/cache/en-names.zip and run again.
// JSON puts all-digit keys first, so in byDecade "<1930" comes last: sort the keys, do not rely on their order.
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data/stats')
const CACHE = join(OUT, 'cache')
const UA = 'name-data-fetch/1.0'
const args = process.argv.slice(2)
const REFRESH = args.includes('--refresh')
const LIMIT = parseInt(args.find(a => /^\d+$/.test(a)) || '0', 10) || Infinity

const sleep = ms => new Promise(r => setTimeout(r, ms))
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d
function save(path, data) {
  writeFileSync(path + '.tmp', typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data))
  renameSync(path + '.tmp', path)
}

/** One request with retries: the connection here drops, and the sources throttle now and then. */
async function http(url, { method = 'GET', body, type, as = 'text', tries = 5 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const headers = { 'User-Agent': UA, Accept: '*/*' }
      if (type) headers['Content-Type'] = type
      const res = await fetch(url, { method, body, headers, signal: AbortSignal.timeout(as === 'buffer' ? 600000 : 60000) })
      if (res.status === 429 || res.status === 503) { await sleep((parseInt(res.headers.get('retry-after') || '20', 10) + 2) * 1000); throw new Error('HTTP ' + res.status) }
      if (!res.ok) { const e = new Error('HTTP ' + res.status); e.fatal = res.status === 404 || res.status === 403; throw e }
      return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : await res.text()
    } catch (e) {
      if (e.fatal || attempt >= tries) throw e
      await sleep(3000 * 2 ** (attempt - 1))
    }
  }
}

/** A bulk file, downloaded once and kept in data/stats/cache/. */
async function bulk(url, file) {
  mkdirSync(CACHE, { recursive: true })
  const path = join(CACHE, file)
  if (!REFRESH && existsSync(path)) return readFileSync(path)
  console.log(`downloading ${url}`)
  const buf = await http(url, { as: 'buffer' })
  save(path, buf)
  return buf
}

/** The files inside a zip (xlsx included): name → () => Buffer. Enough of the format for these archives, no dependency. */
function unzip(buf) {
  let end = buf.length - 22
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--
  if (end < 0) throw new Error('not a zip file')
  const files = new Map()
  let p = buf.readUInt32LE(end + 16)
  for (let k = buf.readUInt16LE(end + 10); k > 0; k--) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip directory')
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), local = buf.readUInt32LE(p + 42)
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    files.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
      const raw = buf.subarray(start, start + size)
      return method === 0 ? raw : inflateRawSync(raw)
    })
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&')
const unhtml = s => unxml(s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()

/** Every sheet of an .xlsx as rows of { A: 'text', B: 'text' … }, in workbook order. */
function xlsx(buf) {
  const files = unzip(buf)
  const text = name => files.get(name)().toString('utf8')
  const shared = files.has('xl/sharedStrings.xml')
    ? [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => unxml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')))
    : []
  const rels = Object.fromEntries([...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => [/Id="([^"]+)"/.exec(m[0])[1], /Target="([^"]+)"/.exec(m[0])[1]]))
  return [...text('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map(m => {
    const target = rels[/r:id="([^"]+)"/.exec(m[0])[1]].replace(/^\/?(xl\/)?/, 'xl/')
    const rows = []
    for (const r of text(target).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = {}
      for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] || ''), t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] || '')
        if (v) row[c[1]] = /t="s"/.test(c[2]) ? shared[+v[1]] : unxml(v[1])
        else if (t) row[c[1]] = unxml(t[1])
      }
      rows.push(row)
    }
    return { name: unxml(/name="([^"]*)"/.exec(m[0])[1]), rows }
  })
}

// ───── Our names ─────
const master = JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8')).sort((a, b) => b.p - a.p || a.slug.localeCompare(b.slug))
const spelling = (e, l) => e.f[l] || e.f._
const genderOf = (e, l) => e.g[l] || e.g._
/** Accent- and case-insensitive key; hyphens count as spaces ("Jean-Luc" is "JEAN LUC" in the registers). */
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae').replace(/[øØ]/g, 'o')
  .toUpperCase().replace(/[’`´]/g, "'").replace(/[-·.]/g, ' ').replace(/\s+/g, ' ').trim()
/** INE drops accents but keeps Ñ and Ç as letters of their own, so Toni must not match TOÑI. */
const foldEs = s => fold(s.normalize('NFC').replace(/[ñÑ]/g, '\u0001').replace(/[çÇ]/g, '\u0002')).replace(/\u0001/g, 'Ñ').replace(/\u0002/g, 'Ç')

/** names[slug] from a per-sex lookup: a gendered name gets its own sex only, a unisex one whatever exists. */
function assemble(lang, key, lookup) {
  const names = {}
  for (const e of master) {
    const k = key(spelling(e, lang)), g = genderOf(e, lang)
    if (g === 'u') {
      const both = {}
      for (const s of ['f', 'm']) { const v = lookup(k, s); if (v) both[s] = v }
      if (Object.keys(both).length) names[e.slug] = both
    } else {
      const v = lookup(k, g)
      if (v) names[e.slug] = v
    }
  }
  return Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b)))
}
function write(lang, head, names) {
  mkdirSync(OUT, { recursive: true })
  save(join(OUT, `${lang}.json`), { ...head, names })
}
/** Append-only store of per-name lookups, one JSON document per line, so an interrupted run loses nothing. */
function journal(file) {
  mkdirSync(CACHE, { recursive: true })
  const path = join(CACHE, file), done = new Map()
  if (existsSync(path)) for (const line of readFileSync(path, 'utf8').split('\n')) { try { const [k, v] = JSON.parse(line); done.set(k, v) } catch { /* a line cut short by a crash */ } }
  return { done, add(k, v) { done.set(k, v); appendFileSync(path, JSON.stringify([k, v]) + '\n') } }
}

// ───── Spain: INE, names of residents (annual population census at 1 January) ─────
const INE = 'https://www.ine.es'
const INE_PAGE = INE + '/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177009&menu=resultados&idp=1254735572981'
const INE_SEX = { m: '1', f: '6' }
const esNumber = s => parseFloat(s.replace(/\./g, '').replace(',', '.'))
/** "Balears, Illes" → "Illes Balears", "Coruña, A" → "A Coruña": INE lists provinces article-last. */
const province = s => s.replace(/^(.+), (.+)$/, '$2 $1')

/** Bearers by decade of birth, from the backend of INE's own name widget (JSON). */
async function ineDecades(name, sex) {
  const text = await http(`${INE}/tnombres/graficoWidget?nombre=${encodeURIComponent(name)}&sexo=${INE_SEX[sex]}`)
  let data
  try { data = JSON.parse(text) } catch { throw new Error('unexpected answer for decades') }
  if (!Array.isArray(data.values)) return []
  return data.ticks.map((t, i) => [t.trim().startsWith('<') ? '<' + /\d{4}/.exec(t)[0] : /\d{4}/.exec(t)[0], Math.round(data.values[0][i])]).filter(([, n]) => n > 0)
}
/** Bearers and rate per 1,000 in every province of residence, from INE's name query (HTML table). */
async function ineProvinces(name, sex) {
  const body = ['00', ...Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0'))].map(c => 'cmb3=' + c).join('&')
    + `&cmb6=${INE_SEX[sex]}&cmb5=${encodeURIComponent(name)}`
  const html = await http(`${INE}/tnombres/formGeneralresult.do?vista=1`, { method: 'POST', body, type: 'application/x-www-form-urlencoded' })
  const table = /<table id="resultados"[\s\S]*?<\/table>/.exec(html)
  if (!table) {
    if (/No existen habitantes/.test(html)) return { rate: null, rows: [] }
    throw new Error('unexpected answer for provinces')
  }
  const rows = [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map(r => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c => unhtml(c[1])))
    .filter(c => c.length === 3 && /^[\d.]+$/.test(c[1]) && /^[\d.,]+$/.test(c[2])).map(c => [c[0], esNumber(c[1]), esNumber(c[2])])
  const total = rows.find(r => r[0] === 'Total')
  return { rate: total ? total[2] : null, rows: rows.filter(r => r !== total).map(r => [province(r[0]), r[1], r[2]]) }
}

/** At most two requests a second to INE, however many workers are waiting. */
let ineNext = 0
async function ineSlot() {
  const at = Math.max(Date.now(), ineNext)
  ineNext = at + 500
  await sleep(at - Date.now())
}

async function spain() {
  const sheets = xlsx(await bulk(INE + '/daco/daco42/nombyapel/nombres_por_edad_media.xlsx', 'es-nombres_por_edad_media.xlsx'))
  const national = { f: new Map(), m: new Map() }
  let asOf = null
  for (const sheet of sheets) {
    const sex = /mujer/i.test(sheet.name) ? 'f' : /hombre/i.test(sheet.name) ? 'm' : null
    if (!sex) continue
    for (const r of sheet.rows) {
      const date = /a fecha (\d\d)\/(\d\d)\/(\d{4})/.exec(r.A || '')
      if (date) asOf = `${date[3]}-${date[2]}-${date[1]}`
      if (!/^\d+$/.test(r.A || '') || !r.B || !/^\d+$/.test(r.C || '')) continue
      const row = { name: r.B.trim(), rank: +r.A, n: +r.C }
      if (r.D && !isNaN(+r.D)) row.age = round(+r.D)
      national[sex].set(row.name, row)
    }
  }
  if (!asOf || national.f.size < 1000 || national.m.size < 1000) throw new Error('INE workbook not in the expected layout')
  console.log(`es: INE lists ${national.f.size} women's and ${national.m.size} men's names at ${asOf}`)

  // Decades and provinces are per-name lookups; the journal is tied to the reference date so a new edition starts afresh.
  const detail = journal(`es-detail-${asOf}.jsonl`)
  const build = () => assemble('es', foldEs, (k, sex) => {
    const base = national[sex].get(k)
    if (!base) return null
    const out = { n: base.n }
    if (base.age != null) out.age = base.age
    out.rank = base.rank
    const d = detail.done.get(`${k}|${sex}`)
    if (d) {
      if (d.rate != null) out.rate = d.rate
      if (d.decades.length) out.byDecade = Object.fromEntries(d.decades)
      if (d.provinces.length) {
        out.top = [...d.provinces].sort((a, b) => b[1] - a[1]).slice(0, 5)
        out.topRate = [...d.provinces].sort((a, b) => b[2] - a[2] || b[1] - a[1]).slice(0, 5)
      }
    }
    return out
  })
  const head = {
    source: 'INE (Instituto Nacional de Estadística), Apellidos y nombres más frecuentes. Censo anual de población', url: INE_PAGE, asOf,
    license: 'CC BY 4.0. Elaboración propia con datos extraídos del sitio web del INE: www.ine.es',
    measure: 'residents of Spain with the name on the reference date',
    notes: 'INE publishes names borne by at least 20 people (at least 5 in a province). Rates are per 1,000 residents of the same sex. byDecade is by decade of birth; "<1930" is everyone born before 1930 and "2020" runs to the reference date.',
  }
  const flush = () => write('es', head, build())

  const wanted = new Set()
  for (const e of master) {
    const k = foldEs(spelling(e, 'es')), g = genderOf(e, 'es')
    for (const sex of g === 'u' ? ['f', 'm'] : [g]) if (national[sex].has(k)) wanted.add(`${k}|${sex}`)
  }
  for (let pass = 1; pass <= 4; pass++) {
    const todo = [...wanted].filter(k => !detail.done.has(k)).slice(0, LIMIT)
    console.log(`es: ${wanted.size} name/sex pairs of ours in INE, ${wanted.size - [...wanted].filter(k => !detail.done.has(k)).length} already looked up, ${todo.length} to fetch`)
    if (!todo.length) break
    let n = 0, failed = 0
    const total = todo.length
    const worker = async () => {
      for (;;) {
        const key = todo.shift()
        if (!key) return
        const [name, sex] = key.split('|')
        try {
          await ineSlot()
          const decades = await ineDecades(name, sex)
          await ineSlot()
          const { rate, rows } = await ineProvinces(name, sex)
          detail.add(key, { rate, decades, provinces: rows })
        } catch (err) {
          failed++ // not recorded, so the next pass tries again
          console.log(`  ! ${key}: ${err.message}`)
          await sleep(30000) // most failures are the network dropping
        }
        if (++n % 50 === 0) { flush(); console.log(`es: ${n}/${total} · ${failed} failed · last ${key}`) }
      }
    }
    await Promise.all([worker(), worker()])
    flush()
    if (!failed || LIMIT !== Infinity) break
    console.log(`es: ${failed} lookups failed; waiting two minutes before trying them again`)
    await sleep(120000)
  }
  const names = build()
  write('es', head, names)
  const all = Object.values(names).flatMap(v => (v.n != null ? [v] : Object.values(v)))
  console.log(`es: ${Object.keys(names).length} names written · ${all.filter(v => v.byDecade).length} entries with decades · ${all.filter(v => v.top).length} with provinces`)
}

/** Births per year → the figures we keep. `years` is [[year, births, extra?], …] in any order. */
function birthStats(years, lastYear) {
  years = years.filter(y => y[1] > 0).sort((a, b) => a[0] - b[0])
  if (!years.length) return null
  const byDecade = {}
  let n = 0, peak = years[0]
  for (const y of years) {
    n += y[1]
    const d = Math.floor(y[0] / 10) * 10
    byDecade[d] = (byDecade[d] || 0) + y[1]
    if (y[1] > peak[1]) peak = y
  }
  const out = { n, byDecade, peak: [peak[0], peak[1]], first: years[0][0] }
  const last = years[years.length - 1]
  if (last[0] === lastYear) out.last = last
  return out
}
/** Lines of a CSV held in memory, without building an array of two million strings twice. */
function* lines(text) {
  for (let i = 0; i < text.length;) {
    let j = text.indexOf('\n', i)
    if (j < 0) j = text.length
    yield text.charCodeAt(j - 1) === 13 ? text.slice(i, j - 1) : text.slice(i, j)
    i = j + 1
  }
}

// ───── France: INSEE, fichier des prénoms (births since 1900) ─────
const INSEE_PAGE = 'https://www.insee.fr/fr/statistiques/8595130?sommaire=8595113'
const INSEE_REGIONS = {
  '01': 'Guadeloupe', '02': 'Martinique', '03': 'Guyane', '04': 'La Réunion', '06': 'Mayotte', 11: 'Île-de-France', 24: 'Centre-Val de Loire',
  27: 'Bourgogne-Franche-Comté', 28: 'Normandie', 32: 'Hauts-de-France', 44: 'Grand Est', 52: 'Pays de la Loire', 53: 'Bretagne',
  75: 'Nouvelle-Aquitaine', 76: 'Occitanie', 84: 'Auvergne-Rhône-Alpes', 93: "Provence-Alpes-Côte d'Azur", 94: 'Corse',
}
/** INSEE writes names in capitals with their accents: LÉO and LEO are two names. Hyphens count as spaces. */
const exactFr = s => s.normalize('NFC').toUpperCase().replace(/[’`´]/g, "'").replace(/[-\s]+/g, ' ').trim()

async function france() {
  // The page lists the current edition's files (prenoms-<year>-nat_csv.zip); each July a new edition replaces them.
  const page = await http(INSEE_PAGE)
  const link = kind => { const m = new RegExp(`href="(/fr/statistiques/fichier/\\d+/prenoms-(\\d{4})-${kind}_csv\\.zip)"`).exec(page); if (!m) throw new Error(`no ${kind} file on the INSEE page`); return m }
  const nat = link('nat'), reg = link('reg')
  const published = /Paru le\s*:?\s*(?:Paru le\s*)?(\d\d)\/(\d\d)\/(\d{4})/.exec(page.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  const csv = async m => [...unzip(await bulk('https://www.insee.fr' + m[1], 'fr-' + m[1].split('/').pop())).values()][0]().toString('utf8')
  const SEX = { 1: 'm', 2: 'f' }

  // exact spelling → { years: [[year, births, rank]], regions: { code: births } }, per sex
  const exact = { f: new Map(), m: new Map() }
  let lastYear = 0, firstYear = 9999
  for (const line of lines(await csv(nat))) {
    const [sexe, prenom, periode, valeur, rang] = line.split(';')
    const sex = SEX[sexe], year = +periode
    if (!sex || !year || !prenom || prenom.startsWith('_')) continue
    const k = exactFr(prenom)
    if (!exact[sex].has(k)) exact[sex].set(k, { years: [], regions: {} })
    exact[sex].get(k).years.push([year, +valeur, +rang])
    if (year > lastYear) lastYear = year
    if (year < firstYear) firstYear = year
  }
  if (lastYear < 2020 || exact.f.size < 1000) throw new Error('INSEE national file not in the expected layout')
  for (const line of lines(await csv(reg))) {
    const [sexe, prenom, periode, region, valeur] = line.split(';')
    const sex = SEX[sexe]
    if (!sex || !+periode || !prenom) continue
    const rec = exact[sex].get(exactFr(prenom))
    if (rec && INSEE_REGIONS[region]) rec.regions[region] = (rec.regions[region] || 0) + +valeur
  }
  // Accent-less fallback: the most given of the spellings that fold alike.
  const folded = { f: new Map(), m: new Map() }
  for (const sex of ['f', 'm']) for (const [k, rec] of exact[sex]) {
    rec.n = rec.years.reduce((t, y) => t + y[1], 0)
    const f = fold(k), best = folded[sex].get(f)
    if (!best || rec.n > exact[sex].get(best).n) folded[sex].set(f, k)
  }
  const names = assemble('fr', s => s, (spelt, sex) => {
    let k = exactFr(spelt), via = null
    if (!exact[sex].has(k)) { k = folded[sex].get(fold(spelt)); via = k }
    const rec = k && exact[sex].get(k)
    const out = rec && birthStats(rec.years, lastYear)
    if (!out) return null
    const top = Object.entries(rec.regions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, n]) => [INSEE_REGIONS[code], n])
    if (top.length) out.top = top
    if (via) out.as = via
    return out
  })
  write('fr', {
    source: `Insee, Fichier des prénoms (état civil), naissances ${firstYear}–${lastYear}`, url: INSEE_PAGE, asOf: `${lastYear}-12-31`,
    ...(published ? { published: `${published[3]}-${published[2]}-${published[1]}` } : {}),
    license: 'Licence Ouverte / Open Licence 2.0 (Etalab). Source : Insee',
    measure: `births in France with the name as first forename, ${firstYear}–${lastYear}`,
    notes: 'INSEE rounds each yearly count to the nearest 5, so totals are sums of rounded counts. Before 2012 the figures exclude Mayotte. Regions are regions of birth in today\'s boundaries; regional sums can differ from the national total.',
  }, names)
  const all = Object.values(names).flatMap(v => (v.n != null ? [v] : Object.values(v)))
  console.log(`fr: INSEE ${firstYear}–${lastYear} · ${Object.keys(names).length} names written · ${all.filter(v => v.top).length} entries with regions · ${all.filter(v => v.as).length} matched without accents`)
}

// ───── USA: SSA, national baby names (births since 1880) ─────
const SSA_PAGE = 'https://www.ssa.gov/oact/babynames/limits.html'
async function usa() {
  let zip
  try { zip = await bulk('https://www.ssa.gov/oact/babynames/names.zip', 'en-names.zip') } catch (e) {
    throw new Error(`${e.message} from www.ssa.gov, which refuses scripted downloads. Save https://www.ssa.gov/oact/babynames/names.zip from a browser as data/stats/cache/en-names.zip and run again`)
  }
  const data = { f: new Map(), m: new Map() }
  let lastYear = 0, firstYear = 9999
  for (const [file, read] of unzip(zip)) {
    const year = +(/^yob(\d{4})\.txt$/.exec(file) || [])[1]
    if (!year) continue
    if (year > lastYear) lastYear = year
    if (year < firstYear) firstYear = year
    const rank = { f: 0, m: 0 } // each file lists a sex by births, most first: the line's place is SSA's rank
    for (const line of lines(read().toString('utf8'))) {
      const [name, s, count] = line.split(',')
      const sex = s === 'F' ? 'f' : s === 'M' ? 'm' : null
      if (!sex || !name || !+count) continue
      const k = fold(name)
      if (!data[sex].has(k)) data[sex].set(k, [])
      data[sex].get(k).push([year, +count, ++rank[sex]])
    }
  }
  if (lastYear < 2020 || data.f.size < 1000) throw new Error('SSA archive not in the expected layout')
  const names = assemble('en', s => fold(s).replace(/[^A-Z]/g, ''), (k, sex) => birthStats(data[sex].get(k) || [], lastYear)) // SSA writes names as one word, letters only
  write('en', {
    source: 'Social Security Administration, Baby Names from Social Security Card Applications – National Data', url: SSA_PAGE, asOf: `${lastYear}-12-31`,
    license: 'Public domain (work of the U.S. government). Source: Social Security Administration',
    measure: `babies born in the United States given the name, ${firstYear}–${lastYear}`,
    notes: 'From Social Security card applications; SSA leaves out any name with fewer than 5 births in a year, and many people born before 1937 never applied. rank is the place among that sex in that year.',
  }, names)
  console.log(`en: SSA ${firstYear}–${lastYear} · ${Object.keys(names).length} names written`)
}

// ───── Italy: ISTAT, "Conta nomi" (births registered since 1999), one lookup per name ─────
// The counter's web service is the only source and it is slow going: after about twenty requests in a minute and a half
// it holds every answer for some 26 seconds, so this asks one name every six seconds (some 600 names an hour) and the
// names most given in Italy go first. Run it again to carry on where it stopped. Two more limits: the per-name call cannot
// find names ISTAT writes with an apostrophe (Nicolò is NICOLO'), which are left out, and the yearly list breaks beyond
// a few hundred names for most years, so it only serves to decide what to look up first.
const ISTAT_PAGE = 'https://www.istat.it/dati/calcolatori/contanomi/'
const ISTAT_WS = 'https://www.istat.it/wp-content/themes/EGPbs5-child/contanomi/nati/index2022.php'
const ISTAT_MIN = 5 // the counter itself prints "<5" below this
const ISTAT_GAP = 6000 // ms between requests
/** ISTAT writes capitals without accents, and a final accent as an apostrophe: Nicolò is NICOLO', Noè is NOE'. */
const exactIt = s => fold(s.normalize('NFD').replace(/([aeiou])[̀́](?![\p{L}\p{M}])/giu, "$1'"))
async function istat(params) {
  const text = await http(`${ISTAT_WS}?${params}`) // JSONP: callback(…) or callbackY(…), whatever name is asked for
  const m = /^\s*\w+\(([\s\S]*)\);?\s*$/.exec(text)
  if (!m) throw new Error('unexpected answer from ISTAT')
  return m[1].trim() ? JSON.parse(m[1]) : null
}
const istatRows = answer => Object.entries(answer || {}).filter(([k]) => k !== 'years').flatMap(([, v]) => v).filter(r => r && r.year && r.name)

async function italy() {
  mkdirSync(CACHE, { recursive: true })
  const years = (await istat('type=years')).map(Number).sort((a, b) => a - b)
  const firstYear = years[0], lastYear = years[years.length - 1]
  if (!(lastYear >= 2020)) throw new Error('ISTAT years not in the expected layout')
  const detail = journal(`it-detail-${lastYear}.jsonl`) // "NAME|sex" → [[year, births, % of that sex's births]], [] when ISTAT has none
  const build = () => assemble('it', exactIt, (k, sex) => {
    const rec = detail.done.get(`${k}|${sex}`)
    const out = rec && birthStats(rec, lastYear)
    if (!out) return null
    delete out.byDecade // 1999 onwards only: decades would mislead
    delete out.first
    out.byYear = Object.fromEntries(rec.map(y => [y[0], y[1]]))
    return out
  })
  const head = {
    source: 'Istat, rilevazione "Iscritti in anagrafe per nascita" (Conta nomi)', url: ISTAT_PAGE, asOf: `${lastYear}-12-31`,
    license: 'CC BY 4.0. Fonte: Istat',
    measure: `babies registered in Italy with the name, ${firstYear}–${lastYear}`,
    notes: `Years in which a name has fewer than ${ISTAT_MIN} births are left out, as ISTAT's own counter shows them as "<${ISTAT_MIN}"; n adds up the years kept. Names ISTAT writes with an apostrophe (a final accent: Nicolò, Giosuè) cannot be looked up and are absent. ISTAT does not correct spelling or sex errors in the registers. The third value of last is the % of that sex's births that year.`,
  }
  const wanted = new Set()
  for (const e of master) {
    const k = exactIt(spelling(e, 'it')), g = genderOf(e, 'it')
    if (!k.includes("'")) for (const sex of g === 'u' ? ['f', 'm'] : [g]) wanted.add(`${k}|${sex}`)
  }
  // Names seen in the years whose whole list the service manages to return go first, most births first: the others
  // mostly have no births at all.
  const seenFile = join(CACHE, `it-seen-${lastYear}.json`) // { "NAME|sex": most births in a year }
  let seen = !REFRESH && existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : null
  if (!seen) {
    seen = {}
    for (const year of years) {
      await sleep(ISTAT_GAP)
      try { for (const r of istatRows(await istat(`type=list&limit=5000&year=${year}`))) seen[`${r.name}|${r.gender}`] = Math.max(seen[`${r.name}|${r.gender}`] || 0, +r.count) } catch { /* only an ordering hint */ }
    }
    save(seenFile, seen)
  }
  for (let pass = 1; pass <= 4; pass++) {
    const left = [...wanted].filter(k => !detail.done.has(k))
    const todo = [...left.filter(k => seen[k]).sort((a, b) => seen[b] - seen[a]), ...left.filter(k => !seen[k])].slice(0, LIMIT), total = todo.length
    console.log(`it: ${wanted.size} name/sex pairs, ${wanted.size - left.length} already looked up, ${total} to fetch (${left.filter(k => seen[k]).length} of them seen in ISTAT's yearly lists)`)
    if (!total) break
    let n = 0, failed = 0
    for (const key of todo) {
      const [name, sex] = key.split('|')
      try {
        await sleep(ISTAT_GAP)
        const asked = Date.now()
        const answer = await istat(`type=name&name=${encodeURIComponent(name)}&gender=${sex}`)
        if (Date.now() - asked > 15000) await sleep(60000) // held back: the service wants a slower pace
        const rows = istatRows(answer)
          .filter(r => r.gender === sex && r.name.toUpperCase().trim() === name && +r.count >= ISTAT_MIN)
          .map(r => [+r.year, +r.count, round(+r.percent, 4)]).sort((a, b) => a[0] - b[0])
        detail.add(key, rows)
      } catch (err) {
        failed++ // not recorded, so the next pass tries again
        console.log(`  ! ${key}: ${err.message}`)
        await sleep(30000)
      }
      if (++n % 25 === 0) { write('it', head, build()); console.log(`it: ${n}/${total} · ${failed} failed · last ${key}`) }
    }
    if (!failed || LIMIT !== Infinity) break
    console.log(`it: ${failed} lookups failed; waiting two minutes before trying them again`)
    await sleep(120000)
  }
  const names = build()
  write('it', head, names)
  console.log(`it: ISTAT ${firstYear}–${lastYear} · ${[...wanted].filter(k => detail.done.has(k)).length}/${wanted.size} pairs looked up · ${Object.keys(names).length} names written`)
}

const COUNTRIES = { es: spain, en: usa, fr: france, it: italy }
const chosen = args.filter(a => a in COUNTRIES)
for (const l of chosen.length ? chosen : Object.keys(COUNTRIES)) {
  try { await COUNTRIES[l]() } catch (e) { console.log(`${l}: failed — ${e.message}`); process.exitCode = 1 }
}
