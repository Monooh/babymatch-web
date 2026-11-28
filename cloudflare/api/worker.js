// BabyMatch API: keeps each person's list safe and joins the two partners. Served at babymatch.app/api/*.
//
// There is no sign-up. The first time a device saves a name it gets a person (users) and a secret (sessions); the
// secret travels in an HttpOnly cookie, which browsers keep even when they clear a site's local storage, and the app
// holds a copy to fall back on. Every device keeps its whole list too and sends what changed, so a list is only gone
// if the device, the cookie and this database all lose it at once.
//
// A list is a map {name id: [kind, time]} merged entry by entry, newest wins. Merging is idempotent, so a request
// that is sent twice, arrives late or races another device can never drop a name.

import { runBackup, health } from './backup.js'
import { mailOn, cleanEmail, compose, send } from './mail.js'
import { adminLogin, adminOpen, adminOut, adminStats, adminSweep } from './admin.js'
import { payOn, devPay, checkout, paid, markDevPaid } from './pay.js'

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
  'from_home', 'from_name', 'from_list', 'from_invite', 'from_other', 'from_vote',
  'final_opened', 'duel', 'duels_10', 'surname_set', 'poll_created', 'poll_shared', 'vote_opened', 'vote_cast', 'email_saved', 'email_confirmed',
  // the daily limit and Premium: the limit was reached, the offer was seen, the payment was started, it went through; the "save your list" nudge
  'limit_hit', 'premium_seen', 'premium_start', 'premium_paid', 'nudge_mail',
  // the account: the screen came up at the third like, a code was asked for, the code was right
  'account_ask', 'account_start', 'account_done',
  // arrivals at the site from outside it, sent by public/consent.js: where from, and on which kind of page
  'visit', 'src_search', 'src_ai', 'src_social', 'src_other', 'src_direct', 'land_home', 'land_name', 'land_list', 'land_saints', 'land_app', 'land_data', 'land_other'])
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|python|curl|wget|scan/i
const TOKEN_AGE = 2 * 86400_000   // links sent by email
const CODE_AGE = 20 * 60_000      // the six-digit code in the same email
const CODE_TRIES = 5
const AWAY = 30 * 60_000          // no change for this long: the person is not in the app right now
const MAIL_EVERY = 20 * 3600_000  // at most one "new matches" email in this time
const MAX_VOTERS = 300

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
const isLike = kind => kind === KIND.LIKE || kind === KIND.SUPER
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
async function save(env, user, { ops = [], prefs = null, final = null, name = null, lang = '' }) {
  for (let attempt = 0; attempt < 30; attempt++) {
    // Lost the race to another device: wait a moment (a different one each time, so they stop colliding) and redo it.
    if (attempt) await new Promise(r => setTimeout(r, 10 + Math.random() * 40 * Math.min(attempt, 6)))
    const map = parseSwipes(user.swipes)
    // Names this request turns into a like for the first time (a list sent again in full must not count as news).
    const gained = ops.filter(([id, kind, ms]) => isLike(kind) && newer(kind, ms, map[id]) && !(map[id] && isLike(map[id][0]))).map(op => op[0])
    let dirty = mergeOps(map, ops)
    let prefsText = user.prefs, prefsAt = user.prefs_at
    if (prefs && Number.isFinite(prefs.at) && prefs.at > prefsAt && typeof prefs.data === 'string' && prefs.data.length <= 8000) {
      prefsText = prefs.data; prefsAt = Math.min(Math.floor(prefs.at), now() + 60_000); dirty = true
    }
    let finalText = user.final, finalAt = user.final_at
    if (final && Number.isFinite(final.at) && final.at > finalAt && typeof final.data === 'string' && final.data.length <= 8000) {
      finalText = final.data; finalAt = Math.min(Math.floor(final.at), now() + 60_000); dirty = true
    }
    const nextName = name !== null && name !== user.name ? name : user.name
    const nextLang = lang && lang !== user.lang ? lang : user.lang
    if (nextName !== user.name || nextLang !== user.lang) dirty = true
    if (!dirty) return { user, base: user.rev, gained: [] }
    const swipes = JSON.stringify(map), c = count(map)
    const done = await env.DB.prepare(
      'UPDATE users SET swipes = ?, prefs = ?, prefs_at = ?, final = ?, final_at = ?, name = ?, lang = ?, likes = ?, supers = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND rev = ?',
    ).bind(swipes, prefsText, prefsAt, finalText, finalAt, nextName, nextLang, c.likes, c.supers, now(), user.id, user.rev).run()
    if (done.meta.changes === 1) {
      return { user: { ...user, swipes, prefs: prefsText, prefs_at: prefsAt, final: finalText, final_at: finalAt, name: nextName, lang: nextLang, rev: user.rev + 1 }, base: user.rev, gained }
    }
    user = await getUser(env, user.id)
    if (!user) return null
  }
  return null
}

const partnerRow = (env, user) => (user.partner_id
  ? env.DB.prepare('SELECT id, name, lang, swipes, rev, final, email, email_ok, mail_at, mail_key, updated_at, plan FROM users WHERE id = ?').bind(user.partner_id).first()
  : null)

/** What a client needs to draw the partner: their name, what they like and how they ranked it. Left out when unchanged. */
function partnerView(p, seen) {
  if (!p) return null
  const out = { id: p.id, name: p.name, rev: p.rev }
  if (!Array.isArray(seen) || seen[0] !== p.id || seen[1] !== p.rev) {
    const map = parseSwipes(p.swipes)
    out.likes = []; out.supers = []
    for (const id in map) {
      const k = map[id][0]
      if (isLike(k)) out.likes.push(Number(id))
      if (k === KIND.SUPER) out.supers.push(Number(id))
    }
    out.final = p.final || ''
  }
  return out
}

/** The answer to every call: where the server stands, and the full list whenever the client is behind. */
async function snapshot(env, user, body, { full = false, base = user.rev, token = null, prow } = {}) {
  const p = prow !== undefined ? prow : await partnerRow(env, user)
  const out = {
    // Premium is for the couple: one of the two pays and both have it for as long as they are joined.
    ok: true, id: user.id, rev: user.rev, plan: user.plan === 'premium' || (p && p.plan === 'premium') ? 'premium' : 'free', invite: user.invite || null,
    partner: partnerView(p, full ? null : body.prev),
    mail: mailOn(env), email: user.email ? [user.email, user.email_ok ? 1 : 0] : null, pay: payOn(env),
  }
  if (full || Number(body.rev) !== base) {
    out.state = { swipes: asList(parseSwipes(user.swipes)), prefs: user.prefs, prefsAt: user.prefs_at, final: user.final || '', finalAt: user.final_at || 0, name: user.name }
  }
  if (token) out.token = token
  return out
}

const appLink = (meta, lang, hash = '') => `${meta.base}/${/^(es|en|fr|de|it|pt)$/.test(lang) ? lang : 'en'}/app${hash}`
const offLink = (meta, person) => (person.mail_key ? appLink(meta, person.lang, '#u=' + person.mail_key) : '')

/** The partner is away and this request gave the two of them new names in common: tell them, once a day at most. */
async function tellMatches(env, meta, user, p, gained) {
  if (!gained.length || !p || !p.email || !p.email_ok || !mailOn(env)) return
  const t = now()
  if (t - p.updated_at < (meta.away ?? AWAY) || t - p.mail_at < MAIL_EVERY) return
  const theirs = parseSwipes(p.swipes)
  const n = gained.filter(id => theirs[id] && isLike(theirs[id][0])).length
  if (!n) return
  // Whoever moves mail_at first sends; a second request racing this one finds it moved and stays quiet.
  const won = await env.DB.prepare('UPDATE users SET mail_at = ? WHERE id = ? AND mail_at = ?').bind(t, p.id, p.mail_at).run()
  if (won.meta.changes !== 1) return
  meta.ctx.waitUntil(send(env, p.email, compose('matches', p.lang, { name: p.name, partner: user.name, count: n, link: appLink(meta, p.lang), off: offLink(meta, p) })))
}

async function sync(env, body, auth, meta) {
  const ops = cleanOps(body.ops, now())
  let { user } = auth, token = null
  if (!user) {
    // Someone just looking around has nothing to save: no person is created until there is.
    if (!ops.length && !body.prefs && !body.final) return { data: { ok: true, anon: true, mail: mailOn(env), pay: payOn(env) } };
    const made = await createUser(env, body)
    user = made.user; token = made.token
  } else if (body.needToken) {
    token = await newSession(env, user.id) // the app lost its copy of the secret but the cookie survived
  }
  const saved = await save(env, user, { ops, prefs: body.prefs, final: body.final, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  const prow = await partnerRow(env, saved.user)
  await tellMatches(env, meta, saved.user, prow, saved.gained)
  return { data: await snapshot(env, saved.user, body, { base: saved.base, token, prow }), token: token || auth.token }
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
      await env.DB.prepare('UPDATE users SET invite = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND invite IS NULL').bind(code, now(), user.id).run()
    } catch { continue } // the code was taken: try another
    user = await getUser(env, user.id)
  }
  if (!user.invite) return { data: { ok: false, error: 'busy' }, status: 503 }
  return { data: await snapshot(env, user, body, { full: true, token }), token: token || auth.token }
}

/** Everything about one person, gone; `gone` tells the backup to forget them too. */
const erase = (env, id) => [
  env.DB.prepare('UPDATE users SET partner_id = NULL, rev = rev + 1, updated_at = ? WHERE partner_id = ?').bind(now(), id),
  env.DB.prepare('DELETE FROM votes WHERE poll IN (SELECT code FROM polls WHERE user_id = ?)').bind(id),
  env.DB.prepare('DELETE FROM polls WHERE user_id = ?').bind(id),
  env.DB.prepare('DELETE FROM mail_tokens WHERE user_id = ?').bind(id),
  env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
  env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  env.DB.prepare('INSERT INTO gone (id, at) VALUES (?, ?) ON CONFLICT (id) DO NOTHING').bind(id, now()),
]

const link = (env, a, b) => env.DB.prepare('UPDATE users SET partner_id = ?, rev = rev + 1, updated_at = ? WHERE id = ?').bind(b, now(), a)

async function join(env, body, auth, meta) {
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
        await env.DB.batch(erase(env, user.id))
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
    if (user.partner_id) steps.push(env.DB.prepare('UPDATE users SET partner_id = NULL, rev = rev + 1, updated_at = ? WHERE id = ? AND partner_id = ?').bind(now(), user.partner_id, user.id))
    await env.DB.batch(steps)
    user = await getUser(env, user.id)
    if (host.email && host.email_ok && mailOn(env)) {
      meta.ctx.waitUntil(send(env, host.email, compose('joined', host.lang, { name: host.name, partner: user.name, link: appLink(meta, host.lang), off: offLink(meta, host) })))
    }
  }
  return { data: { ...(await snapshot(env, user, body, { full: true, token })), joined: true }, token: token || auth.token }
}

async function leave(env, body, auth) {
  const { user } = auth
  if (!user) return { data: { ok: false, error: 'auth' }, status: 401 }
  if (user.partner_id) {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET partner_id = NULL, invite = NULL, rev = rev + 1, updated_at = ? WHERE id = ?').bind(now(), user.id),
      env.DB.prepare('UPDATE users SET partner_id = NULL, rev = rev + 1, updated_at = ? WHERE id = ? AND partner_id = ?').bind(now(), user.partner_id, user.id),
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
    await env.DB.batch(erase(env, user.id))
  }
  return { data: { ok: true }, clear: true }
}

// ───────── Premium: one payment ─────────

/** "Go Premium": save what the device carries, start a Stripe Checkout for this person and hand back its address. */
async function pay(env, body, auth, meta) {
  if (!payOn(env)) return { data: { ok: false, error: 'off' } }
  let { user } = auth, token = null
  if (!user) ({ user, token } = await createUser(env, body))
  const saved = await save(env, user, { ops: cleanOps(body.ops, now()), prefs: body.prefs, final: body.final, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  user = saved.user
  const snap = await snapshot(env, user, body, { base: saved.base, token })
  if (snap.plan === 'premium') return { data: snap, token: token || auth.token }
  const session = await checkout(env, user, { lang: cleanLang(body.lang) || user.lang, back: appLink(meta, cleanLang(body.lang) || user.lang) })
  if (!session) return { data: { ...snap, ok: false, error: 'pay' }, token: token || auth.token }
  await env.DB.prepare('UPDATE users SET pay_ref = ?, pay_at = ? WHERE id = ?').bind(session.id, now(), user.id).run()
  return { data: { ...snap, url: session.url }, token: token || auth.token }
}

/** Back from the payment page (or just asking): if Stripe says the last attempt was paid, this person is Premium. */
async function payCheck(env, body, auth) {
  let { user } = auth
  if (!user) return { data: { ok: true, anon: true, mail: mailOn(env), pay: payOn(env) } }
  if (user.plan !== 'premium' && user.pay_ref && now() - user.pay_at < 7 * 86400_000) {
    const r = await paid(env, user, user.pay_ref)
    if (r.paid) {
      const steps = [env.DB.prepare("UPDATE users SET plan = 'premium', paid_at = ?, rev = rev + 1, updated_at = ? WHERE id = ?").bind(now(), now(), user.id)]
      // The address given when paying is a way back to the list (and to Premium) from another phone, unless the
      // person already has one or someone else confirmed that same address.
      const address = cleanEmail(r.email)
      if (address && !(user.email && user.email_ok)) {
        const other = await env.DB.prepare('SELECT 1 AS one FROM users WHERE email = ? AND email_ok = 1 AND id <> ?').bind(address, user.id).first()
        if (!other) steps.push(env.DB.prepare('UPDATE users SET email = ?, email_ok = 1, mail_key = COALESCE(mail_key, ?) WHERE id = ?').bind(address, pick(20), user.id))
      }
      await env.DB.batch(steps)
      user = await getUser(env, user.id)
    }
  }
  return { data: await snapshot(env, user, body) }
}

// ───────── optional email ─────────

async function mailToken(env, user, address) {
  const token = secret()
  await env.DB.prepare('INSERT INTO mail_tokens (hash, user_id, email, created_at) VALUES (?, ?, ?, ?)').bind(await sha(token), user.id, address, now()).run()
  return token
}
const tooMany = async (env, user) => (await env.DB.prepare('SELECT COUNT(*) AS n FROM mail_tokens WHERE user_id = ? AND created_at > ?').bind(user.id, now() - 3600_000).first()).n >= 4

/** "Save my list with my email": keep the address and send the link that confirms it. */
async function email(env, body, auth, meta) {
  if (!mailOn(env)) return { data: { ok: false, error: 'off' } }
  const address = cleanEmail(body.email)
  if (!address) return { data: { ok: false, error: 'email' } }
  let { user } = auth, token = null
  if (!user) ({ user, token } = await createUser(env, body))
  const saved = await save(env, user, { ops: cleanOps(body.ops, now()), prefs: body.prefs, final: body.final, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  user = saved.user
  if (!(user.email === address && user.email_ok)) {
    if (await tooMany(env, user)) return { data: { ok: false, error: 'slow' } }
    await env.DB.prepare('UPDATE users SET email = ?, email_ok = 0, mail_key = COALESCE(mail_key, ?), updated_at = ? WHERE id = ?').bind(address, pick(20), now(), user.id).run()
    user = await getUser(env, user.id)
    const t = await mailToken(env, user, address)
    // Waited for, unlike the notes: "we have sent you a link" must not be said when the provider refused the email.
    const sent = await send(env, address, compose('confirm', user.lang, { name: user.name, link: appLink(meta, user.lang, '#m=' + t) }))
    if (!sent) return { data: { ...(await snapshot(env, user, body, { base: saved.base, token })), ok: false, error: 'mail' }, token: token || auth.token }
  }
  return { data: await snapshot(env, user, body, { base: saved.base, token }), token: token || auth.token }
}

/**
 * "Continue with my email": the one door for a new account and for coming back to one. A six-digit code (and a link)
 * goes to the address; nothing is written on anybody until the code or the link proves the address is theirs. The
 * answer is the same whether or not the address already has an account.
 */
async function account(env, body, auth, meta) {
  if (!mailOn(env)) return { data: { ok: false, error: 'off' } }
  const address = cleanEmail(body.email)
  if (!address) return { data: { ok: false, error: 'email' } }
  let { user } = auth, token = null
  if (!user) ({ user, token } = await createUser(env, body))
  const saved = await save(env, user, { ops: cleanOps(body.ops, now()), prefs: body.prefs, final: body.final, name: cleanName(body.name), lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  user = saved.user
  const snap = async extra => ({ data: { ...(await snapshot(env, user, body, { base: saved.base, token })), ...extra }, token: token || auth.token })
  const recent = (await env.DB.prepare('SELECT COUNT(*) AS n FROM mail_tokens WHERE email = ? AND created_at > ?').bind(address, now() - 3600_000).first()).n
  if (recent >= 5 || await tooMany(env, user)) return snap({ ok: false, error: 'slow' })
  // Whose address is it? Somebody who confirmed it before (this is a way back in), or else whoever is asking now.
  const owner = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND email_ok = 1 ORDER BY updated_at DESC LIMIT 1').bind(address).first()
  const target = owner || user
  const link = secret(), code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
  await env.DB.prepare('INSERT INTO mail_tokens (hash, user_id, email, created_at, code) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha(link), target.id, address, now(), await sha(address + ':' + code)).run()
  const lang = cleanLang(body.lang) || user.lang
  const sent = await send(env, address, compose('code', lang, { name: target.name, code, link: appLink(meta, lang, '#m=' + link) }))
  return sent ? snap({ sent: true }) : snap({ ok: false, error: 'mail' })
}

/** The code from the email, typed in the app. A few wrong tries and that code is dead. */
async function accountCode(env, body, auth) {
  const address = cleanEmail(body.email)
  const code = typeof body.code === 'string' && /^\d{6}$/.test(body.code) ? body.code : ''
  const row = address ? await env.DB.prepare('SELECT * FROM mail_tokens WHERE email = ? AND code IS NOT NULL AND created_at > ? ORDER BY created_at DESC LIMIT 1').bind(address, now() - CODE_AGE).first() : null
  if (!row || row.tries >= CODE_TRIES) return { data: { ok: false, error: 'expired' } }
  if (!code || (await sha(address + ':' + code)) !== row.code) {
    await env.DB.prepare('UPDATE mail_tokens SET tries = tries + 1 WHERE hash = ?').bind(row.hash).run()
    return { data: { ok: false, error: row.tries + 1 >= CODE_TRIES ? 'expired' : 'code' } }
  }
  return openMail(env, row, body, auth)
}

/** The link in the email was opened: the address is confirmed and this device becomes one of that person's devices. */
async function emailConfirm(env, body, auth) {
  const raw = typeof body.token === 'string' && /^[\w-]{20,}$/.test(body.token) ? body.token : ''
  const row = raw ? await env.DB.prepare('SELECT * FROM mail_tokens WHERE hash = ?').bind(await sha(raw)).first() : null
  if (!row || now() - row.created_at > TOKEN_AGE) return { data: { ok: false, error: 'expired' } }
  return openMail(env, row, body, auth)
}

/** A link or a code proved the address: it becomes that person's (once), and this device one of their devices. */
async function openMail(env, row, body, auth) {
  let user = await getUser(env, row.user_id)
  if (!user) return { data: { ok: false, error: 'expired' } }
  const steps = [env.DB.prepare('DELETE FROM mail_tokens WHERE hash = ?').bind(row.hash)]
  if (!(user.email === row.email && user.email_ok)) {
    // A new account. If someone else confirmed this very address in the meantime, it is theirs: open that one.
    const owner = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND email_ok = 1 AND id <> ? ORDER BY updated_at DESC LIMIT 1').bind(row.email, user.id).first()
    if (owner) user = owner
    else steps.push(env.DB.prepare('UPDATE users SET email = ?, email_ok = 1, mail_key = COALESCE(mail_key, ?), updated_at = ? WHERE id = ?').bind(row.email, pick(20), now(), user.id))
  }
  // Whatever this device had as someone else comes along, as when a partner reclaims their list.
  const other = auth.user && auth.user.id !== user.id ? auth.user : null
  // …and so does a Premium paid from this device before it had an account.
  if (other && other.plan === 'premium' && user.plan !== 'premium') {
    steps.push(env.DB.prepare("UPDATE users SET plan = 'premium', paid_at = ?, pay_ref = ?, pay_at = ?, rev = rev + 1 WHERE id = ?").bind(other.paid_at || now(), other.pay_ref, other.pay_at || 0, user.id))
  }
  await env.DB.batch(steps)
  user = await getUser(env, user.id)
  const ops = [...(other ? asList(parseSwipes(other.swipes)) : []), ...cleanOps(body.ops, now())]
  const saved = await save(env, user, { ops, lang: cleanLang(body.lang) })
  if (!saved) return { data: { ok: false, error: 'busy' }, status: 503 }
  const token = auth.user && !other ? null : await newSession(env, user.id)
  if (other && !other.partner_id && !other.email_ok) await env.DB.batch(erase(env, other.id))
  return { data: { ...(await snapshot(env, saved.user, body, { full: true, token })), confirmed: true }, token: token || auth.token }
}

/** "Sign out" on this device: its session ends; the list stays in the account. */
async function logout(env, body, auth) {
  if (auth.hash) await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(auth.hash).run()
  return { data: { ok: true }, clear: true }
}

/** "I lost my list": if a confirmed address matches, send the link that opens it. The answer never says whether it did. */
async function emailLogin(env, body, auth, meta) {
  if (!mailOn(env)) return { data: { ok: false, error: 'off' } }
  const address = cleanEmail(body.email)
  if (!address) return { data: { ok: false, error: 'email' } }
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND email_ok = 1 ORDER BY updated_at DESC LIMIT 1').bind(address).first()
  if (user && !(await tooMany(env, user))) {
    const t = await mailToken(env, user, address)
    const lang = cleanLang(body.lang) || user.lang
    meta.ctx.waitUntil(send(env, address, compose('login', lang, { name: user.name, link: appLink(meta, lang, '#m=' + t) })))
  }
  return { data: { ok: true } }
}

/** Forget the address: from the app, or from the link at the foot of an email. */
async function emailOff(env, body, auth) {
  const key = typeof body.key === 'string' && /^[a-z0-9]{16,40}$/.test(body.key) ? body.key : ''
  const user = key ? await env.DB.prepare('SELECT * FROM users WHERE mail_key = ?').bind(key).first() : auth.user
  if (!user) return { data: { ok: false, error: key ? 'unknown' : 'auth' }, status: key ? 404 : 401 }
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET email = NULL, email_ok = 0, updated_at = ? WHERE id = ?').bind(now(), user.id),
    env.DB.prepare('DELETE FROM mail_tokens WHERE user_id = ?').bind(user.id),
  ])
  if (auth.user && auth.user.id === user.id) return { data: await snapshot(env, await getUser(env, user.id), body) }
  return { data: { ok: true } }
}

// ───────── family and friends vote on the finalists ─────────

function cleanNames(raw) {
  const out = [], seen = new Set()
  for (const item of Array.isArray(raw) ? raw.slice(0, 8) : []) {
    if (!Array.isArray(item)) continue
    const id = item[0], name = cleanName(item[1])
    if (!Number.isInteger(id) || id < 0 || id > MAX_ID || seen.has(id) || !name) continue
    seen.add(id); out.push([id, name])
  }
  return out
}
const parseNames = text => { try { const v = JSON.parse(text); return Array.isArray(v) ? v : [] } catch { return [] } }
const myPoll = (env, user) => env.DB.prepare('SELECT * FROM polls WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC LIMIT 1').bind(user.id, user.partner_id || user.id).first()

/** A poll as the couple sees it (with who voted what) or as a voter sees it (totals only, and only after voting). */
async function pollView(env, row, { owner = false, counts = owner } = {}) {
  const out = { code: row.code, names: parseNames(row.names), who: parseNames(row.who), lang: row.lang }
  if (counts) {
    const rows = (await env.DB.prepare('SELECT name_id, COUNT(*) AS n FROM votes WHERE poll = ? GROUP BY name_id').bind(row.code).all()).results
    out.counts = Object.fromEntries(rows.map(r => [r.name_id, r.n]))
    out.total = rows.reduce((a, r) => a + r.n, 0)
  }
  if (owner) {
    out.voters = (await env.DB.prepare("SELECT name, name_id FROM votes WHERE poll = ? AND name <> '' ORDER BY at DESC LIMIT 60").bind(row.code).all()).results.map(r => [r.name, r.name_id])
  }
  return out
}

/** Open the vote, or change the names on it. A couple shares one poll; votes for a name that was taken off are dropped. */
async function poll(env, body, auth) {
  const { user } = auth
  if (!user) return { data: { ok: false, error: 'auth' }, status: 401 }
  const names = cleanNames(body.names)
  if (names.length < 2) return { data: { ok: false, error: 'names' } }
  const partner = user.partner_id ? await getUser(env, user.partner_id) : null
  const who = JSON.stringify([cleanName(body.name) || user.name, partner ? partner.name : ''].filter(Boolean))
  let row = await myPoll(env, user)
  if (row) {
    await env.DB.batch([
      env.DB.prepare('UPDATE polls SET names = ?, who = ?, lang = ? WHERE code = ?').bind(JSON.stringify(names), who, cleanLang(body.lang) || row.lang, row.code),
      env.DB.prepare(`DELETE FROM votes WHERE poll = ? AND name_id NOT IN (${names.map(() => '?').join(',')})`).bind(row.code, ...names.map(n => n[0])),
    ])
  } else {
    await env.DB.prepare('INSERT INTO polls (code, user_id, names, who, lang, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(pick(10), user.id, JSON.stringify(names), who, cleanLang(body.lang) || user.lang, now()).run()
  }
  row = await myPoll(env, user)
  return { data: { ok: true, poll: await pollView(env, row, { owner: true }) } }
}
async function pollMine(env, body, auth) {
  const { user } = auth
  if (!user) return { data: { ok: true, poll: null } }
  const row = await myPoll(env, user)
  return { data: { ok: true, poll: row ? await pollView(env, row, { owner: true }) : null } }
}
async function pollClose(env, body, auth) {
  const { user } = auth
  const row = user ? await myPoll(env, user) : null
  if (row) await env.DB.batch([env.DB.prepare('DELETE FROM votes WHERE poll = ?').bind(row.code), env.DB.prepare('DELETE FROM polls WHERE code = ?').bind(row.code)])
  return { data: { ok: true, poll: null } }
}

const cleanCode = v => (typeof v === 'string' ? v.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) : '')
const cleanVoter = v => (typeof v === 'string' && /^[a-z0-9]{12,32}$/.test(v) ? v : '')

/** What someone with the link sees. Totals stay hidden until they have voted, so nobody just follows the crowd. */
async function pollGet(env, body) {
  const code = cleanCode(body.code)
  const row = code ? await env.DB.prepare('SELECT * FROM polls WHERE code = ?').bind(code).first() : null
  if (!row) return { data: { ok: false, error: 'unknown' }, status: 404 }
  const voter = cleanVoter(body.voter)
  const mine = voter ? await env.DB.prepare('SELECT name_id FROM votes WHERE poll = ? AND voter = ?').bind(code, voter).first() : null
  return { data: { ok: true, poll: await pollView(env, row, { counts: !!mine }), mine: mine ? mine.name_id : null } }
}
async function vote(env, body) {
  const code = cleanCode(body.code), voter = cleanVoter(body.voter)
  const row = code ? await env.DB.prepare('SELECT * FROM polls WHERE code = ?').bind(code).first() : null
  if (!row) return { data: { ok: false, error: 'unknown' }, status: 404 }
  if (!voter || !parseNames(row.names).some(n => n[0] === body.id)) return { data: { ok: false, error: 'vote' }, status: 400 }
  const had = await env.DB.prepare('SELECT 1 AS one FROM votes WHERE poll = ? AND voter = ?').bind(code, voter).first()
  if (!had && (await env.DB.prepare('SELECT COUNT(*) AS n FROM votes WHERE poll = ?').bind(code).first()).n >= MAX_VOTERS) return { data: { ok: false, error: 'full' } }
  await env.DB.prepare('INSERT INTO votes (poll, voter, name_id, name, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (poll, voter) DO UPDATE SET name_id = excluded.name_id, name = excluded.name, at = excluded.at')
    .bind(code, voter, body.id, cleanName(body.name) || '', now()).run()
  return { data: { ok: true, poll: await pollView(env, row, { counts: true }), mine: body.id } }
}


async function track(env, body, auth, meta) {
  // Crawlers that run scripts would otherwise count as visits and as people opening the app.
  if (BOTS.test(meta.request.headers.get('User-Agent') || '')) return { data: { ok: true } }
  const lang = cleanLang(body.lang) || 'xx'
  const stamp = new Date().toISOString(), day = stamp.slice(0, 10), hour = stamp.slice(0, 13)
  const rows = []
  for (const [name, n] of Object.entries(body.ev && typeof body.ev === 'object' ? body.ev : {}).slice(0, 30)) {
    if (!EVENTS.has(name) || !Number.isFinite(n) || n < 1) continue
    const count = Math.min(Math.floor(n), 50)
    rows.push(env.DB.prepare('INSERT INTO events (day, name, lang, n) VALUES (?, ?, ?, ?) ON CONFLICT (day, name, lang) DO UPDATE SET n = n + excluded.n')
      .bind(day, name, lang, count))
    // The same count by the hour, for the panel's 24-hour view.
    rows.push(env.DB.prepare('INSERT INTO events_h (hour, name, lang, n) VALUES (?, ?, ?, ?) ON CONFLICT (hour, name, lang) DO UPDATE SET n = n + excluded.n')
      .bind(hour, name, lang, count))
  }
  if (rows.length) await env.DB.batch(rows)
  return { data: { ok: true } }
}

const ROUTES = {
  '/api/sync': sync, '/api/invite': invite, '/api/join': join, '/api/leave': leave, '/api/device': device, '/api/forget': forget, '/api/e': track,
  '/api/email': email, '/api/email/confirm': emailConfirm, '/api/email/login': emailLogin, '/api/email/off': emailOff,
  '/api/poll': poll, '/api/poll/mine': pollMine, '/api/poll/close': pollClose, '/api/poll/get': pollGet, '/api/vote': vote,
  '/api/admin/login': adminLogin, '/api/admin/open': adminOpen, '/api/admin/out': adminOut, '/api/admin/stats': adminStats,
  '/api/pay': pay, '/api/pay/check': payCheck,
  '/api/account': account, '/api/account/code': accountCode, '/api/logout': logout,
}
const PUBLIC = new Set([track, pollGet, vote, adminLogin, adminOpen, adminOut, adminStats]) // no person behind these: nothing to look up

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname === '/api/health' && request.method === 'GET') {
      const h = await health(env)
      return reply(h, { status: h.ok ? 200 : 503 })
    }
    // Only a local dev server on another port needs cross-origin access; in production the app and the API share a host.
    const origin = request.headers.get('Origin')
    const cors = env.DEV_ORIGIN && origin === env.DEV_ORIGIN
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', Vary: 'Origin' }
      : null
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors || {} })
    // Local development only: run the backup now, and read the emails that would have been sent.
    if (env.DEV_ORIGIN && url.pathname === '/api/_backup') {
      const done = await runBackup(env, Date.now() + 120_000)
      const id = url.searchParams.get('id')
      const copy = id ? await env.BACKUP.prepare('SELECT data FROM users_copy WHERE id = ?').bind(id).first() : null
      const sessions = id ? (await env.BACKUP.prepare('SELECT COUNT(*) AS n FROM sessions_copy WHERE user_id = ?').bind(id).first()).n : 0
      return reply({ ...done, copy: copy ? JSON.parse(copy.data) : null, sessions }, { cors })
    }
    if (env.DEV_ORIGIN && url.pathname === '/api/_outbox') return reply({ ok: true, mail: globalThis.__outbox || [] }, { cors })
    if (env.DEV_ORIGIN && url.pathname === '/api/_admin') { // who owns the panel, for the tests: in production it is set by hand
      await env.DB.batch([env.DB.prepare('DELETE FROM admins'), env.DB.prepare('DELETE FROM admin_tokens'), env.DB.prepare('INSERT INTO admins (email) VALUES (?)').bind(url.searchParams.get('email') || 'owner@example.test')])
      return reply({ ok: true }, { cors })
    }
    if (devPay(env) && url.pathname === '/api/_pay') { // local development only: the made-up payment page says "paid"
      const who = await getUser(env, url.searchParams.get('user') || '')
      if (who && who.pay_ref) markDevPaid(who.pay_ref)
      return reply({ ok: !!(who && who.pay_ref) }, { cors })
    }
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
      const auth = PUBLIC.has(handler) ? null : await whoIs(request, env)
      // Links in emails point at the app: the same host in production, the dev server's when run locally.
      const { data, status, token, clear } = await handler(env, body, auth, { ctx, request, base: env.DEV_ORIGIN || url.origin, away: env.DEV_ORIGIN && request.headers.get('X-Test-Away') ? 0 : undefined })
      const secure = url.protocol === 'https:'
      return reply(data, { status, cors, cookies: clear ? cookiesFor('', secure, 0) : token ? cookiesFor(token, secure) : [] })
    } catch (e) {
      console.error(url.pathname, e && e.stack ? e.stack : e)
      return reply({ ok: false, error: 'server' }, { status: 500, cors })
    }
  },

  /** Every 20 minutes: refresh the backup copy and drop email links that have expired. */
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        await env.DB.prepare('DELETE FROM mail_tokens WHERE created_at < ?').bind(Date.now() - TOKEN_AGE).run()
        await adminSweep(env)
        const r = await runBackup(env)
        if (!r.ok) console.error('backup', JSON.stringify(r))
      } catch (e) { console.error('backup', e && e.stack ? e.stack : e) }
    })())
  },
}
