// The private usage panel: who may open it, and the figures it shows.
//
// Getting in works like the email link of the app: the panel asks for a link, it is sent to the address in the
// `admins` table (and only there: the request carries no address), and opening it leaves a secret in that browser.
// The figures are the anonymous daily counters (events) and the saved lists in aggregate. No list, name or address
// of a person leaves this file.

import { mailOn, compose, send } from './mail.js'

const LINK_AGE = 20 * 60_000
const SESSION_AGE = 60 * 86400_000
const DAY = 86400_000

async function sha(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
function secret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const clean = v => (typeof v === 'string' && /^[\w-]{20,}$/.test(v) ? v : '')

/** "Send me the link". The answer is the same whether or not there is anyone to write to. */
export async function adminLogin(env, body, auth, meta) {
  const t = Date.now()
  const admins = mailOn(env) ? (await env.DB.prepare('SELECT email FROM admins LIMIT 3').all()).results : []
  const recent = admins.length ? (await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_tokens WHERE created_at > ?').bind(t - 3600_000).first()).n : 0
  if (admins.length && recent < 3) {
    const token = secret()
    await env.DB.prepare('INSERT INTO admin_tokens (hash, created_at) VALUES (?, ?)').bind(await sha(token), t).run()
    const mail = compose('panel', 'es', { link: `${meta.base}/es/panel#k=${token}` })
    meta.ctx.waitUntil(Promise.all(admins.map(a => send(env, a.email, mail))))
  }
  return { data: { ok: true } }
}

/** The link was opened: it stops working and this browser gets its own secret. */
export async function adminOpen(env, body) {
  const raw = clean(body.token)
  const hash = raw ? await sha(raw) : ''
  const row = hash ? await env.DB.prepare('SELECT * FROM admin_tokens WHERE hash = ?').bind(hash).first() : null
  if (!row || Date.now() - row.created_at > LINK_AGE) return { data: { ok: false, error: 'expired' } }
  const key = secret()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM admin_tokens WHERE hash = ?').bind(hash),
    env.DB.prepare('INSERT INTO admin_sessions (hash, created_at) VALUES (?, ?)').bind(await sha(key), Date.now()),
  ])
  return { data: { ok: true, key } }
}

async function allowed(env, meta) {
  const bearer = (meta.request.headers.get('Authorization') || '').match(/^Bearer ([\w-]{20,})$/)
  if (!bearer) return false
  const row = await env.DB.prepare('SELECT created_at FROM admin_sessions WHERE hash = ?').bind(await sha(bearer[1])).first()
  return !!row && Date.now() - row.created_at < SESSION_AGE
}

export async function adminOut(env, body, auth, meta) {
  const bearer = (meta.request.headers.get('Authorization') || '').match(/^Bearer ([\w-]{20,})$/)
  if (bearer) await env.DB.prepare('DELETE FROM admin_sessions WHERE hash = ?').bind(await sha(bearer[1])).run()
  return { data: { ok: true } }
}

const dayOf = ms => new Date(ms).toISOString().slice(0, 10)

/** Everything the panel draws, for the last `days` days and the same stretch before them (to compare). */
export async function adminStats(env, body, auth, meta) {
  if (!(await allowed(env, meta))) return { data: { ok: false, error: 'auth' }, status: 401 }
  const days = [7, 30, 90].includes(body.days) ? body.days : 30
  const t = Date.now()
  const today = dayOf(t)
  const from = dayOf(t - (days - 1) * DAY)             // first day of the period, as events are filed (UTC days)
  const before = dayOf(t - (2 * days - 1) * DAY)       // first day of the stretch it is compared with
  const fromMs = Date.parse(from), beforeMs = Date.parse(before)

  const [events, langs, users, depth, fresh, cohorts, extra, pairs] = (await env.DB.batch([
    env.DB.prepare('SELECT day, name, SUM(n) AS n FROM events WHERE day >= ? GROUP BY day, name').bind(before),
    env.DB.prepare("SELECT lang, name, SUM(n) AS n FROM events WHERE day >= ? AND name IN ('visit', 'app_open', 'first_swipe', 'partner_joined') GROUP BY lang, name").bind(from),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(created_at >= ?1) AS fresh, SUM(created_at >= ?2 AND created_at < ?1) AS freshBefore,
      SUM(updated_at >= ?3) AS active7, SUM(updated_at >= ?4) AS active30, SUM(updated_at - created_at >= ${DAY}) AS returned,
      SUM(updated_at - created_at >= ${7 * DAY}) AS returned7, SUM(likes > 0) AS liked, SUM(likes >= 10) AS liked10, SUM(supers > 0) AS supers,
      SUM(invite IS NOT NULL) AS invited, SUM(partner_id IS NOT NULL) AS paired, SUM(email_ok = 1) AS mailed, SUM(final <> '') AS finals FROM users`).bind(fromMs, beforeMs, t - 7 * DAY, t - 30 * DAY),
    // How much each person has swiped, in bands. Counted from the list itself, so it needs no event.
    env.DB.prepare(`SELECT CASE WHEN c < 10 THEN 'a' WHEN c < 50 THEN 'b' WHEN c < 200 THEN 'c' ELSE 'd' END AS band, COUNT(*) AS n
      FROM (SELECT (SELECT COUNT(*) FROM json_each(u.swipes)) AS c FROM users u) GROUP BY band`),
    env.DB.prepare("SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY day").bind(beforeMs),
    env.DB.prepare(`SELECT strftime('%Y-%W', created_at / 1000, 'unixepoch') AS week, MIN(created_at) AS first, COUNT(*) AS n, SUM(updated_at - created_at >= ${DAY}) AS back1,
      SUM(updated_at - created_at >= ${7 * DAY}) AS back7, SUM(likes >= 10) AS liked10, SUM(partner_id IS NOT NULL) AS paired FROM users WHERE created_at >= ? GROUP BY week ORDER BY week DESC LIMIT 9`).bind(t - 63 * DAY),
    env.DB.prepare('SELECT (SELECT COUNT(*) FROM polls) AS polls, (SELECT COUNT(*) FROM votes) AS votes'),
    env.DB.prepare('SELECT id, partner_id, swipes FROM users WHERE partner_id IS NOT NULL AND likes > 0 LIMIT 2000'),
  ])).map(r => r.results)

  // Couples where both have liked something, and how many of them share at least one name.
  const likes = new Map()
  for (const r of pairs) {
    let map = {}
    try { map = JSON.parse(r.swipes || '{}') } catch { /* an unreadable list counts as empty */ }
    likes.set(r.id, new Set(Object.keys(map).filter(k => map[k][0] === 1 || map[k][0] === 2)))
  }
  let couples = 0, withMatch = 0, matches = 0
  for (const r of pairs) {
    if (r.id > r.partner_id || !likes.has(r.partner_id)) continue
    couples++
    const theirs = likes.get(r.partner_id)
    let shared = 0
    for (const id of likes.get(r.id)) if (theirs.has(id)) shared++
    matches += shared
    if (shared) withMatch++
  }

  return { data: {
    ok: true, days, today, from, before, at: t,
    events: events.map(r => [r.day, r.name, r.n]),
    langs: langs.map(r => [r.lang, r.name, r.n]),
    users: users[0] || {},
    depth: Object.fromEntries(depth.map(r => [r.band, r.n])),
    fresh: fresh.map(r => [r.day, r.n]),
    cohorts: cohorts.map(r => ({ first: r.first, n: r.n, back1: r.back1, back7: r.back7, liked10: r.liked10, paired: r.paired })),
    polls: extra[0] || {},
    couples: { couples, withMatch, matches },
  } }
}

/** With the backup, every 20 minutes: links and browsers that have run out. */
export function adminSweep(env) {
  return env.DB.batch([
    env.DB.prepare('DELETE FROM admin_tokens WHERE created_at < ?').bind(Date.now() - LINK_AGE),
    env.DB.prepare('DELETE FROM admin_sessions WHERE created_at < ?').bind(Date.now() - SESSION_AGE),
  ])
}
