#!/usr/bin/env node
// The backup copy of the lists (cloudflare/api/backup.js keeps it up to date every 20 minutes).
//
//   npm run backup                              where the copy stands: people here and there, last run
//   npm run backup -- restore <person id>       put one person back as the backup has them now
//   npm run backup -- restore <person id> 2026-11-20   …or as they stood at the end of that day (30 days are kept)
//   npm run backup -- restore-all               put back every person the main database is missing (after losing it)
//   add --local to work on the local development databases instead of the real ones
//
// Needs `npx wrangler login` done on this computer. Restoring one person replaces their row; restore-all never
// overwrites a row that exists.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = join(dirname(fileURLToPath(import.meta.url)), '..', 'cloudflare/api')
const args = process.argv.slice(2)
const where = args.includes('--local') ? '--local' : '--remote'
const [cmd, id, day] = args.filter(a => !a.startsWith('--'))

function d1(db, sql, { file = false } = {}) {
  const r = spawnSync('npx', ['--yes', 'wrangler@4', 'd1', 'execute', db, where, '--json', '--yes', file ? '--file' : '--command', sql], { cwd: API, encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.status !== 0) { console.error((r.stderr || r.stdout || '').trim().split('\n').slice(-8).join('\n')); process.exit(1) }
  const out = JSON.parse(r.stdout.slice(r.stdout.indexOf('[')))
  return out[out.length - 1].results || []
}
const q = v => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const insert = (table, row, verb) => `${verb} INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(q).join(', ')});`
function run(statements) {
  const path = join(mkdtempSync(join(tmpdir(), 'bm-restore-')), 'restore.sql')
  writeFileSync(path, statements.join('\n') + '\n')
  d1('babymatch', path, { file: true })
}
const safeId = v => { if (!/^[a-z0-9]{8,32}$/.test(v || '')) { console.error('That is not a person id.'); process.exit(1) } return v }

if (!cmd) {
  const main = d1('babymatch', 'SELECT (SELECT COUNT(*) FROM users) AS people, (SELECT COUNT(*) FROM sessions) AS devices, (SELECT COUNT(*) FROM gone) AS to_forget')[0]
  const copy = d1('babymatch-backup', "SELECT (SELECT COUNT(*) FROM users_copy) AS people, (SELECT COUNT(*) FROM sessions_copy) AS devices, (SELECT COUNT(*) FROM users_versions) AS versions, (SELECT MIN(day) FROM users_versions) AS since, (SELECT v FROM meta WHERE k = 'run') AS run")[0]
  const age = copy.run ? Math.round((Date.now() - Number(copy.run)) / 60000) : null
  console.log(`Main database:   ${main.people} people, ${main.devices} devices`)
  console.log(`Backup copy:     ${copy.people} people, ${copy.devices} devices, ${copy.versions} daily versions${copy.since ? ' since ' + copy.since : ''}`)
  console.log(`Last backup run: ${age === null ? 'never' : age + ' minutes ago'}${main.to_forget ? ` · ${main.to_forget} deleted people still to be removed from the copy` : ''}`)
  if (age === null || age > 90) { console.log('The backup is not running: check the scheduled job of babymatch-api.'); process.exit(1) }
} else if (cmd === 'restore') {
  safeId(id)
  if (day && !/^\d{4}-\d\d-\d\d$/.test(day)) { console.error('The day must look like 2026-11-20.'); process.exit(1) }
  const row = day
    ? d1('babymatch-backup', `SELECT data, day FROM users_versions WHERE id = '${id}' AND day <= '${day}' ORDER BY day DESC LIMIT 1`)[0]
    : d1('babymatch-backup', `SELECT data FROM users_copy WHERE id = '${id}'`)[0]
  if (!row) { console.error('The backup has nothing for that person' + (day ? ' on or before that day.' : '.')); process.exit(1) }
  const person = JSON.parse(row.data)
  const now = d1('babymatch', `SELECT rev FROM users WHERE id = '${id}'`)[0]
  // A higher rev than any device has seen makes every device fetch the restored list instead of sending its own back.
  person.rev = Math.max(person.rev, now ? now.rev : 0) + 1
  person.updated_at = Date.now()
  const sessions = d1('babymatch-backup', `SELECT hash, user_id, created_at FROM sessions_copy WHERE user_id = '${id}'`)
  run([insert('users', person, 'INSERT OR REPLACE'), ...sessions.map(s => insert('sessions', s, 'INSERT OR IGNORE'))])
  console.log(`Restored ${id}${row.day ? ' as of ' + row.day : ''}: ${person.likes} likes, ${sessions.length} devices.`)
  console.log('Their devices merge name by name, newest answer wins: a name they changed after that day keeps the newer answer.')
} else if (cmd === 'restore-all') {
  let done = 0
  for (let after = ''; ;) {
    const rows = d1('babymatch-backup', `SELECT id, data FROM users_copy WHERE id > '${after}' ORDER BY id LIMIT 200`)
    if (!rows.length) break
    run(rows.map(r => insert('users', JSON.parse(r.data), 'INSERT OR IGNORE')))
    done += rows.length; after = rows[rows.length - 1].id
    console.log(`people: ${done}`)
  }
  let devices = 0
  for (let after = ''; ;) {
    const rows = d1('babymatch-backup', `SELECT hash, user_id, created_at FROM sessions_copy WHERE hash > '${after}' ORDER BY hash LIMIT 1000`)
    if (!rows.length) break
    run(rows.map(s => insert('sessions', s, 'INSERT OR IGNORE')))
    devices += rows.length; after = rows[rows.length - 1].hash
  }
  console.log(`Done: ${done} people and ${devices} devices offered to the main database; rows that already existed were left alone.`)
} else {
  console.error('Usage: npm run backup [-- restore <person id> [day] | restore-all] [--local]'); process.exit(1)
}
