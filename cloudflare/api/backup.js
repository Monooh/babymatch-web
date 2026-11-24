// A second copy of the lists, in a database of its own (binding BACKUP), refreshed by the Worker's scheduled job.
//
// Each run copies the people and device secrets that changed since the last one, a batch at a time, and keeps how
// each person's row stood on every day it changed for thirty days. So there are two ways back: the whole database
// from the latest copy, or one person from the day before something went wrong. `npm run backup` reads it.
//
// Someone who deleted their data is deleted here too: the request leaves a note (table `gone`) and the next run acts
// on it, so "delete everything" does not depend on this second database answering at that moment.

const MARGIN = 60_000   // rows written in the last minute wait for the next run: clocks differ a little between writes
const USERS = 150       // per run; the job runs every 20 minutes, which is more than ten thousand people a day
const SESSIONS = 400
const KEEP_DAYS = 30
const CHUNK = 40

const day = t => new Date(t).toISOString().slice(0, 10)

export async function runBackup(env, t = Date.now()) {
  const B = env.BACKUP
  if (!B) return { ok: false, error: 'no_backup' }
  const meta = Object.fromEntries((await B.prepare('SELECT k, v FROM meta').all()).results.map(r => [r.k, r.v]))
  const cursor = k => { try { const v = JSON.parse(meta[k]); return Array.isArray(v) ? v : [0, ''] } catch { return [0, ''] } }
  const set = (k, v) => B.prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v').bind(k, v)
  const steps = []

  const gone = (await env.DB.prepare('SELECT id FROM gone ORDER BY at LIMIT 200').all()).results
  for (const g of gone) {
    steps.push(B.prepare('DELETE FROM users_copy WHERE id = ?').bind(g.id), B.prepare('DELETE FROM users_versions WHERE id = ?').bind(g.id),
      B.prepare('DELETE FROM sessions_copy WHERE user_id = ?').bind(g.id))
  }

  let [uAt, uId] = cursor('users')
  const users = (await env.DB.prepare(
    'SELECT * FROM users WHERE updated_at < ? AND (updated_at > ? OR (updated_at = ? AND id > ?)) ORDER BY updated_at, id LIMIT ?',
  ).bind(t - MARGIN, uAt, uAt, uId, USERS).all()).results
  const today = day(t)
  for (const u of users) {
    const data = JSON.stringify(u)
    steps.push(
      B.prepare('INSERT INTO users_copy (id, data, updated_at, copied_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, copied_at = excluded.copied_at')
        .bind(u.id, data, u.updated_at, t),
      B.prepare('INSERT INTO users_versions (id, day, data) VALUES (?, ?, ?) ON CONFLICT (id, day) DO UPDATE SET data = excluded.data').bind(u.id, today, data),
    )
    uAt = u.updated_at; uId = u.id
  }

  let [sAt, sHash] = cursor('sessions')
  const sessions = (await env.DB.prepare(
    'SELECT * FROM sessions WHERE created_at < ? AND (created_at > ? OR (created_at = ? AND hash > ?)) ORDER BY created_at, hash LIMIT ?',
  ).bind(t - MARGIN, sAt, sAt, sHash, SESSIONS).all()).results
  for (const s of sessions) {
    steps.push(B.prepare('INSERT INTO sessions_copy (hash, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT (hash) DO NOTHING').bind(s.hash, s.user_id, s.created_at))
    sAt = s.created_at; sHash = s.hash
  }

  if (meta.pruned !== today) steps.push(B.prepare('DELETE FROM users_versions WHERE day < ?').bind(day(t - KEEP_DAYS * 86400_000)), set('pruned', today))
  // The cursors go last: if a batch fails the next run starts from the same place, and copying twice is harmless.
  steps.push(set('users', JSON.stringify([uAt, uId])), set('sessions', JSON.stringify([sAt, sHash])), set('run', String(t)))
  for (let i = 0; i < steps.length; i += CHUNK) await B.batch(steps.slice(i, i + CHUNK))
  if (gone.length) await env.DB.batch(gone.map(g => env.DB.prepare('DELETE FROM gone WHERE id = ?').bind(g.id)))
  return { ok: true, users: users.length, sessions: sessions.length, gone: gone.length, more: users.length === USERS || sessions.length === SESSIONS }
}

/** For the monitor: does the main database answer, and did the backup run lately? No figures about people. */
export async function health(env, t = Date.now()) {
  let db = false, backup = !env.BACKUP, age = null
  try { db = (await env.DB.prepare('SELECT 1 AS one').first()).one === 1 } catch { /* reported as false */ }
  if (env.BACKUP) {
    try {
      const row = await env.BACKUP.prepare("SELECT v FROM meta WHERE k = 'run'").first()
      age = row ? Math.round((t - Number(row.v)) / 60_000) : null
      backup = age !== null && age <= 90
    } catch { /* reported as false */ }
  }
  return { ok: db && backup, db, backup, backupAgeMinutes: age }
}
