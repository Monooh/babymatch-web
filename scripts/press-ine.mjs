#!/usr/bin/env node
// Tables and figures behind the press note docs/prensa/nota-nombres-ine.md, from INE data already on disk.
//   node scripts/press-ine.mjs
// Reads (nothing is downloaded):
//   data/stats/cache/es-nombres_por_edad_media.xlsx  INE: every given name with 20+ residents, per sex: rank, people, mean age
//   data/stats/es.json                               INE detail for the names in our database: people by decade of birth,
//                                                    and the five provinces where each name is most frequent
//   src/data/master.json                             our names: spelling with accents, slug of the page on the site
// Writes docs/prensa/datos/*.csv (UTF-8 with BOM, ";" between fields, decimal comma: opens as is in a Spanish Excel) and
// prints the figures the note quotes, and a few more for context ("CIFRA key = value"), followed by the note's tables in Markdown.
//
// What is computed, and from which file:
//   Mean age rankings   the INE workbook, complete: names with at least MIN_RANKING people, ordered by mean age
//                       (ties: more people first). Decade columns are added where es.json has them.
//   Provinces           es.json only. For each name and sex, the provinces among the five where its rate is highest, with at
//                       least MIN_PROV_PEOPLE people and MIN_PROV_RATE per 1,000 of that sex there. The most characteristic
//                       name of a province is the one with the highest ratio  rate in the province / rate in Spain  (INE's
//                       published rates, three decimals); ties go to the name with more people in the province.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs/prensa/datos')
const SITE = 'https://babymatch.app/es/nombres/'

const MIN_LISTED = 1000       // names in the full CSV and in the counts "of the names with 1,000 people or more"
const MIN_RANKING = 20000     // names in the three mean-age rankings
const MIN_PROV_PEOPLE = 100   // province table: at least this many people with the name in the province…
const MIN_PROV_RATE = 1       // …and at least this many per 1,000 residents of that sex in the province
const ROWS = 10               // rows of each ranking printed for the note

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
function csv(file, head, rows) {
  const cell = v => {
    if (v == null) return ''
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  writeFileSync(join(OUT, file), '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n')
  console.log(`  ${file}: ${rows.length} filas`)
}
const markdown = (title, head, rows) => console.log(`\n${title}\n\n| ${head.join(' | ')} |\n|${head.map((h, i) => (i < 2 ? '---' : '---:')).join('|')}|\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}`)
const figures = []
/** One figure of the note: printed, and kept for cifras-de-la-nota.csv. */
function cifra(key, value, what) {
  figures.push([key, value, what])
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
const ineBy = { f: new Map(ine.f.map(r => [r.ine, r])), m: new Map(ine.m.map(r => [r.ine, r])) }

// ───── Our detail (decades, provinces), joined to the INE rows by INE's own key ─────
const es = JSON.parse(readFileSync(join(ROOT, 'data/stats/es.json'), 'utf8'))
const master = new Map(JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8')).map(e => [e.slug, e]))
if (es.asOf !== asOf) throw new Error(`es.json is dated ${es.asOf} and the INE workbook ${asOf}`)
let unmatched = 0
for (const [slug, v] of Object.entries(es.names)) {
  const e = master.get(slug)
  if (!e) { unmatched++; continue }
  const key = foldEs(e.f.es || e.f._), g = e.g.es || e.g._
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

// ───── Provinces (es.json: the five provinces where each name's rate is highest) ─────
const candidates = []
for (const r of detailed) {
  const d = r.detail
  if (!d.rate || !d.topRate) continue
  for (const [prov, people, rate] of d.topRate) {
    if (people < MIN_PROV_PEOPLE || rate < MIN_PROV_RATE) continue
    candidates.push({ prov, r, people, rate, national: d.rate, ratio: rate / d.rate, held: people / r.n * 100 })
  }
}
const byProv = new Map()
for (const c of candidates.sort((a, b) => b.ratio - a.ratio || b.people - a.people)) {
  if (!byProv.has(c.prov)) byProv.set(c.prov, [])
  byProv.get(c.prov).push(c)
}
const provinces = [...byProv.keys()].sort((a, b) => a.localeCompare(b, 'es'))
const winners = provinces.map(p => byProv.get(p)[0])
const withProvinces = detailed.filter(r => r.detail.topRate && r.detail.rate)

// ───── CSV files ─────
mkdirSync(OUT, { recursive: true })
console.log(`INE, fecha de referencia ${asOf}. Ficheros en docs/prensa/datos/:`)
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
cifra('fecha_referencia', asOf, 'fecha de referencia del fichero del INE')
cifra('nombres_ine_mujer', ine.f.length, 'nombres de mujer con 20 personas o más')
cifra('nombres_ine_hombre', ine.m.length, 'nombres de hombre con 20 personas o más')
cifra('nombres_ine', all.length, 'nombres con 20 personas o más, los dos sexos')
cifra('personas_ine', sum(all), 'personas que suman los nombres del fichero')
cifra('nombres_con_desglose', detailed.length, 'nombres (por sexo) con desglose por décadas y provincias en nuestra base de datos')
cifra('nombres_con_provincias', withProvinces.length, 'de ellos, con desglose provincial publicado')
cifra('pct_personas_con_desglose', coma(share(sum(detailed), sum(all))), '% de las personas del fichero cuyo nombre tiene desglose')
cifra('nombres_babymatch', master.size, 'nombres en la base de datos de BabyMatch')
for (const [n, s] of [['MARIA CARMEN', 'f'], ['BORJA', 'm'], ['ASIER', 'm'], ['YAIZA', 'f'], ['YERAY', 'm'], ['HENAR', 'f'], ['FUENCISLA', 'f'], ['LLANOS', 'f']]) {
  const r = find(n, s)
  cifra(`desglose_${r.name.toLowerCase().replace(/ /g, '_')}`, `${miles(r.n)} personas, desglose: ${r.detail ? 'sí' : 'no'}`, `${r.name}: nombre del INE que la nota cita como ausente de la base de datos`)
}
cifra('nombres_1000', listed.length, `nombres con ${MIN_LISTED} personas o más`)
cifra('nombres_1000_edad_70', count(listed, r => r.age >= 70), 'de ellos, con edad media de 70 años o más')
cifra('nombres_1000_edad_70_mujer', count(listed, r => r.age >= 70 && r.sex === 'f'), 'de ellos, de mujer')
cifra('nombres_1000_edad_menor_10', count(listed, r => r.age < 10), `nombres con ${MIN_LISTED} personas o más y edad media inferior a 10 años`)
cifra('nombres_20000', ranking.length, `nombres con ${MIN_RANKING} personas o más`)
cifra('nombres_20000_mujer', t1.length, 'de ellos, de mujer')
cifra('nombres_20000_hombre', t2.length, 'de ellos, de hombre')
cifra('nombres_20000_con_desglose', count(ranking, r => r.detail), 'de ellos, con desglose por décadas')
cifra('nombres_20000_edad_65_mujer', count(t1, r => r.age >= 65), `nombres de mujer con ${MIN_RANKING} personas o más y edad media de 65 años o más`)
cifra('nombres_20000_edad_65_hombre', count(t2, r => r.age >= 65), `nombres de hombre con ${MIN_RANKING} personas o más y edad media de 65 años o más`)
cifra('nombres_20000_edad_menor_10', count(ranking, r => r.age < 10), `nombres con ${MIN_RANKING} personas o más y edad media inferior a 10 años`)
for (const sex of ['f', 'm']) {
  const top = ine[sex].slice(0, 10)
  cifra(`top10_${SEXO[sex].toLowerCase()}_edad_60`, count(top, r => r.age >= 60), `de los 10 nombres de ${SEXO[sex].toLowerCase()} más frecuentes, cuántos tienen edad media de 60 años o más: ${top.filter(r => r.age >= 60).map(r => `${r.name} ${coma(r.age)}`).join(', ')}`)
  cifra(`top10_${SEXO[sex].toLowerCase()}`, top.map(r => `${r.name} ${coma(r.age)}`).join(', '), `los 10 nombres de ${SEXO[sex].toLowerCase()} más frecuentes y su edad media`)
}
/** Everything the note may say about one name. */
function profile(ineName, sex) {
  const r = find(ineName, sex), k = `${r.name.toLowerCase().replace(/ /g, '_')}_${sex}`
  cifra(`${k}_personas`, r.n, `${r.name}: personas`)
  cifra(`${k}_puesto`, r.rank, `${r.name}: puesto entre los nombres de ${SEXO[sex].toLowerCase()}`)
  cifra(`${k}_edad_media`, coma(r.age), `${r.name}: edad media`)
  if (!r.detail || !r.detail.byDecade) return r
  cifra(`${k}_nacidos_1950_1959`, born(r, '1950'), `${r.name}: nacidos en los años cincuenta`)
  cifra(`${k}_nacidos_2010_2019`, born(r, '2010'), `${r.name}: nacidos de 2010 a 2019`)
  cifra(`${k}_nacidos_2020_2024`, born(r, '2020'), `${r.name}: nacidos desde 2020`)
  cifra(`${k}_nacidos_desde_2010`, since2010(r), `${r.name}: nacidos desde 2010`)
  cifra(`${k}_pct_desde_2010`, coma(share(since2010(r), r.n)), `${r.name}: % nacidos desde 2010`)
  return r
}
const josefa = profile('JOSEFA', 'f'), vega = profile('VEGA', 'f')
cifra('vegas_por_josefa_desde_2020', Math.floor(born(vega, '2020') / born(josefa, '2020')), 'Vegas nacidas desde 2020 por cada Josefa nacida desde 2020 (cociente entero)')
for (const [n, s] of [['FELISA', 'f'], ['VICENTA', 'f'], ['DOLORES', 'f'], ['CONCEPCION', 'f'], ['GREGORIO', 'm'], ['JOSE', 'm'], ['ENZO', 'm'], ['LEO', 'm'], ['ALMA', 'f']]) profile(n, s)

cifra('provincias', provinces.length, 'provincias y ciudades autónomas con nombre característico')
cifra('candidatos_provincia', candidates.length, `pares nombre-provincia con ${MIN_PROV_PEOPLE} personas o más y ${MIN_PROV_RATE} por mil o más`)
const wins = new Map()
for (const c of winners) wins.set(c.r.name, [...(wins.get(c.r.name) || []), c.prov])
for (const [name, where] of wins) if (where.length > 1) cifra(`gana_varias_${name.toLowerCase().replace(/ /g, '_')}`, where.join(', '), `${name} es el más característico en ${where.length} provincias`)
cifra('ganadores_mujer', count(winners, c => c.r.sex === 'f'), 'provincias cuyo nombre más característico es de mujer')
cifra('ganadores_hombre', count(winners, c => c.r.sex === 'm'), 'provincias cuyo nombre más característico es de hombre')
for (const c of [...winners].sort((a, b) => b.ratio - a.ratio).slice(0, 5)) cifra(`mayor_ratio_${c.prov.toLowerCase().replace(/[ /]/g, '_')}`, `${c.r.name}, ${coma(c.ratio)} veces`, 'mayores cocientes entre tasa provincial y tasa nacional')
for (const p of ['Asturias', 'Illes Balears', 'Madrid', 'Valencia/València', 'Barcelona', 'Girona', 'Murcia', 'Ceuta', 'Melilla']) {
  const c = byProv.get(p)[0], k = p.toLowerCase().replace(/[ /]/g, '_')
  cifra(`provincia_${k}`, `${c.r.name}: ${miles(c.people)} de ${miles(c.r.n)} (${coma(c.held)} %), ${coma(c.rate, 3)} por mil frente a ${coma(c.national, 3)}, ${coma(c.ratio)} veces`, `nombre más característico de ${p}`)
}
const close = winners.filter(c => { const second = byProv.get(c.prov)[1]; return second && c.ratio / second.ratio < 1.05 })
cifra('provincias_con_segundo_cerca', close.length, 'provincias donde el segundo nombre queda a menos de un 5 % del primero')
cifra('provincias_con_segundo_a_menos_del_5_pct', close.map(c => `${c.prov} (${c.r.name} ${coma(c.ratio, 2)}, ${byProv.get(c.prov)[1].r.name} ${coma(byProv.get(c.prov)[1].ratio, 2)})`).join('; ') || 'ninguna', 'cuáles son, con el cociente de los dos primeros nombres')
cifra('enlaces_sin_ficha', count([...t1.slice(0, ROWS), ...t2.slice(0, ROWS), ...t3.slice(0, ROWS)], r => !r.slug), 'nombres de las tablas 1 a 3 sin desglose por décadas ni ficha en la web')
if (unmatched) cifra('entradas_sin_casar', unmatched, 'entradas de es.json que no casan con el fichero del INE')
csv('cifras-de-la-nota.csv', ['clave', 'valor', 'descripcion'], figures)

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
