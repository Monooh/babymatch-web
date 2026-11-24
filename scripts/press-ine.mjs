#!/usr/bin/env node
// Tables and figures behind the press note docs/prensa/nota-nombres-ine.md, from INE data already on disk.
//   node scripts/press-ine.mjs
// Reads (nothing is downloaded):
//   data/stats/cache/es-nombres_por_edad_media.xlsx  INE: every given name with 20+ residents, per sex: rank, people, mean age
//   data/stats/es.json                               INE detail for the names in our database: people by decade of birth,
//                                                    and the five provinces where each name is most frequent
//   src/data/master.json                             our names: spelling with accents, slug of the page on the site
//   docs/prensa/nota-nombres-ine.md                  the note itself, only to check it against what is computed here
// Writes public/datos/nombres-ine/*.csv, which the study page /es/datos/nombres-ine offers for download, and
// docs/prensa/datos/cifras-de-la-nota.csv (UTF-8 with BOM, ";" between fields, decimal comma: opens as is in a Spanish Excel) and
// prints the figures the note quotes, and a few more for context ("CIFRA key = value"), followed by the note's tables in Markdown.
//
// What is computed, and from which file:
//   Mean age rankings   the INE workbook, complete: names with at least MIN_RANKING people, ordered by mean age
//                       (ties: more people first). Decade columns are added where es.json has them.
//   Provinces           es.json only. For each name and sex, the provinces among the five where its rate is highest, with at
//                       least MIN_PROV_PEOPLE people and MIN_PROV_RATE per 1,000 of that sex there. The most characteristic
//                       name of a province is the one with the highest ratio  rate in the province / rate in Spain; ties go
//                       to the name with more people in the province. The ratio is computed from head counts, not from the
//                       rates INE prints with three decimals: for a name with 0.016 per 1,000 in Spain the rounding alone
//                       moves the ratio by 3 %, enough to change the winner where two names are level (Murcia). The
//                       populations it needs are deduced from INE's own counts and rates (see "Residents of each sex").
//   Check               Last, the note itself is read: its tables must be the ones printed here, and every number in its
//                       prose must be a number of a CIFRA line or of a table. Exit code 1 if not.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/datos/nombres-ine') // served as babymatch.app/datos/nombres-ine/*.csv
const OUT_NOTE = join(ROOT, 'docs/prensa/datos')
const NOTE = join(ROOT, 'docs/prensa/nota-nombres-ine.md')
const SITE = 'https://babymatch.app/es/nombres/'

const MIN_LISTED = 1000       // names in the full CSV and in the counts "of the names with 1,000 people or more"
const MIN_RANKING = 20000     // names in the three mean-age rankings
const MIN_PROV_PEOPLE = 100   // province table: at least this many people with the name in the province…
const MIN_PROV_RATE = 1       // …and at least this many per 1,000 residents of that sex in the province
const ROWS = 10               // rows of each ranking printed for the note
const CLOSE = 5               // province table: a runner-up within this % of the winner is reported as close
const FEW = 200               // province table: winners with fewer people than this in the province are counted apart
const AGE_OLD = 65            // mean age counted as old in the rankings (60 among the ten most frequent names, 70 in the long list)
const AGE_YOUNG = 10          // mean age counted as young

// ───── xlsx reader, copied from scripts/fetch-stats.mjs (that script runs on import) ─────
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
/** The key INE files a name under: capitals, no accents, Ñ and Ç kept. Same rule as scripts/fetch-stats.mjs. */
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae').replace(/[øØ]/g, 'o')
  .toUpperCase().replace(/[’`´]/g, "'").replace(/[-·.]/g, ' ').replace(/\s+/g, ' ').trim()
const foldEs = s => fold(s.normalize('NFC').replace(/[ñÑ]/g, '\u0001').replace(/[çÇ]/g, '\u0002')).replace(/\u0001/g, 'Ñ').replace(/\u0002/g, 'Ç')

// ───── Formatting ─────
const SEXO = { f: 'Mujer', m: 'Hombre' }
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d
/** 225853 → "225.853", 71.6 → "71,6": the way the note writes numbers. */
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const coma = (x, d = 1) => { const [a, b] = x.toFixed(d).split('.'); return miles(a) + (b ? ',' + b : '') }
function csv(file, head, rows, dir = OUT) {
  const cell = v => {
    if (v == null) return ''
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  writeFileSync(join(dir, file), '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n')
  console.log(`  ${file}: ${rows.length} filas`)
}
const tableLines = []
function markdown(title, head, rows) {
  const lines = [`| ${head.join(' | ')} |`, `|${head.map((h, i) => (i < 2 ? '---' : '---:')).join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)]
  tableLines.push(...lines)
  console.log(`\n${title}\n\n${lines.join('\n')}`)
}
const figures = [], aboutName = new Map()
/** One figure of the note: printed, and kept for cifras-de-la-nota.csv. `about` is the name it describes, when the value does not say it. */
function cifra(key, value, what, about) {
  figures.push([key, value, what])
  if (about) aboutName.set(key, about)
  console.log(`CIFRA ${key} = ${value}   # ${what}`)
}

// ───── INE workbook: every name with 20 or more residents ─────
const ine = { f: [], m: [] }
let asOf = null
for (const sheet of xlsx(readFileSync(join(ROOT, 'data/stats/cache/es-nombres_por_edad_media.xlsx')))) {
  const sex = /mujer/i.test(sheet.name) ? 'f' : /hombre/i.test(sheet.name) ? 'm' : null
  if (!sex) continue
  for (const r of sheet.rows) {
    const date = /a fecha (\d\d)\/(\d\d)\/(\d{4})/.exec(r.A || '')
    if (date) asOf = `${date[3]}-${date[2]}-${date[1]}`
    if (!/^\d+$/.test(r.A || '') || !r.B || !/^\d+$/.test(r.C || '') || !r.D || isNaN(+r.D)) continue
    ine[sex].push({ sex, ine: r.B.trim(), rank: +r.A, n: +r.C, age: round(+r.D) })
  }
}
if (!asOf || ine.f.length < 1000 || ine.m.length < 1000) throw new Error('INE workbook not in the expected layout')
// INE files «María del Carmen» as MARIA CARMEN: the linking words are dropped, as in scripts/fetch-stats.mjs
const keyEs = s => foldEs(s).replace(/ (DE LOS|DE LAS|DE LA|DEL|DE) /g, ' ')
const ineBy = { f: new Map(ine.f.map(r => [r.ine, r])), m: new Map(ine.m.map(r => [r.ine, r])) }

// ───── Our detail (decades, provinces), joined to the INE rows by INE's own key ─────
const es = JSON.parse(readFileSync(join(ROOT, 'data/stats/es.json'), 'utf8'))
const master = new Map(JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8')).map(e => [e.slug, e]))
if (es.asOf !== asOf) throw new Error(`es.json is dated ${es.asOf} and the INE workbook ${asOf}`)
let unmatched = 0
for (const [slug, v] of Object.entries(es.names)) {
  const e = master.get(slug)
  if (!e) { unmatched++; continue }
  const key = keyEs(e.f.es || e.f._), g = e.g.es || e.g._
  for (const [sex, stats] of v.n != null ? [[g, v]] : Object.entries(v)) {
    const row = ineBy[sex] && ineBy[sex].get(key)
    if (!row || row.n !== stats.n) { unmatched++; continue } // never happens with files of the same edition
    if (row.detail && (master.get(row.slug).p || 0) >= (e.p || 0)) continue // two entries of ours with one INE name: the better known keeps the link
    row.detail = stats
    row.slug = slug
  }
}
const all = [...ine.f, ...ine.m]
const detailed = all.filter(r => r.detail)

// ───── Spelling with accents: INE writes MARIA CARMEN, the note writes María Carmen ─────
// Each word is spelt as the single-word name of ours that INE files under it (the most common one, same sex first).
// A compound with a Catalan-only word (Josep, Dolors) keeps its other words plain: "Josep Maria", not "Josep María".
// Words we do not have stay as INE writes them, in lower case, so a name outside our database can lack an accent.
const words = { f: new Map(), m: new Map(), any: new Map() }
for (const r of [...detailed].sort((a, b) => b.n - a.n)) {
  if (r.ine.includes(' ')) continue
  const e = master.get(r.slug), spelt = e.f.es || e.f._
  if (foldEs(spelt) !== r.ine || /\s/.test(spelt)) continue
  const word = { spelt, catalan: e.c.includes('catalan') && !e.c.includes('spanish') }
  if (!words[r.sex].has(r.ine)) words[r.sex].set(r.ine, word)
  if (!words.any.has(r.ine)) words.any.set(r.ine, word)
}
const PARTICLES = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'I'])
function spell(ineName, sex) {
  const parts = ineName.split(' ').map(w => ({ w, known: words[sex].get(w) || words.any.get(w) }))
  const catalan = parts.length > 1 && parts.some(p => p.known && p.known.catalan)
  return parts.map(({ w, known }, i) =>
    i > 0 && PARTICLES.has(w) ? w.toLowerCase() : known && (!catalan || known.catalan) ? known.spelt : w[0] + w.slice(1).toLowerCase()).join(' ')
}
for (const r of all) r.name = spell(r.ine, r.sex)

// ───── Decades ─────
const DECADES = ['<1930', '1930', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020']
const born = (r, ...decades) => (r.detail && r.detail.byDecade ? decades.reduce((t, d) => t + (r.detail.byDecade[d] || 0), 0) : null)
/** Born from 2010 on; unknown (null) when INE withholds one of the two cells, which it does under 5 people. */
const since2010 = r => (r.detail && r.detail.byDecade && r.detail.byDecade['2010'] != null && r.detail.byDecade['2020'] != null ? born(r, '2010', '2020') : null)
const share = (part, whole, d = 1) => (part == null ? null : round(part / whole * 100, d))

// ───── Mean age rankings (complete INE file) ─────
const listed = all.filter(r => r.n >= MIN_LISTED)
const ranking = all.filter(r => r.n >= MIN_RANKING)
const oldest = (a, b) => b.age - a.age || b.n - a.n
const youngest = (a, b) => a.age - b.age || b.n - a.n
const t1 = ranking.filter(r => r.sex === 'f').sort(oldest)
const t2 = ranking.filter(r => r.sex === 'm').sort(oldest)
const t3 = [...ranking].sort(youngest)

// ───── Residents of each sex, in Spain and in each province, deduced from INE's own figures ─────
// INE prints every rate (per 1,000 residents of that sex, three decimals) next to the head count it comes from, so each
// pair bounds the population the rate was computed over: count / (rate ± 0.0005) × 1,000. The bounds of all the names of
// one sex in one place overlap in a narrow band, and its middle is the population used below.
const HALF = 0.0005
const bands = new Map()
function bound(key, people, rate) {
  if (!(rate > HALF)) return
  if (!bands.has(key)) bands.set(key, { lo: 0, hi: Infinity })
  const b = bands.get(key)
  b.lo = Math.max(b.lo, people / (rate + HALF) * 1000)
  b.hi = Math.min(b.hi, people / (rate - HALF) * 1000)
}
for (const r of detailed) {
  bound(r.sex, r.n, r.detail.rate)
  for (const [prov, people, rate] of [...(r.detail.top || []), ...(r.detail.topRate || [])]) bound(`${r.sex}|${prov}`, people, rate)
}
let widestBand = 0
for (const [key, b] of bands) {
  if (b.lo > b.hi) throw new Error(`INE's counts and rates do not agree on one population for ${key}`)
  widestBand = Math.max(widestBand, (b.hi - b.lo) / b.lo * 100)
}
if (widestBand > 0.5) throw new Error(`a population is only known to within ${widestBand.toFixed(2)} %: too loose to compute ratios from head counts`)
const population = (sex, prov) => { const b = bands.get(prov ? `${sex}|${prov}` : sex); return (b.lo + b.hi) / 2 }

// ───── Provinces (es.json: the five provinces where each name's rate is highest) ─────
const candidates = []
for (const r of detailed) {
  const d = r.detail
  if (!d.rate || !d.topRate) continue
  for (const [prov, people, rate] of d.topRate) {
    if (people < MIN_PROV_PEOPLE || rate < MIN_PROV_RATE) continue
    candidates.push({ prov, r, people, rate, national: d.rate, held: people / r.n * 100,
      ratio: (people / population(r.sex, prov)) / (r.n / population(r.sex)), // from head counts
      printed: rate / d.rate })                                              // from INE's rounded rates, for comparison only
  }
}
const byProv = new Map()
for (const c of candidates.sort((a, b) => b.ratio - a.ratio || b.people - a.people)) {
  if (!byProv.has(c.prov)) byProv.set(c.prov, [])
  byProv.get(c.prov).push(c)
}
const provinces = [...byProv.keys()].sort((a, b) => a.localeCompare(b, 'es'))
const winners = provinces.map(p => byProv.get(p)[0])
/** The name that would win a province if the ratio were the quotient of the two rates as INE prints them. */
const winnerPrinted = p => [...byProv.get(p)].sort((a, b) => b.printed - a.printed || b.people - a.people)[0]
const withProvinces = detailed.filter(r => r.detail.topRate && r.detail.rate)

// ───── CSV files ─────
mkdirSync(OUT, { recursive: true })
mkdirSync(OUT_NOTE, { recursive: true })
console.log(`INE, fecha de referencia ${asOf}. Ficheros en public/datos/nombres-ine/:`)
const link = r => (r.slug ? SITE + r.slug : '')
const ageHead = ['posicion', 'nombre', 'nombre_ine', 'sexo', 'personas', 'puesto_en_su_sexo', 'edad_media', 'desglose_por_decadas',
  'nacidos_antes_1930', ...DECADES.slice(1, -1).map(d => `nacidos_${d}_${+d + 9}`), 'nacidos_2020_2024', 'nacidos_desde_2010', 'pct_nacidos_desde_2010', 'ficha_babymatch']
const ageRow = (r, i) => [i + 1, r.name, r.ine, SEXO[r.sex], r.n, r.rank, r.age, r.detail && r.detail.byDecade ? 'sí' : 'no',
  ...DECADES.map(d => (r.detail && r.detail.byDecade ? r.detail.byDecade[d] ?? null : null)), since2010(r), share(since2010(r), r.n, 2), link(r)]
csv('tabla-1-nombres-de-mujer-mayor-edad-media.csv', ageHead, t1.map(ageRow))
csv('tabla-2-nombres-de-hombre-mayor-edad-media.csv', ageHead, t2.map(ageRow))
csv('tabla-3-nombres-menor-edad-media.csv', ageHead, t3.map(ageRow))
csv('nombres-con-1000-personas-o-mas.csv', ageHead, [...listed].sort(oldest).map(ageRow))
const provHead = ['provincia', 'nombre', 'nombre_ine', 'sexo', 'personas_en_la_provincia', 'por_mil_en_la_provincia', 'por_mil_en_espana', 'veces_la_tasa_nacional',
  'personas_en_espana', 'pct_de_quienes_lo_llevan_que_viven_en_la_provincia', 'edad_media_en_espana', 'ficha_babymatch']
const provRow = c => [c.prov, c.r.name, c.r.ine, SEXO[c.r.sex], c.people, c.rate, c.national, round(c.ratio), c.r.n, round(c.held), c.r.age, link(c.r)]
csv('tabla-4-nombre-mas-caracteristico-por-provincia.csv', [...provHead, 'segundo_nombre', 'segundo_veces_la_tasa_nacional'],
  winners.map(c => { const second = byProv.get(c.prov)[1]; return [...provRow(c), second ? second.r.name : null, second ? round(second.ratio) : null] }))
csv('provincias-todos-los-candidatos.csv', ['puesto_en_la_provincia', ...provHead],
  provinces.flatMap(p => byProv.get(p).map((c, i) => [i + 1, ...provRow(c)])))

// ───── Figures quoted in the note ─────
console.log('')
const count = (rows, test) => rows.filter(test).length
const find = (ineName, sex) => { const r = ineBy[sex].get(ineName); if (!r) throw new Error(`no ${ineName}`); return r }
const sum = rows => rows.reduce((t, r) => t + r.n, 0)
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
cifra('fecha_referencia', asOf, 'fecha de referencia del fichero del INE')
cifra('fecha_referencia_texto', `${+asOf.slice(8)} de ${MESES[+asOf.slice(5, 7) - 1]} de ${asOf.slice(0, 4)}`, 'la misma fecha, como la escribe la nota')
cifra('periodos_de_nacimiento', DECADES.map((d, i) => (i === 0 ? `antes de ${d.slice(1)}` : `${d}-${i === DECADES.length - 1 ? +asOf.slice(0, 4) - 1 : +d + 9}`)).join(', '), 'décadas de nacimiento del desglose')
cifra('minimo_personas_ine', Math.min(...all.map(r => r.n)), 'personas que lleva el nombre menos frecuente del fichero')
cifra('minimo_celda_ine', Math.min(...detailed.flatMap(r => [...Object.values(r.detail.byDecade || {}), ...(r.detail.topRate || []).map(t => t[1])])), 'la celda más pequeña que publica el INE por década o por provincia')
cifra('decimales_tasas_ine', Math.max(...detailed.map(r => (String(r.detail.rate || 0).split('.')[1] || '').length)), 'decimales con que el INE publica las tasas por mil')
cifra('provincias_por_nombre', Math.max(...detailed.map(r => (r.detail.topRate || []).length)), 'provincias con mayor tasa que se conservan de cada nombre')
cifra('umbral_ranking', miles(MIN_RANKING), 'personas mínimas para entrar en las tablas 1 a 3')
cifra('umbral_listado', miles(MIN_LISTED), 'personas mínimas para entrar en el CSV completo')
cifra('umbral_provincia_personas', MIN_PROV_PEOPLE, 'tabla 4: personas mínimas con el nombre en la provincia')
cifra('umbral_provincia_por_mil', MIN_PROV_RATE, 'tabla 4: tasa mínima por mil en la provincia')
cifra('umbral_segundo_cerca', CLOSE, 'tabla 4: % por debajo del cual el segundo nombre se considera cerca del primero')
cifra('umbral_pocas_personas', FEW, 'tabla 4: se cuentan aparte los ganadores con menos personas que estas en la provincia')
cifra('umbrales_edad', [AGE_YOUNG, AGE_OLD - 5, AGE_OLD, AGE_OLD + 5].join(', '), 'edades medias que la nota usa como referencia')
cifra('filas_por_tabla', ROWS, 'filas de las tablas 1 a 3, y nombres más frecuentes de cada sexo que se comparan')
cifra('nombres_ine_mujer', ine.f.length, 'nombres de mujer con 20 personas o más')
cifra('nombres_ine_hombre', ine.m.length, 'nombres de hombre con 20 personas o más')
cifra('nombres_ine', all.length, 'nombres con 20 personas o más, los dos sexos')
cifra('personas_ine', sum(all), 'personas que suman los nombres del fichero')
cifra('nombres_con_desglose', detailed.length, 'nombres (por sexo) con desglose por décadas y provincias en nuestra base de datos')
cifra('nombres_con_provincias', withProvinces.length, 'de ellos, con desglose provincial publicado')
cifra('pct_personas_con_desglose', coma(share(sum(detailed), sum(all))), '% de las personas del fichero cuyo nombre tiene desglose')
cifra('nombres_babymatch', master.size, 'nombres en la base de datos de BabyMatch')
// Names a reader may look for in the province table. The note may only call "missing" the ones that print "desglose: no".
for (const [n, s] of [['MARIA CARMEN', 'f'], ['BORJA', 'm'], ['ASIER', 'm'], ['YAIZA', 'f'], ['YERAY', 'm'], ['HENAR', 'f'], ['FUENCISLA', 'f'], ['LLANOS', 'f'],
  ['CASILDA', 'f'], ['INDALECIO', 'm'], ['IDAIRA', 'f'], ['JONAY', 'm'], ['MARIA PINO', 'f'], ['PINO', 'f'], ['MARIA DESAMPARADOS', 'f'], ['DESAMPARADOS', 'f']]) {
  const r = find(n, s)
  cifra(`desglose_${r.name.toLowerCase().replace(/ /g, '_')}`, `${miles(r.n)} personas, desglose: ${r.detail ? 'sí' : 'no'}`, `${r.name}: ¿tiene desglose por décadas y provincias en la base de datos?`, r.name)
}
const compounds = listed.filter(r => r.ine.includes(' '))
cifra('compuestos_1000', compounds.length, `nombres compuestos con ${MIN_LISTED} personas o más`)
cifra('compuestos_1000_con_desglose', count(compounds, r => r.detail), 'de ellos, con desglose en la base de datos')
cifra('compuestos_1000_sin_desglose', count(compounds, r => !r.detail), 'de ellos, sin desglose')
cifra('simples_1000', listed.length - compounds.length, `nombres simples con ${MIN_LISTED} personas o más`)
cifra('simples_1000_sin_desglose', count(listed, r => !r.detail && !r.ine.includes(' ')), 'de ellos, sin desglose')
cifra('nombres_1000', listed.length, `nombres con ${MIN_LISTED} personas o más`)
cifra('nombres_1000_edad_70', count(listed, r => r.age >= AGE_OLD + 5), `de ellos, con edad media de ${AGE_OLD + 5} años o más`)
cifra('nombres_1000_edad_70_mujer', count(listed, r => r.age >= AGE_OLD + 5 && r.sex === 'f'), 'de ellos, de mujer')
cifra('nombres_1000_edad_menor_10', count(listed, r => r.age < AGE_YOUNG), `nombres con ${MIN_LISTED} personas o más y edad media inferior a ${AGE_YOUNG} años`)
cifra('nombres_20000', ranking.length, `nombres con ${MIN_RANKING} personas o más`)
cifra('nombres_20000_mujer', t1.length, 'de ellos, de mujer')
cifra('nombres_20000_hombre', t2.length, 'de ellos, de hombre')
cifra('nombres_20000_con_desglose', count(ranking, r => r.detail), 'de ellos, con desglose por décadas')
cifra('nombres_20000_edad_65_mujer', count(t1, r => r.age >= AGE_OLD), `nombres de mujer con ${MIN_RANKING} personas o más y edad media de ${AGE_OLD} años o más`)
cifra('nombres_20000_edad_65_hombre', count(t2, r => r.age >= AGE_OLD), `nombres de hombre con ${MIN_RANKING} personas o más y edad media de ${AGE_OLD} años o más`)
cifra('nombres_20000_edad_menor_10', count(ranking, r => r.age < AGE_YOUNG), `nombres con ${MIN_RANKING} personas o más y edad media inferior a ${AGE_YOUNG} años`)
cifra('mas_edad_primeros_de_mujer', count([...ranking].sort(oldest).slice(0, ROWS), r => r.sex === 'f'), `de los ${ROWS} nombres de más edad media con ${MIN_RANKING} personas o más, sin separar sexos, cuántos son de mujer`)
for (const sex of ['f', 'm']) {
  const top = ine[sex].slice(0, 10)
  cifra(`top10_${SEXO[sex].toLowerCase()}_edad_60`, count(top, r => r.age >= AGE_OLD - 5), `de los 10 nombres de ${SEXO[sex].toLowerCase()} más frecuentes, cuántos tienen edad media de ${AGE_OLD - 5} años o más: ${top.filter(r => r.age >= AGE_OLD - 5).map(r => `${r.name} ${coma(r.age)}`).join(', ')}`)
  cifra(`top10_${SEXO[sex].toLowerCase()}`, top.map(r => `${r.name} ${coma(r.age)}`).join(', '), `los 10 nombres de ${SEXO[sex].toLowerCase()} más frecuentes y su edad media`)
}
/** Everything the note may say about one name. */
function profile(ineName, sex) {
  const r = find(ineName, sex), k = `${r.name.toLowerCase().replace(/ /g, '_')}_${sex}`
  cifra(`${k}_personas`, r.n, `${r.name}: personas`, r.name)
  cifra(`${k}_puesto`, r.rank, `${r.name}: puesto entre los nombres de ${SEXO[sex].toLowerCase()}`, r.name)
  cifra(`${k}_edad_media`, coma(r.age), `${r.name}: edad media`, r.name)
  if (!r.detail || !r.detail.byDecade) return r
  cifra(`${k}_nacidos_1950_1959`, born(r, '1950'), `${r.name}: nacidos en los años cincuenta`, r.name)
  cifra(`${k}_nacidos_2010_2019`, born(r, '2010'), `${r.name}: nacidos de 2010 a 2019`, r.name)
  cifra(`${k}_nacidos_2020_2024`, born(r, '2020'), `${r.name}: nacidos desde 2020`, r.name)
  cifra(`${k}_nacidos_desde_2010`, since2010(r), `${r.name}: nacidos desde 2010`, r.name)
  cifra(`${k}_pct_desde_2010`, coma(share(since2010(r), r.n)), `${r.name}: % nacidos desde 2010`, r.name)
  return r
}
const josefa = profile('JOSEFA', 'f'), vega = profile('VEGA', 'f')
cifra('vegas_por_josefa_desde_2020', Math.floor(born(vega, '2020') / born(josefa, '2020')), 'Vegas nacidas desde 2020 por cada Josefa nacida desde 2020 (cociente entero)', 'Vega Josefa')
for (const [n, s] of [['FELISA', 'f'], ['VICENTA', 'f'], ['DOLORES', 'f'], ['CONCEPCION', 'f'], ['GREGORIO', 'm'], ['JOSE', 'm'], ['ENZO', 'm'], ['LEO', 'm'], ['ALMA', 'f']]) profile(n, s)

cifra('provincias', provinces.length, 'provincias y ciudades autónomas con nombre característico')
cifra('candidatos_provincia', candidates.length, `pares nombre-provincia con ${MIN_PROV_PEOPLE} personas o más y ${MIN_PROV_RATE} por mil o más`)
const wins = new Map()
for (const c of winners) wins.set(c.r.name, [...(wins.get(c.r.name) || []), c.prov])
cifra('nombres_en_varias_provincias', count([...wins.values()], where => where.length > 1), 'nombres que son el más característico en más de una provincia')
for (const [name, where] of wins) if (where.length > 1) cifra(`gana_varias_${name.toLowerCase().replace(/ /g, '_')}`, where.join(', '), `${name} es el más característico en ${where.length} provincias`)
cifra('ganadores_mujer', count(winners, c => c.r.sex === 'f'), 'provincias cuyo nombre más característico es de mujer')
cifra('ganadores_hombre', count(winners, c => c.r.sex === 'm'), 'provincias cuyo nombre más característico es de hombre')
const provKey = p => p.toLowerCase().replace(/[ /]/g, '_')
for (const c of [...winners].sort((a, b) => b.ratio - a.ratio).slice(0, 5)) cifra(`mayor_ratio_${provKey(c.prov)}`, `${c.r.name}, ${coma(c.ratio)} veces`, 'mayores cocientes entre tasa provincial y tasa nacional')
;[...winners].sort((a, b) => b.held - a.held).slice(0, 12).forEach((c, i) => cifra(`mayor_concentracion_${i + 1}`, `${c.r.name} (${c.prov}): ${miles(c.people)} de ${miles(c.r.n)}, ${coma(c.held)} %`, 'ganadores con mayor % de quienes llevan el nombre en España viviendo en la provincia'))
cifra('ganadores_mitad_o_mas_en_la_provincia', count(winners, c => c.held >= 50), 'provincias cuyo nombre más característico tiene allí a la mitad o más de quienes lo llevan en España')
for (const p of provinces) {
  const [c, second, third] = byProv.get(p)
  const also = x => (x ? `${x.r.name} ${coma(x.ratio, 2)} (${miles(x.people)} de ${miles(x.r.n)}, ${coma(x.held)} %)` : 'nadie')
  cifra(`provincia_${provKey(p)}`, `${c.r.name}: ${miles(c.people)} de ${miles(c.r.n)} (${coma(c.held)} %), ${coma(c.rate, 3)} por mil frente a ${coma(c.national, 3)}, ${coma(c.ratio)} veces (${coma(c.ratio, 2)})`, `nombre más característico de ${p}`)
  cifra(`provincia_${provKey(p)}_siguientes`, `${also(second)}; ${also(third)}`, `segundo y tercer nombre de ${p}, con su cociente`)
}
const close = winners.filter(c => { const second = byProv.get(c.prov)[1]; return second && c.ratio / second.ratio < 1 + CLOSE / 100 })
cifra('provincias_con_segundo_cerca', close.length, `provincias donde el segundo nombre queda a menos de un ${CLOSE} % del primero`)
cifra('provincias_con_segundo_cerca_cuales', close.map(c => `${c.prov} (${c.r.name} ${coma(c.ratio, 2)}, ${byProv.get(c.prov)[1].r.name} ${coma(byProv.get(c.prov)[1].ratio, 2)})`).join('; ') || 'ninguna', 'cuáles son, con el cociente de los dos primeros nombres')
// What the rounding of INE's rates would change: the winner by the quotient of the two printed rates, where it differs.
const moved = provinces.filter(p => winnerPrinted(p) !== byProv.get(p)[0])
cifra('provincias_que_cambian_con_tasas_redondeadas', moved.length, 'provincias donde ganaría otro nombre si el cociente se calculara con las tasas de tres decimales del INE')
cifra('provincias_que_cambian_con_tasas_redondeadas_cuales', moved.map(p => { const a = winnerPrinted(p), b = byProv.get(p)[0]; return `${p} (con tasas redondeadas ${a.r.name} ${coma(a.printed, 2)} y ${b.r.name} ${coma(b.printed, 2)}; con personas ${b.r.name} ${coma(b.ratio, 2)} y ${a.r.name} ${coma(a.ratio, 2)})` }).join('; ') || 'ninguna', 'cuáles son')
const drift = [...winners].sort((a, b) => Math.abs(b.printed / b.ratio - 1) - Math.abs(a.printed / a.ratio - 1))[0]
cifra('mayor_efecto_del_redondeo', `${drift.r.name} (${drift.prov}): ${coma(drift.printed)} con tasas redondeadas, ${coma(drift.ratio)} con personas, ${coma(Math.abs(drift.printed / drift.ratio - 1) * 100)} % de diferencia`, 'ganador cuyo cociente más cambia al dejar de usar las tasas redondeadas')
cifra('margen_poblacion_deducida_pct', coma(widestBand, 3), 'anchura máxima, en %, del intervalo en que queda la población de un sexo en una provincia al deducirla de recuentos y tasas')
const few = winners.filter(c => c.people < FEW).sort((a, b) => a.people - b.people)
cifra('ganadores_con_pocas_personas', few.length, `provincias cuyo nombre más característico lo llevan allí menos de ${FEW} personas`)
cifra('ganadores_con_pocas_personas_cuales', few.map(c => `${c.r.name} (${c.prov}) ${c.people}`).join(', ') || 'ninguno', 'cuáles son, de menos a más personas')
cifra('ganadores_nombre_compuesto', winners.filter(c => c.r.ine.includes(' ')).map(c => `${c.r.name} (${c.prov})`).join(', ') || 'ninguno', 'ganadores que son nombres compuestos')
cifra('enlaces_sin_ficha', count([...t1.slice(0, ROWS), ...t2.slice(0, ROWS), ...t3.slice(0, ROWS)], r => !r.slug), 'nombres de las tablas 1 a 3 sin desglose por décadas ni ficha en la web')
if (unmatched) cifra('entradas_sin_casar', unmatched, 'entradas de es.json que no casan con el fichero del INE')
csv('cifras-de-la-nota.csv', ['clave', 'valor', 'descripcion'], figures, OUT_NOTE)

// ───── The note's tables, in Markdown (a name with a page on the site links to it) ─────
const dash = v => (v == null ? 's. d.' : miles(v))
const linked = r => (r.slug ? `[${r.name}](${SITE}${r.slug})` : r.name)
const withSex = r => `${linked(r)} (${SEXO[r.sex].toLowerCase()})`
markdown(`Tabla 1. Nombres de mujer con la edad media más alta (${miles(MIN_RANKING)} personas o más)`,
  ['Puesto', 'Nombre', 'Mujeres', 'Edad media', 'Nacidas en 1950-1959', 'Nacidas desde 2010'],
  t1.slice(0, ROWS).map((r, i) => [i + 1, linked(r), miles(r.n), coma(r.age), dash(born(r, '1950')), dash(since2010(r))]))
markdown(`Tabla 2. Nombres de hombre con la edad media más alta (${miles(MIN_RANKING)} personas o más)`,
  ['Puesto', 'Nombre', 'Hombres', 'Edad media', 'Nacidos en 1950-1959', 'Nacidos desde 2010'],
  t2.slice(0, ROWS).map((r, i) => [i + 1, linked(r), miles(r.n), coma(r.age), dash(born(r, '1950')), dash(since2010(r))]))
markdown(`Tabla 3. Nombres con la edad media más baja (${miles(MIN_RANKING)} personas o más)`,
  ['Puesto', 'Nombre', 'Personas', 'Edad media', 'Nacidos desde 2010', '% nacidos desde 2010'],
  t3.slice(0, ROWS).map((r, i) => [i + 1, withSex(r), miles(r.n), coma(r.age), dash(since2010(r)), since2010(r) == null ? 's. d.' : coma(share(since2010(r), r.n))]))
markdown('Tabla 4. El nombre más característico de cada provincia',
  ['Provincia', 'Nombre', 'Personas en la provincia', 'Por mil en la provincia', 'Por mil en España', 'Veces la tasa nacional', '% del total de España'],
  winners.map(c => [c.prov, withSex(c.r), miles(c.people), coma(c.rate, 3), coma(c.national, 3), coma(c.ratio), coma(c.held)]))

// ───── Check of the note: its tables are the ones above, and every number in its prose is one of the figures above ─────
// "Prose" is every line of the note that is not a table row, without link targets, file names and commands. A number is a
// run of digits as the note writes them (225.853, 71,6) or a number word (dos, diez, decimotercer); "un", "una" and "uno"
// are not read as numbers. Each number is checked in its sentence:
//   · a sentence that names people's names (Josefa, Enol…) may use the numbers of the CIFRA lines and table rows that
//     mention one of those names, plus the general ones (CIFRA lines and table headers that mention no name);
//   · a sentence that names none inherits the names of the sentence before it; a heading or a list item starts afresh;
//   · a sentence that names a province and people's names must name the winner of that province.
// So a figure cannot sit next to the wrong name, nor a general count borrow a number that only exists in some name's row.
// What it cannot tell is which of two names in one sentence a number belongs to: that is read by eye.
if (existsSync(NOTE)) {
  const WORDS = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20,
    tercer: 3, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6, decimo: 10, decima: 10, decimotercer: 13, decimotercero: 13,
    'anos cincuenta': 1950 }
  const NOT_FIGURES = [/\btablas? \d+(?: (?:a|y) \d+)?/gi, /\bCC BY \d\.\d/g, /\bUTF-8\b/g] // table numbers, the licence's version, the encoding
  const untarget = s => s.replace(/\]\([^)]*\)/g, ']')
  const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const wordRe = new RegExp(`(?<![\\p{L}\\d])(${Object.keys(WORDS).join('|')})(?![\\p{L}\\d])`, 'giu')
  const numbers = text => [
    ...(text.match(/\d+(?:\.\d{3})*(?:,\d+)?/g) || []).map(t => ({ text: t, value: +t.replace(/\./g, '').replace(',', '.') })),
    ...[...plain(text).matchAll(wordRe)].map(m => ({ text: m[1], value: WORDS[m[1]] }))]
  /** The given names a text mentions: its capitalised words, alone or in a row, that INE lists as a name ("Josefas" counts
   *  as Josefa). Words of a place (España, León, Valencia) are not read as names: the note never cites one as a name. */
  const ineNames = new Set(all.map(r => plain(r.name)))
  const places = new Set(['espana', ...provinces.flatMap(p => plain(p).split(/[ /]/))])
  function namesIn(text) {
    const out = new Set()
    for (const run of text.match(/\p{Lu}\p{L}*(?: \p{Lu}\p{L}*)*/gu) || []) {
      const w = run.split(' ')
      for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) {
        if (w.slice(i, j).every(x => places.has(plain(x)))) continue
        const k = plain(w.slice(i, j).join(' '))
        if (ineNames.has(k)) out.add(k)
        else if (k.endsWith('s') && ineNames.has(k.slice(0, -1))) out.add(k.slice(0, -1))
      }
    }
    return out
  }

  // What the script printed: general numbers, and the numbers that go with each name.
  const general = new Set(), ofName = new Map()
  function printed(text, about) {
    const names = namesIn(about || text), values = numbers(text).map(n => n.value)
    if (!names.size) for (const v of values) general.add(v)
    for (const n of names) { if (!ofName.has(n)) ofName.set(n, new Set()); for (const v of values) ofName.get(n).add(v) }
  }
  for (const [key, value] of figures) printed(String(value), aboutName.has(key) ? `${aboutName.get(key)} ${value}` : null)
  for (const l of tableLines) printed(untarget(l))

  const lines = readFileSync(NOTE, 'utf8').split(/\r?\n/)
  const noteTables = lines.filter(l => l.startsWith('|'))
  const proseLines = lines.filter(l => !l.startsWith('|')).map(untarget)
  const text = proseLines.join('\n')
  const found = [], foreign = [], misplaced = []
  const winnerOf = new Map(winners.map(c => [c.prov, c.r.name]))
  const mentions = (sentence, prov) => prov.split('/').some(v => new RegExp(`(?<!\\p{L})${v}(?!\\p{L})`, 'u').test(sentence))
  let context = new Set()
  for (const line of proseLines) {
    if (/^(#{2,}|[-*] )/.test(line)) context = new Set()
    let clean = line.replace(/https?:\/\/\S+/g, ' ').replace(/`[^`]*`/g, ' ')
    for (const re of NOT_FIGURES) clean = clean.replace(re, ' ')
    for (const sentence of clean.split(/(?<=\.)\s+(?=[\p{Lu}«*])/u)) {
      const names = new Set([...namesIn(sentence)].filter(n => ofName.has(n))) // only names this script printed something about
      if (names.size) context = names
      if (names.size) for (const p of provinces) if (mentions(sentence, p) && !names.has(plain(winnerOf.get(p)))) misplaced.push({ p, sentence: sentence.trim() })
      for (const n of numbers(sentence)) {
        found.push(n)
        if (!general.has(n.value) && ![...context].some(name => ofName.has(name) && ofName.get(name).has(n.value))) foreign.push({ ...n, sentence: sentence.trim() })
      }
    }
  }
  const distinct = [...new Set(found.map(n => n.text))]

  const problems = []
  if (noteTables.join('\n') !== tableLines.join('\n')) {
    const mine = new Set(tableLines), theirs = new Set(noteTables)
    problems.push(`las tablas de la nota no son las de este script: ${noteTables.filter(l => !mine.has(l)).length} filas de la nota no salen aquí y ${tableLines.filter(l => !theirs.has(l)).length} de aquí no están en la nota (o están en otro orden)`)
  }
  for (const n of foreign) problems.push(`«${n.text}» no sale de este script para los nombres de su frase: ${n.sentence.length > 110 ? n.sentence.slice(0, 110) + '…' : n.sentence}`)
  for (const m of misplaced) problems.push(`la frase habla de ${m.p} y de nombres, pero no cita su nombre más característico (${winnerOf.get(m.p)}): ${m.sentence.length > 110 ? m.sentence.slice(0, 110) + '…' : m.sentence}`)
  // Length: the note without its "Tablas" section (rows, titles and footnotes). A word is anything with a letter or a digit.
  const words = ls => ls.join('\n').split(/\s+/).filter(w => /[\p{L}\d]/u.test(w)).length
  const from = proseLines.findIndex(l => /^## Tablas/.test(l)), to = proseLines.findIndex((l, i) => i > from && /^## /.test(l))
  const wordCount = words(from < 0 ? proseLines : [...proseLines.slice(0, from), ...proseLines.slice(to)]), withTitles = words(proseLines)
  if (wordCount < 600 || wordCount > 900) problems.push(`el texto sin tablas tiene ${wordCount} palabras; debe tener entre 600 y 900`)
  if (/[—–]/.test(text)) problems.push('el texto usa rayas')
  if (/[¿?]/.test(text.replace(/https?:\/\/\S+/g, ' '))) problems.push('el texto contiene una pregunta')

  console.log('\nCOMPROBACIÓN de docs/prensa/nota-nombres-ine.md')
  console.log(`  tablas: ${noteTables.length} filas en la nota, ${tableLines.length} en este script`)
  console.log(`  números del texto: ${found.length} (${distinct.length} distintos), ${foreign.length} sin respaldo`)
  console.log(`  comprobados: ${distinct.join(' · ')}`)
  console.log(`  palabras sin la sección de tablas: ${wordCount} (con los títulos y notas de las tablas: ${withTitles})`)
  for (const p of problems) console.log(`  FALLO: ${p}`)
  console.log(problems.length ? `  RESULTADO: ${problems.length} fallo${problems.length > 1 ? 's' : ''}` : '  RESULTADO: correcto')
  if (problems.length) process.exitCode = 1
}
