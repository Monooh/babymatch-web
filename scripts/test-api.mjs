#!/usr/bin/env node
// End-to-end checks of the sync API (cloudflare/api/worker.js) against a running copy.
//   node scripts/test-api.mjs                         the local one (wrangler dev on :8787)
//   node scripts/test-api.mjs https://babymatch.app   the live one (creates a few throwaway people)
const BASE = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '')
let passed = 0, failed = 0
const ok = (cond, what, extra) => { if (cond) passed++; else { failed++; console.log('  ✗ ' + what, extra === undefined ? '' : JSON.stringify(extra).slice(0, 400)) } }

/** One browser: remembers its secret (as the app does) and, separately, its cookie. */
function device() {
  const d = { token: null, cookie: null, rev: 0, prev: null }
  d.call = async (path, body = {}, { bearer = true, cookie = false, headers = {} } = {}) => {
    const h = { 'Content-Type': 'application/json', ...headers }
    if (bearer && d.token) h.Authorization = 'Bearer ' + d.token
    if (cookie && d.cookie) h.Cookie = d.cookie
    const res = await fetch(BASE + path, { method: 'POST', headers: h, body: JSON.stringify({ rev: d.rev, prev: d.prev, ...body }) })
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    const s = set.find(c => c.startsWith('bm_s='))
    if (s) d.cookie = s.split(';')[0]
    const data = await res.json().catch(() => ({}))
    if (data.token) d.token = data.token
    if (typeof data.rev === 'number') d.rev = data.rev
    if (data.partner) d.prev = [data.partner.id, data.partner.rev]
    return { status: res.status, set, ...data }
  }
  return d
}
const T = Date.now() - 100_000
const likesOf = state => state.swipes.filter(s => s[1] === 1 || s[1] === 2).map(s => s[0]).sort((a, b) => a - b)

console.log('against ' + BASE)

// 1. Looking around creates nothing.
const a = device()
let r = await a.call('/api/sync', {})
ok(r.anon === true && !a.token, 'no person is created without something to save', r)

// 2. The first saved name creates the person, the secret and the cookies.
r = await a.call('/api/sync', { ops: [[10, 1, T], [11, 0, T], [12, 2, T]], name: ' Lucía ', lang: 'es' })
ok(r.ok && a.token && r.rev === 1 && !r.state, 'first save creates a person at rev 1', r)
ok(r.set.some(c => c.startsWith('bm_s=') && /HttpOnly/.test(c) && /Max-Age=34560000/.test(c)), 'secret cookie is HttpOnly and long-lived', r.set)
ok(r.set.some(c => c.startsWith('bm_u=1')), 'marker cookie is set', r.set)

// 3. Sending the same thing again changes nothing.
r = await a.call('/api/sync', { ops: [[10, 1, T], [11, 0, T], [12, 2, T]] })
ok(r.rev === 1, 'a repeated request is harmless', r)

// 4. Another device of the same person, behind: it gets the whole list.
const a2 = device(); a2.token = a.token
r = await a2.call('/api/sync', {})
ok(r.state && likesOf(r.state).join() === '10,12' && r.state.name === 'Lucía', 'a device that is behind receives the full list', r)

// 5. Newest wins, entry by entry; an older answer never overrides; "cleared" is remembered.
r = await a2.call('/api/sync', { ops: [[10, 0, T - 5000], [11, 1, T + 5000], [12, 3, T + 5000]] })
r = await a.call('/api/sync', {})
const byId = Object.fromEntries(r.state.swipes.map(s => [s[0], s[1]]))
ok(byId[10] === 1 && byId[11] === 1 && byId[12] === 3, 'merge is newest-wins per name', byId)

// 6. Many writes at once must all land (no lost update).
const burst = Array.from({ length: 24 }, (_, i) => a.call('/api/sync', { ops: [[1000 + i, 1, T + i]] }))
const answers = await Promise.all(burst)
ok(answers.every(x => x.ok), 'every concurrent write is accepted', answers.filter(x => !x.ok).map(x => x.error))
r = await a2.call('/api/sync', { rev: -1 })
const have = new Set(likesOf(r.state))
ok(Array.from({ length: 24 }, (_, i) => 1000 + i).every(id => have.has(id)), 'no concurrent write was lost', [...have].length)

// 7. Preferences travel too, newest wins.
r = await a.call('/api/sync', { prefs: { at: T, data: '{"quiz":1}' } })
r = await a.call('/api/sync', { prefs: { at: T - 1, data: '{"quiz":"old"}' } })
r = await a2.call('/api/sync', { rev: -1 })
ok(r.state.prefs === '{"quiz":1}' && r.state.prefsAt === T, 'preferences are kept, newest wins', r.state)

// 8. Inviting and joining.
r = await a.call('/api/invite', { name: 'Lucía' })
const code = r.invite
ok(/^[a-z0-9]{12}$/.test(code || ''), 'an invite code is issued', r)
r = await a.call('/api/invite', {})
ok(r.invite === code, 'asking again returns the same code', r)
r = await a.call('/api/join', { code })
ok(r.own === true, 'opening your own link does not pair you with yourself', r)

const b = device()
r = await b.call('/api/join', { code, ops: [[11, 1, T], [1000, 2, T], [77, 1, T]], name: 'Dani', lang: 'es' })
ok(r.joined && r.partner && r.partner.name === 'Lucía' && r.partner.likes.includes(11) && r.partner.likes.includes(1000), 'the partner joins and sees the host’s likes', r)
r = await a.call('/api/sync', {})
ok(r.partner && r.partner.name === 'Dani' && r.partner.likes.sort().join() === '1000,11,77' && r.partner.supers.join() === '1000', 'the host sees the partner, likes and superlikes', r.partner)
r = await a.call('/api/sync', {})
ok(r.partner && !r.partner.likes, 'an unchanged partner list is not sent again', r.partner)
await b.call('/api/sync', { ops: [[10, 1, T + 9000]] })
r = await a.call('/api/sync', {})
ok(r.partner && r.partner.likes && r.partner.likes.includes(10), 'a new like from the partner arrives', r.partner)

// 9. A third visitor on the same link: asked first, then recognised as the partner on a new device.
const c = device()
r = await c.call('/api/join', { code, ops: [[500, 1, T]] })
ok(r.error === 'taken' && r.partner === 'Dani' && r.host === 'Lucía' && !c.token, 'a link in use asks before doing anything', r)
r = await c.call('/api/join', { code, claim: true, ops: [[500, 1, T]] })
ok(r.claimed && likesOf(r.state).includes(500) && likesOf(r.state).includes(77), 'claiming gives the partner’s list back and keeps what the new device had', r)
const claimedId = r.id
r = await b.call('/api/sync', {})
ok(r.ok && r.id === claimedId && r.state && likesOf(r.state).includes(500), 'the partner’s old device still works and catches up', r)

// 10. Cookie only (the app lost its storage): still recognised, and a fresh secret is handed back.
const lost = device(); lost.cookie = a.cookie
r = await lost.call('/api/sync', { needToken: true }, { bearer: false, cookie: true })
ok(r.ok && r.token && r.state && likesOf(r.state).includes(1000), 'the cookie alone restores the list and a new secret', { ok: r.ok, token: !!r.token, state: !!r.state })

// 11. The link for another phone.
r = await a.call('/api/device', {})
const other = device(); other.token = r.key
ok(!!r.key, 'a device key is issued', r)
r = await other.call('/api/sync', { ops: [[900, 1, T]] })
ok(r.ok && r.id === (await a.call('/api/sync', {})).id, 'the key opens the same person', r)

// 12. Leaving.
r = await b.call('/api/leave', {})
ok(r.ok && r.partner === null, 'leaving unpairs me', r)
r = await a.call('/api/sync', {})
ok(r.partner === null && r.state, 'and the other side learns it', r)

// 13. Rubbish and other sites.
r = await a.call('/api/sync', { ops: [['x', 1, T], [5, 9, T], [6, 1, -1], [7, 1, Date.now() + 9e9], null, [8.5, 1, T]] })
r = await a.call('/api/sync', { rev: -1 })
const seven = r.state.swipes.find(s => s[0] === 7)
ok(!r.state.swipes.some(s => s[0] === 5 || s[0] === 6 || s[0] === 8.5) && seven && seven[2] <= Date.now() + 61_000, 'odd entries are dropped and future times pulled back', seven)
r = await a.call('/api/sync', {}, { headers: { Origin: 'https://evil.example' } })
ok(r.status === 403, 'another site cannot call the API', r)
r = await a.call('/api/join', { code: 'nope-nope-nope' })
ok(r.status === 404 && r.error === 'unknown', 'an unknown code is a clean 404', r)
r = await device().call('/api/leave', {})
ok(r.status === 401, 'leaving needs a person', r)

// 14. Delete everything.
const gone = device()
await gone.call('/api/sync', { ops: [[1, 1, T]] })
const gcode = (await gone.call('/api/invite', {})).invite
const mate = device()
await mate.call('/api/join', { code: gcode, ops: [[1, 1, T]] })
r = await gone.call('/api/forget', {})
ok(r.ok && r.set.some(c => c.startsWith('bm_s=;') && /Max-Age=0/.test(c)), 'forgetting clears the cookie', r)
r = await gone.call('/api/sync', {})
ok(r.anon === true, 'a forgotten person no longer exists', r)
r = await mate.call('/api/sync', {})
ok(r.ok && r.partner === null, 'and their partner is simply unpaired', r)

// 15. Usage counters.
r = await a.call('/api/e', { ev: { app_open: 1, made_up: 3, match: 2 }, lang: 'es' })
ok(r.ok === true, 'events are accepted', r)

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
