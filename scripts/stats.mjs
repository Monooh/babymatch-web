#!/usr/bin/env node
// How the app is being used, straight from the database (no cookies, no consent involved: these are the app's own
// records and its anonymous daily counters).   node scripts/stats.mjs [days=14]
// Needs a logged-in wrangler (`npx wrangler login`). See docs/medicion.md for how to read it.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DAYS = parseInt(process.argv[2] || '14', 10)
function sql(command) {
  const r = spawnSync('npx', ['--yes', 'wrangler@4', 'd1', 'execute', 'babymatch', '--remote', '--json', '--command', command], { cwd: join(ROOT, 'cloudflare/api'), encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1) }
  return JSON.parse(r.stdout.slice(r.stdout.indexOf('[')))[0].results
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) + ' %' : '–')
const line = (label, value, note = '') => console.log(`  ${label.padEnd(44)} ${String(value).padStart(8)}  ${note}`)
const since = Date.now() - DAYS * 86400_000
const day0 = new Date(since).toISOString().slice(0, 10)

// ── 1. The funnel of the last N days, from the anonymous counters ──
const ev = Object.fromEntries(sql(`SELECT name, SUM(n) AS n FROM events WHERE day >= '${day0}' GROUP BY name`).map(r => [r.name, r.n]))
const e = k => ev[k] || 0
console.log(`\nEmbudo de la app, últimos ${DAYS} días (contadores anónimos)`)
line('Aperturas de la app', e('app_open'))
line('  desde una ficha de nombre', e('from_name'), pct(e('from_name'), e('app_open')))
line('  desde una lista', e('from_list'), pct(e('from_list'), e('app_open')))
line('  desde la portada', e('from_home'), pct(e('from_home'), e('app_open')))
line('  desde el enlace de una pareja', e('from_invite'), pct(e('from_invite'), e('app_open')))
line('  directo u otros', e('from_other'), pct(e('from_other'), e('app_open')))
line('Empiezan el cuestionario (nuevos)', e('quiz_start'))
line('Lo terminan', e('quiz_done'), pct(e('quiz_done'), e('quiz_start')) + ' de quienes lo empiezan')
line('Lo saltan', e('quiz_skip'))
line('Primer deslizamiento', e('first_swipe'), pct(e('first_swipe'), e('quiz_start') + e('quiz_skip')) + ' de los nuevos')
line('Llegan a 10 deslizamientos', e('swipes_10'), pct(e('swipes_10'), e('first_swipe')))
line('Llegan a 50 deslizamientos', e('swipes_50'), pct(e('swipes_50'), e('first_swipe')))
line('Primer «me gusta»', e('first_like'))
line('Llegan a 10 «me gusta»', e('likes_10'), pct(e('likes_10'), e('first_like')))
line('Superlikes dados', e('superlike'))
line('Invitaciones creadas', e('invite_created'), pct(e('invite_created'), e('first_like')) + ' de quienes dan un like')
line('Invitaciones compartidas o copiadas', e('invite_shared'))
line('Invitaciones abiertas por la pareja', e('invite_opened'))
line('Parejas que se unen', e('partner_joined'), pct(e('partner_joined'), e('invite_created')) + ' de las invitaciones')
line('Matches anunciados', e('match'))
line('Listas abiertas en la app', e('list_opened'))
line('Usos de filtros', e('filters_used'))
line('Enlaces personales creados', e('backup_link'))
line('Listas recuperadas con enlace', e('restored'))
line('Abren la ronda final', e('final_opened'))
line('Duelos resueltos', e('duel'))
line('Llegan a 10 duelos', e('duels_10'))
line('Escriben sus apellidos en la ronda final', e('surname_set'))
line('Votaciones abiertas', e('poll_created'))
line('Votaciones compartidas o copiadas', e('poll_shared'))
line('Familiares que abren una votación', e('vote_opened'))
line('Familiares que votan', e('vote_cast'), pct(e('vote_cast'), e('vote_opened')) + ' de quienes la abren')
line('Llegan a la app desde una votación', e('from_vote'), pct(e('from_vote'), e('vote_opened')) + ' de quienes la abren')
line('Guardan su lista con el correo', e('email_saved'))
line('Confirman el correo o abren su lista con él', e('email_confirmed'))

// ── 2. The people behind it, from their saved lists ──
const [u] = sql(`SELECT COUNT(*) AS total, SUM(likes > 0) AS liked, SUM(likes >= 10) AS liked10, SUM(supers > 0) AS supers, SUM(invite IS NOT NULL) AS invited,
  SUM(partner_id IS NOT NULL) AS paired, SUM(created_at >= ${since}) AS fresh, SUM(updated_at >= ${Date.now() - 7 * 86400_000}) AS active7,
  SUM(updated_at - created_at >= 86400000) AS returned, ROUND(AVG(likes), 1) AS avgLikes FROM users`)
console.log('\nPersonas con lista guardada (desde el principio)')
line('Total', u.total || 0)
line(`Nuevas en ${DAYS} días`, u.fresh || 0)
line('Activas en los últimos 7 días', u.active7 || 0, pct(u.active7, u.total))
line('Volvieron otro día', u.returned || 0, pct(u.returned, u.total) + '  ← la señal de uso real')
line('Con 10 «me gusta» o más', u.liked10 || 0, pct(u.liked10, u.total))
line('Han dado algún superlike', u.supers || 0, pct(u.supers, u.total))
line('Han creado invitación', u.invited || 0, pct(u.invited, u.total))
line('Emparejadas', u.paired || 0, pct(u.paired, u.total) + '  ← la señal de producto')
line('Media de «me gusta» por persona', u.avgLikes || 0)

// ── 3. Couples and their matches, and the names people like most ──
const master = JSON.parse(readFileSync(join(ROOT, 'src/data/master.json'), 'utf8'))
const nameOf = new Map(master.map(m => [m.id, m.f.es || m.f._]))
const rows = sql('SELECT id, partner_id, lang, swipes FROM users WHERE likes > 0')
const likesOf = new Map(rows.map(r => { const m = JSON.parse(r.swipes); return [r.id, new Set(Object.keys(m).filter(k => m[k][0] === 1 || m[k][0] === 2).map(Number))] }))
let couples = 0, withMatch = 0, matches = 0
for (const r of rows) {
  if (!r.partner_id || r.id > r.partner_id || !likesOf.has(r.partner_id)) continue
  couples++
  const n = [...likesOf.get(r.id)].filter(id => likesOf.get(r.partner_id).has(id)).length
  matches += n; if (n) withMatch++
}
console.log('\nParejas')
line('Parejas en las que los dos han dado likes', couples)
line('Con al menos un match', withMatch, pct(withMatch, couples))
line('Matches por pareja (media)', couples ? (matches / couples).toFixed(1) : '–')
const tally = new Map()
for (const set of likesOf.values()) for (const id of set) tally.set(id, (tally.get(id) || 0) + 1)
console.log('\nLos 20 nombres con más «me gusta»')
for (const [id, n] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 20)) line(nameOf.get(id) || '#' + id, n)
console.log('')
