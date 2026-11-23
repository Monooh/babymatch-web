// BabyMatch API: keeps each person's list safe and joins the two partners. Served at babymatch.app/api/*.
//
// There is no sign-up. The first time a device saves a name it gets a person (users) and a secret (sessions); the
// secret travels in an HttpOnly cookie, which browsers keep even when they clear a site's local storage, and the app
// holds a copy to fall back on. Every device keeps its whole list too and sends what changed, so a list is only gone
// if the device, the cookie and this database all lose it at once.
//
// A list is a map {name id: [kind, time]} merged entry by entry, newest wins. Merging is idempotent, so a request
// that is sent twice, arrives late or races another device can never drop a name.

const KIND = { NO: 0, LIKE: 1, SUPER: 2, CLEARED: 3 }
const COOKIE = 'bm_s'          // the secret (HttpOnly)
const MARKER = 'bm_u'          // "this browser has a saved list", readable by the app
const COOKIE_AGE = 400 * 86400 // the longest browsers accept
const MAX_BODY = 600_000
const MAX_OPS = 20_000
const MAX_ID = 200_000
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no look-alikes: codes get read out loud and retyped
const EVENTS = new Set(['app_open', 'quiz_start', 'quiz_done', 'quiz_skip', 'first_swipe', 'swipes_10', 'swipes_50', 'first_like', 'likes_10',
  'superlike', 'invite_created', 'invite_shared', 'invite_opened', 'partner_joined', 'match', 'list_opened', 'filters_used', 'backup_link', 'restored',
  'from_home', 'from_name', 'from_list', 'from_invite', 'from_other'])

const now = () => Date.now()

function pick(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let s = ''
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length]
  return s
}
function secret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function sha(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
const cleanName = v => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30) : null)
const cleanLang = v => (typeof v === 'string' && /^[a-z]{2}$/.test(v) ? v : '')

/** [[id, kind, ms], …] from a client, with anything odd dropped. A time in the future is pulled back to now. */
function cleanOps(raw, t) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const op of raw.slice(0, MAX_OPS)) {
    if (!Array.isArray(op)) continue
    const [id, kind, ms] = op
    if (!Number.isInteger(id) || id < 0 || id > MAX_ID) continue
    if (kind !== 0 && kind !== 1 && kind !== 2 && kind !== 3) continue
    if (!Number.isFinite(ms) || ms <= 0) continue
    out.push([id, kind, Math.min(Math.floor(ms), t + 60_000)])
  }
  return out
}
function parseSwipes(text) {
  try { const v = JSON.parse(text || '{}'); return v && typeof v === 'object' ? v : {} } catch { return {} }
}
/** Newest wins; on the very same instant the stronger answer wins, so both sides always agree. */
function newer(kind, ms, cur) {
  return !cur || ms > cur[1] || (ms === cur[1] && kind > cur[0])
}
function mergeOps(map, ops) {
  let changed = false
  for (const [id, kind, ms] of ops) {
    if (newer(kind, ms, map[id])) { map[id] = [kind, ms]; changed = true }
  }
  return changed
}
function count(map) {
  let likes = 0, supers = 0
  for (const id in map) { const k = map[id][0]; if (k === KIND.LIKE) likes++; else if (k === KIND.SUPER) { likes++; supers++ } }
  return { likes, supers }
}
const asList = map => Object.keys(map).map(id => [Number(id), map[id][0], map[id][1]])

function reply(data, { status = 200, cookies = [], cors = null } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  for (const c of cookies) headers.append('Set-Cookie', c)
  if (cors) for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(JSON.stringify(data), { status, headers })
}
function cookiesFor(token, secure, age = COOKIE_AGE) {
  const tail = `Max-Age=${age}; SameSite=Lax${secure ? '; Secure' : ''}`
  return [`${COOKIE}=${token}; Path=/api; HttpOnly; ${tail}`, `${MARKER}=1; Path=/; ${tail}`]
}
function readCookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))
  return m ? m[1] : null
}

const getUser = (env, id) => env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()

/** Who is asking: the secret in the Authorization header (the app's own copy) or, failing that, in the cookie. */
async function whoIs(request, env) {
  const bearer = (request.headers.get('Authorization') || '').match(/^Bearer ([\w-]{20,})$/)
  const tokens = [bearer && bearer[1], readCookie(request, COOKIE)].filter(Boolean)
  for (const token of tokens) {
    const hash = await sha(token)
    const user = await env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ?').bind(hash).first()
    if (user) return { user, token, hash }
  }
  return { user: null, token: null, hash: null }
}
async function newSession(env, userId) {
  const token = secret()
  await env.DB.prepare('INSERT INTO sessions (hash, user_id, created_at) VALUES (?, ?, ?)').bind(await sha(token), userId, now()).run()
  return token
}
async function createUser(env, body) {
  const id = pick(16), t = now()
  await env.DB.prepare('INSERT INTO users (id, name, lang, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, cleanName(body.name) || '', cleanLang(body.lang), t, t).run()
  return { user: await getUser(env, id), token: await newSession(env, id) }
}

/**
 * Write what the client sent on top of what is stored. The update only goes through if nobody else wrote in between
 * (the rev still matches); otherwise read again and merge again. Returns the stored person and the rev it started from.
 */
async function save(env, user, { ops = [], prefs = null, name = null, lang = '' }) {
  for (let attempt = 0; attempt < 30; attempt++) {
    // Lost the race to another device: wait a moment (a different one each time, so they stop colliding) and redo it.
    if (attempt) await new Promise(r => setTimeout(r, 10 + Math.random() * 40 * Math.min(attempt, 6)))
    const map = parseSwipes(user.swipes)
    let dirty = mergeOps(map, ops)
    let prefsText = user.prefs, prefsAt = user.prefs_at
    if (prefs && Number.isFinite(prefs.at) && prefs.at > prefsAt && typeof prefs.data === 'string' && prefs.data.length <= 8000) {
      prefsText = prefs.data; prefsAt = Math.min(Math.floor(prefs.at), now() + 60_000); dirty = true
    }
    const nextName = name !== null && name !== user.name ? name : user.name
    const nextLang = lang && lang !== user.lang ? lang : user.lang
    if (nextName !== user.name || nextLang !== user.lang) dirty = true
    if (!dirty) return { user, base: user.rev }
    const swipes = JSON.stringify(map), c = count(map)
    const done = await env.DB.prepare(
      'UPDATE users SET swipes = ?, prefs = ?, prefs_at = ?, name = ?, lang = ?, likes = ?, supers = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND rev = ?',
    ).bind(swipes, prefsText, prefsAt, nextName, nextLang, c.likes, c.supers, now(), user.id, user.rev).run()
    if (done.meta.changes === 1) {
      return { user: { ...user, swipes, prefs: prefsText, prefs_at: prefsAt, name: nextName, lang: nextLang, rev: user.rev + 1 }, base: user.rev }
    }
    user = await getUser(env, user.id)
    if (!user) return null
  }
  return null
}

/** What a client needs to draw the partner: their name and what they like. The list is left out when it has not changed. */
async function partnerOf(env, user, seen) {
  if (!user.partner_id) return null
  const p = await env.DB.prepare('SELECT id, name, swipes, rev FROM users WHERE id = ?').bind(user.partner_id).first()
  if (!p) return null
  const out = { id: p.id, name: p.name, rev: p.rev }
  if (!Array.isArray(seen) || seen[0] !== p.id || seen[1] !== p.rev) {
    const map = parseSwipes(p.swipes)
    out.likes = []; out.supers = []
    for (const id in map) {
      const k = map[id][0]
      if (k === KIND.LIKE || k === KIND.SUPER) out.likes.push(Number(id))
      if (k === KIND.SUPER) out.supers.push(Number(id))
    }
  }
  return out
}

/** The answer to every call: where the server stands, and the full list whenever the client is behind. */
async function snapshot(env, user, body, { full = false, base = user.rev, token = null } = {}) {
  const out = { ok: true, id: user.id, rev: user.rev, plan: user.plan, invite: user.invite || null, partner: await partnerOf(env, user, full ? null : body.prev) }
  if (full || Number(body.rev) !== base) {
    out.state = { swipes: asList(parseSwipes(user.swipes)), prefs: user.prefs, prefsAt: user.prefs_at, name: user.name }
  }
  if (token) out.token = token
  return out
}

async function sync(env, body, auth) {
  const ops = cleanOps(body.ops, now())
  let { user } = auth, token = null
  if (!user) {
    // Someone just looking around has nothing to save: no person is created until there is.
    if (!ops.length && !body.prefs) return { data: { ok: true, anon: true } };
    const made = await createUser(env, body)
    user = made.user; token = made.token
  } else if (body.needToken) {
    token = await newSession(env, user.id) // the app lost its copy of the secret but the cookie survived
  }
  const saved = await save(env, user, { ops, prefs: body.prefs, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  return { data: await snapshot(env, saved.user, body, { base: saved.base, token }), token: token || auth.token }
}

async function invite(env, body, auth) {
  let { user } = auth, token = null
  if (!user) ({ user, token } = await createUser(env, body))
  const saved = await save(env, user, { ops: cleanOps(body.ops, now()), prefs: body.prefs, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  user = saved.user
  for (let i = 0; i < 5 && !user.invite; i++) {
    const code = pick(12)
    try {
      await env.DB.prepare('UPDATE users SET invite = ?, rev = rev + 1 WHERE id = ? AND invite IS NULL').bind(code, user.id).run()
    } catch { continue } // the code was taken: try another
    user = await getUser(env, user.id)
  }
  if (!user.invite) return { data: { ok: false, error: 'busy' }, status: 503 }
  return { data: await snapshot(env, user, body, { full: true, token }), token: token || auth.token }
}

const link = (env, a, b) => env.DB.prepare('UPDATE users SET partner_id = ?, rev = rev + 1, updated_at = ? WHERE id = ?').bind(b, now(), a)

async function join(env, body, auth) {
  const code = typeof body.code === 'string' ? body.code.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) : ''
  const host = code ? await env.DB.prepare('SELECT * FROM users WHERE invite = ?').bind(code).first() : null
  if (!host) return { data: { ok: false, error: 'unknown' }, status: 404 }
  let { user } = auth, token = null
  if (user && user.id === host.id) return { data: { ...(await snapshot(env, user, body, { full: true })), own: true } }

  // The link already joined two people and the visitor is neither: it is either the partner on a new or wiped
  // device, or a stranger. Ask; "claim" is the partner saying "that is me".
  if (host.partner_id && (!user || host.partner_id !== user.id)) {
    const taken = await getUser(env, host.partner_id)
    if (taken && !body.claim) return { data: { ok: false, error: 'taken', host: host.name, partner: taken.name } }
    if (taken) {
      const mine = user ? asList(parseSwipes(user.swipes)) : []
      const ops = [...mine, ...cleanOps(body.ops, now())]
      const saved = await save(env, taken, { ops, lang: cleanLang(body.lang) }) // bring along whatever this device had
      if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
      token = await newSession(env, taken.id)
      if (user && !user.partner_id) {
        await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)])
      }
      return { data: { ...(await snapshot(env, saved.user, body, { full: true, token })), claimed: true }, token }
    }
  }

  if (!user) ({ user, token } = await createUser(env, body))
  const saved = await save(env, user, { ops: cleanOps(body.ops, now()), prefs: body.prefs, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  user = saved.user
  if (user.partner_id !== host.id) {
    const steps = [link(env, user.id, host.id), link(env, host.id, user.id)]
    if (user.partner_id) steps.push(env.DB.prepare('UPDATE users SET partner_id = NULL, rev = rev + 1 WHERE id = ? AND partner_id = ?').bind(user.partner_id, user.id))
    await env.DB.batch(steps)
    user = await getUser(env, user.id)
  }
  return { data: { ...(await snapshot(env, user, body, { full: true, token })), joined: true }, token: token || auth.token }
}

async function leave(env, body, auth) {
  const { user } = auth
  if (!user) return { data: { ok: false, error: 'auth' }, status: 401 }
  if (user.partner_id) {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET partner_id = NULL, invite = NULL, rev = rev + 1 WHERE id = ?').bind(user.id),
      env.DB.prepare('UPDATE users SET partner_id = NULL, rev = rev + 1 WHERE id = ? AND partner_id = ?').bind(user.partner_id, user.id),
    ])
  }
  return { data: await snapshot(env, await getUser(env, user.id), body, { full: true }) }
}

/** A second secret for the same person: the link that opens the list on another phone, or brings it back. */
async function device(env, body, auth) {
  let { user } = auth, token = null
  if (!user) ({ user, token } = await createUser(env, body))
  const saved = await save(env, user, { ops: cleanOps(body.ops, now()), prefs: body.prefs, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  return { data: { ...(await snapshot(env, saved.user, body, { base: saved.base, token })), key: await newSession(env, user.id) }, token: token || auth.token }
}

/** "Delete everything": the person, their devices' secrets and the link to their partner. Nothing is kept. */
async function forget(env, body, auth) {
  const { user } = auth
  if (user) {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET partner_id = NULL, rev = rev + 1 WHERE partner_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ])
  }
  return { data: { ok: true }, clear: true }
}

async function track(env, body) {
  const lang = cleanLang(body.lang) || 'xx'
  const day = new Date().toISOString().slice(0, 10)
  const rows = []
  for (const [name, n] of Object.entries(body.ev && typeof body.ev === 'object' ? body.ev : {}).slice(0, 30)) {
    if (!EVENTS.has(name) || !Number.isFinite(n) || n < 1) continue
    rows.push(env.DB.prepare('INSERT INTO events (day, name, lang, n) VALUES (?, ?, ?, ?) ON CONFLICT (day, name, lang) DO UPDATE SET n = n + excluded.n')
      .bind(day, name, lang, Math.min(Math.floor(n), 50)))
  }
  if (rows.length) await env.DB.batch(rows)
  return { data: { ok: true } }
}

const ROUTES = { '/api/sync': sync, '/api/invite': invite, '/api/join': join, '/api/leave': leave, '/api/device': device, '/api/forget': forget, '/api/e': track }

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    // Only a local dev server on another port needs cross-origin access; in production the app and the API share a host.
    const origin = request.headers.get('Origin')
    const cors = env.DEV_ORIGIN && origin === env.DEV_ORIGIN
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', Vary: 'Origin' }
      : null
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors || {} })
    const handler = ROUTES[url.pathname]
    if (!handler) return reply({ ok: false, error: 'not_found' }, { status: 404, cors })
    if (request.method !== 'POST') return reply({ ok: false, error: 'method' }, { status: 405, cors })
    // A page on another site must not be able to act for a visitor through their cookie.
    if (origin && origin !== url.origin && !cors) return reply({ ok: false, error: 'origin' }, { status: 403 })
    let body
    try {
      const text = await request.text()
      if (text.length > MAX_BODY) return reply({ ok: false, error: 'too_big' }, { status: 413, cors })
      body = JSON.parse(text || '{}')
    } catch { return reply({ ok: false, error: 'json' }, { status: 400, cors }) }
    if (!body || typeof body !== 'object') return reply({ ok: false, error: 'json' }, { status: 400, cors })
    try {
      const auth = handler === track ? null : await whoIs(request, env)
      const { data, status, token, clear } = await handler(env, body, auth)
      const secure = url.protocol === 'https:'
      return reply(data, { status, cors, cookies: clear ? cookiesFor('', secure, 0) : token ? cookiesFor(token, secure) : [] })
    } catch (e) {
      console.error(url.pathname, e && e.stack ? e.stack : e)
      return reply({ ok: false, error: 'server' }, { status: 500, cors })
    }
  },
}
