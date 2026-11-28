#!/usr/bin/env node
// End-to-end checks of the sync API (cloudflare/api/worker.js) against a running copy.
//   node scripts/test-api.mjs                         the local one (wrangler dev on :8787)
//   node scripts/test-api.mjs https://babymatch.app   the live one (creates a few throwaway people)
const BASE = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '')
let passed = 0, failed = 0
const ok = (cond, what, extra) => { if (cond) passed++; else { failed++; console.log('  ✗ ' + what, extra === undefined ? '' : JSON.stringify(extra).slice(0, 400)) } }

/** One browser: remembers its secret (as the app does) and, separately, its cookie. */
const devices = []
function device() {
  const d = { token: null, cookie: null, rev: 0, prev: null }
  devices.push(d)
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

// 16. The final round: each person's ranking travels like the list, and the partner can read it.
const x = device(), y = device()
await x.call('/api/sync', { ops: [[1, 1, T], [2, 1, T], [3, 2, T]], name: 'Xena', lang: 'es' })
const xcode = (await x.call('/api/invite', {})).invite
await y.call('/api/join', { code: xcode, ops: [[2, 1, T], [3, 1, T]], name: 'Yago', lang: 'es' })
const blob = JSON.stringify({ duel: { 2: [1016, 1], 3: [984, 1] } })
r = await x.call('/api/sync', { final: { at: T + 10, data: blob } })
ok(r.ok && r.rev > 0, 'a ranking is saved', r)
r = await y.call('/api/sync', {})
ok(r.partner && r.partner.final === blob, 'the partner receives it', r.partner)
r = await x.call('/api/sync', { final: { at: T + 5, data: '{"duel":{}}' }, rev: 0 })
ok(r.state && r.state.final === blob && r.state.finalAt === T + 10, 'an older ranking never replaces a newer one', r.state)

// 17. Family and friends vote on the finalists.
r = await x.call('/api/poll', { names: [[2, 'Lucía'], [3, 'Vega'], [2, 'again'], ['x', 'bad'], [4, '<b>Noa</b>']], lang: 'es' })
const pcode = r.poll && r.poll.code
ok(r.ok && pcode && r.poll.names.length === 3 && r.poll.names[2][1] === 'bNoa/b' && r.poll.who.join('+') === 'Xena+Yago', 'a poll is created with clean names and both partners on it', r)
r = await y.call('/api/poll/mine', {})
ok(r.poll && r.poll.code === pcode, 'the partner sees the same poll', r)
const voter = { call: (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async res => ({ status: res.status, ...(await res.json()) })) }
r = await voter.call('/api/poll/get', { code: pcode, voter: 'voteraaaaaaaaaa1' })
ok(r.ok && r.mine === null && r.poll.counts === undefined && r.poll.voters === undefined && r.poll.names.length === 3, 'a voter sees the names, not the tally', r)
r = await voter.call('/api/vote', { code: pcode, voter: 'voteraaaaaaaaaa1', id: 2, name: 'Abuela Carmen' })
ok(r.ok && r.mine === 2 && r.poll.counts[2] === 1 && r.poll.total === 1 && r.poll.voters === undefined, 'after voting they see the totals, never who voted', r)
await voter.call('/api/vote', { code: pcode, voter: 'voteraaaaaaaaaa2', id: 3 })
r = await voter.call('/api/vote', { code: pcode, voter: 'voteraaaaaaaaaa1', id: 3, name: 'Abuela Carmen' })
ok(r.poll.counts[3] === 2 && !r.poll.counts[2] && r.poll.total === 2, 'a vote can be changed, not repeated', r)
r = await voter.call('/api/vote', { code: pcode, voter: 'voteraaaaaaaaaa3', id: 99 })
ok(r.status === 400, 'a name that is not on the poll cannot be voted', r)
r = await voter.call('/api/vote', { code: pcode, voter: 'short', id: 2 })
ok(r.status === 400, 'nor can a vote without a proper voter id', r)
r = await x.call('/api/poll/mine', {})
ok(r.poll.total === 2 && r.poll.voters.length === 1 && r.poll.voters[0][0] === 'Abuela Carmen' && r.poll.voters[0][1] === 3, 'the couple sees who voted what', r)
r = await x.call('/api/poll', { names: [[2, 'Lucía'], [4, 'Noa']], lang: 'es' })
ok(r.poll.code === pcode && r.poll.total === 0, 'changing the names keeps the link and drops votes for names taken off', r)
r = await device().call('/api/poll', { names: [[2, 'Lucía'], [4, 'Noa']] })
ok(r.status === 401, 'a poll needs a person', r)
r = await x.call('/api/poll/close', {})
r = await voter.call('/api/poll/get', { code: pcode })
ok(r.status === 404, 'a closed poll is gone', r)

// 20. The owner's panel is closed to everyone else.
r = await device().call('/api/admin/stats', { days: 30 })
ok(r.status === 401 && !r.events, 'the panel gives nothing without its key', r)
r = await device().call('/api/admin/stats', { days: 30 }, { headers: { Authorization: 'Bearer ' + 'x'.repeat(43) } })
ok(r.status === 401, 'nor with a made-up key', r)
r = await device().call('/api/admin/open', { token: 'x'.repeat(43) })
ok(r.ok === false && !r.key, 'a made-up link opens nothing', r)

// 18, 19 and 21 need what only the local server has: the emails it would have sent, and a backup to run on demand.
if (/localhost|127\.0\.0\.1/.test(BASE)) {
  const outbox = async () => (await fetch(BASE + '/api/_outbox').then(res => res.json())).mail
  const lastTo = async to => (await outbox()).filter(m => m.to === to).pop()
  const mail = `x${Date.now()}@example.test`

  // 18. Optional email.
  r = await x.call('/api/email', { email: 'not an email' })
  ok(r.ok === false && r.error === 'email', 'a bad address is refused', r)
  r = await x.call('/api/email', { email: ' ' + mail.toUpperCase() + ' ' })
  ok(r.ok && r.mail === true && r.email && r.email[0] === mail && r.email[1] === 0, 'an address is kept, unconfirmed', r)
  let sent = await lastTo(mail)
  const mtoken = sent && (sent.text.match(/#m=([\w-]+)/) || [])[1]
  ok(sent && mtoken && /\/es\/app#m=/.test(sent.text) && /Xena/.test(sent.text), 'the confirmation email goes out in the person\'s language', sent)
  // Opened on a new phone that already had a list of its own.
  const phone = device()
  await phone.call('/api/sync', { ops: [[50, 1, T]] })
  const strayId = (await phone.call('/api/sync', {})).id
  r = await phone.call('/api/email/confirm', { token: mtoken })
  ok(r.ok && r.confirmed && r.email[1] === 1 && r.name !== '' && likesOf(r.state).join() === '1,2,3,50' && r.partner && r.partner.name === 'Yago', 'the link confirms the address and opens the list there, bringing along what the phone had', r)
  r = await phone.call('/api/email/confirm', { token: mtoken })
  ok(r.ok === false && r.error === 'expired', 'a link works once', r)
  r = await device().call('/api/email/login', { email: 'nobody@example.test' })
  ok(r.ok === true && !(await lastTo('nobody@example.test')), 'asking for an unknown address says nothing and sends nothing', r)
  r = await device().call('/api/email/login', { email: mail, lang: 'en' })
  sent = await lastTo(mail)
  const ltoken = sent && (sent.text.match(/#m=([\w-]+)/) || [])[1]
  ok(r.ok && ltoken && ltoken !== mtoken && /\/en\/app#m=/.test(sent.text), '"I lost my list" sends a link to the confirmed address', sent)
  const lost = device()
  r = await lost.call('/api/email/confirm', { token: ltoken })
  ok(r.ok && likesOf(r.state).join() === '1,2,3,50' && lost.token, 'and that link brings the list back on an empty device', r)
  // The partner likes something the person likes while the person is away: one email, not two.
  r = await y.call('/api/sync', { ops: [[1, 1, T + 50]] }, { headers: { 'X-Test-Away': '1' } })
  await new Promise(res => setTimeout(res, 300))
  sent = await lastTo(mail)
  ok(sent && /Yago/.test(sent.text) && /un nombre nuevo/.test(sent.subject) && /#u=[a-z0-9]{16,}/.test(sent.text), 'new matches are announced by email, with a way out', sent)
  const before = (await outbox()).length
  await y.call('/api/sync', { ops: [[50, 1, T + 60]] }, { headers: { 'X-Test-Away': '1' } })
  await new Promise(res => setTimeout(res, 300))
  ok((await outbox()).length === before, 'at most one such email a day', before)
  // A partner joining is told to whoever invited them.
  const host = device(), guest = device()
  const hmail = `h${Date.now()}@example.test`
  await host.call('/api/sync', { ops: [[7, 1, T]], name: 'Hugo', lang: 'fr' })
  await host.call('/api/email', { email: hmail })
  await host.call('/api/email/confirm', { token: ((await lastTo(hmail)).text.match(/#m=([\w-]+)/) || [])[1] })
  await guest.call('/api/join', { code: (await host.call('/api/invite', {})).invite, name: 'Inès', ops: [[7, 1, T]] })
  await new Promise(res => setTimeout(res, 300))
  sent = await lastTo(hmail)
  ok(sent && /Inès t’a rejoint/.test(sent.subject), 'the host hears by email that the partner joined', sent)
  const offKey = (sent.text.match(/#u=([a-z0-9]+)/) || [])[1]
  r = await device().call('/api/email/off', { key: offKey })
  ok(r.ok === true, 'the link in the email turns it off', r)
  r = await host.call('/api/sync', {})
  ok(r.email === null, 'and the address is forgotten', r)

  // 20b. Premium: the server can take the payment (made up locally), one of the couple pays and both have it.
  {
    const a = device(), b = device()
    r = await a.call('/api/sync', { ops: [[101, 1, Date.now()]] })
    ok(r.ok && r.plan === 'free' && r.pay === true, 'a new person is on the free plan and the payment is on', [r.plan, r.pay])
    const aId = r.id
    r = await a.call('/api/pay/check', {})
    ok(r.ok && r.plan === 'free', 'asking without having paid changes nothing', r.plan)
    r = await a.call('/api/pay', { lang: 'es' })
    ok(r.ok && typeof r.url === 'string' && /\/es\/app#paid$/.test(r.url) && r.plan === 'free', 'starting the payment gives the address of the payment page', r.url)
    r = await a.call('/api/pay/check', {})
    ok(r.plan === 'free', 'a payment that was started but not made is not Premium', r.plan)
    r = await a.call('/api/invite', {})
    const code = r.invite
    r = await b.call('/api/join', { code, ops: [[101, 1, Date.now()]] })
    ok(r.ok && r.plan === 'free', 'the partner of a free person is free', r.plan)
    await fetch(`${BASE}/api/_pay?user=${aId}`)
    r = await a.call('/api/pay/check', {})
    ok(r.ok && r.plan === 'premium', 'once the payment went through, the person is Premium', r.plan)
    r = await b.call('/api/sync', {})
    ok(r.plan === 'premium', 'and so is the partner, without paying', r.plan)
    r = await a.call('/api/pay', { lang: 'es' })
    ok(r.ok && !r.url && r.plan === 'premium', 'a Premium person is not sent to pay again', [r.url, r.plan])
    r = await b.call('/api/leave', {})
    r = await b.call('/api/sync', {})
    ok(r.plan === 'free', 'leaving the couple, the one who did not pay is free again', r.plan)
    r = await a.call('/api/sync', {})
    ok(r.plan === 'premium', 'and the one who paid keeps Premium', r.plan)
  }

  // 20c. The account: an email and a six-digit code. One door for a new account and for coming back to it.
  {
    const codeFor = async to => { const m = (await outbox()).filter(x => x.to === to).pop(); return m ? (m.subject.match(/\d{6}/) || [''])[0] : '' }
    const mail = `cuenta${Date.now()}@example.test`
    const a = device(), b = device(), c = device()
    r = await a.call('/api/sync', { ops: [[201, 1, Date.now()], [202, 2, Date.now()], [203, 1, Date.now()]], lang: 'es' })
    const aId = r.id
    r = await a.call('/api/account', { email: 'not an email' })
    ok(r.ok === false && r.error === 'email', 'an address that is not one is refused', r.error)
    r = await a.call('/api/account', { email: mail, lang: 'es' })
    ok(r.ok && r.sent === true && r.email === null, 'asking for a code writes nothing on the person yet', [r.sent, r.email])
    const code = await codeFor(mail)
    ok(/^\d{6}$/.test(code), 'the email carries a six-digit code', code)
    r = await a.call('/api/account/code', { email: mail, code: code === '000000' ? '000001' : '000000' })
    ok(r.ok === false && r.error === 'code', 'a wrong code is refused', r.error)
    r = await a.call('/api/account/code', { email: mail, code })
    ok(r.ok && r.id === aId && r.email && r.email[0] === mail && r.email[1] === 1, 'the right code makes the address the account of that person', r.email)
    r = await a.call('/api/account/code', { email: mail, code })
    ok(r.ok === false && r.error === 'expired', 'a code works once', r.error)

    // Coming back from a new device that already has a couple of names: same call, same answer, and the lists are joined.
    r = await b.call('/api/sync', { ops: [[204, 1, Date.now()]], lang: 'es' })
    const bId = r.id
    r = await b.call('/api/account', { email: mail, lang: 'es' })
    ok(r.ok && r.sent === true && r.email === null && r.id === bId, 'asking from another device answers the same, and says nothing about the account', [r.sent, r.email])
    r = await b.call('/api/account/code', { email: mail, code: await codeFor(mail) })
    ok(r.ok && r.id === aId && JSON.stringify(likesOf(r.state)) === '[201,202,203,204]', 'the code opens the account there, with what that device had', r.state && likesOf(r.state))
    r = await a.call('/api/sync', {})
    ok(r.state && likesOf(r.state).includes(204), 'and the first device sees it too', r.state && likesOf(r.state))

    // Premium paid before having an account comes along into the account.
    r = await c.call('/api/pay', { ops: [[205, 1, Date.now()]], lang: 'es' })
    const cId = r.id
    await fetch(`${BASE}/api/_pay?user=${cId}`)
    r = await c.call('/api/pay/check', {})
    ok(r.plan === 'premium' && r.email === null, 'someone pays without an account', [r.plan, r.email])
    r = await c.call('/api/account', { email: mail, lang: 'es' })
    r = await c.call('/api/account/code', { email: mail, code: await codeFor(mail) })
    ok(r.ok && r.id === aId && r.plan === 'premium', 'signing in afterwards, the account is Premium', [r.id === aId, r.plan])
    r = await a.call('/api/sync', {})
    ok(r.plan === 'premium', 'on every device of the account', r.plan)

    // Five wrong tries kill a code.
    const d = device(), other = `otra${Date.now()}@example.test`
    await d.call('/api/account', { email: other, ops: [[206, 1, Date.now()]] })
    const good = await codeFor(other)
    for (let i = 0; i < 5; i++) r = await d.call('/api/account/code', { email: other, code: good === '111111' ? '222222' : '111111' })
    ok(r.error === 'expired', 'the fifth wrong try says the code is dead', r.error)
    r = await d.call('/api/account/code', { email: other, code: good })
    ok(r.ok === false && r.error === 'expired', 'and then not even the right one works', r.error)

    // Signing out ends that device's session; the account keeps the list.
    r = await b.call('/api/logout', {}, { cookie: true })
    ok(r.ok && r.set.some(x => /^bm_s=;/.test(x) || /Max-Age=0/.test(x)), 'signing out clears the cookies', r.set)
    r = await b.call('/api/sync', {}, { cookie: true })
    ok(r.anon === true, 'and that device is nobody again', r)
    r = await a.call('/api/sync', { rev: 0 })
    ok(r.state && likesOf(r.state).length === 5, 'while the account still has every name', r.state && likesOf(r.state))
  }

  // 21. Getting into the panel: a link to the owner's address, good once, and the figures behind it.
  const owner = `owner${Date.now()}@example.test`
  await fetch(`${BASE}/api/_admin?email=${owner}`)
  const visitor = device()
  await visitor.call('/api/e', { lang: 'es', ev: { visit: 2, src_search: 2, land_name: 2, app_open: 1, made_up: 5 } })
  await visitor.call('/api/e', { lang: 'es', ev: { visit: 7 } }, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } })
  r = await device().call('/api/admin/login', { email: 'someone@else.test' })
  ok(r.ok === true, 'asking for the link always answers the same', r)
  await new Promise(done => setTimeout(done, 400))
  ok(!(await lastTo('someone@else.test')), 'the link never goes to an address the visitor gives')
  const note = await lastTo(owner)
  const link = note && note.text.match(/\/es\/panel#k=([\w-]{20,})/)
  ok(!!link && /panel/i.test(note.subject), 'it goes to the owner, in an email with the link', note && note.subject)
  r = await device().call('/api/admin/open', { token: link[1] })
  const adminKey = r.key
  ok(r.ok === true && typeof adminKey === 'string' && adminKey.length >= 40, 'opening it gives this browser its key', r)
  r = await device().call('/api/admin/open', { token: link[1] })
  ok(r.ok === false, 'the link works once', r)
  const admin = { headers: { Authorization: 'Bearer ' + adminKey } }
  r = await device().call('/api/admin/stats', { days: 7 }, admin)
  const todayOf = name => r.events.filter(e => e[0] === r.today && e[1] === name).reduce((a, e) => a + e[2], 0)
  ok(r.ok && r.days === 7 && todayOf('visit') >= 2 && todayOf('src_search') >= 2 && todayOf('made_up') === 0, 'the figures include today\'s arrivals and no event that is not on the list', r.events && r.events.slice(0, 5))
  const seen = todayOf('visit')
  await visitor.call('/api/e', { lang: 'es', ev: { visit: 3 } }, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0)' } })
  r = await device().call('/api/admin/stats', { days: 7 }, admin)
  ok(todayOf('visit') === seen, 'crawlers are not counted as visits', [seen, todayOf('visit')])
  ok(r.users && typeof r.users.total === 'number' && r.depth && Array.isArray(r.cohorts) && r.couples && !JSON.stringify(r).includes('@'), 'people come as totals only: no address, no list', Object.keys(r))
  r = await device().call('/api/admin/stats', { days: 1 }, admin)
  const thisHour = new Date().toISOString().slice(0, 13)
  ok(r.ok && r.days === 1 && r.hourly === true && /^\d{4}-\d\d-\d\dT\d\d$/.test(r.from) && r.today >= thisHour && typeof r.hourlySince === 'string'
    && r.events.some(e => e[0] === r.today && e[1] === 'visit' && e[2] >= 2) && r.events.every(e => e[0].length === 13),
  'the 24-hour view comes by the hour and has this hour\'s arrivals', [r.from, r.today, r.hourlySince, r.events && r.events.slice(0, 3)])
  await device().call('/api/admin/out', {}, admin)
  r = await device().call('/api/admin/stats', { days: 7 }, admin)
  ok(r.status === 401, 'closing the panel on a device ends its key', r)

  // 19. The backup copy.
  const xid = (await x.call('/api/sync', {})).id
  const run = async id => fetch(`${BASE}/api/_backup?id=${id}`).then(res => res.json())
  r = await run(xid)
  ok(r.ok && r.copy && r.copy.id === xid && r.copy.email === mail && likesOf({ swipes: Object.entries(JSON.parse(r.copy.swipes)).map(([id, v]) => [Number(id), v[0], v[1]]) }).join() === '1,2,3,50' && r.sessions >= 2,
    'the backup holds the person, their list and their devices', r)
  r = await run(strayId)
  ok(r.copy === null, 'a person merged into another is not kept in the backup', r)
  r = await fetch(BASE + '/api/health').then(res => res.json())
  ok(r.ok && r.db && r.backup && r.backupAgeMinutes <= 1, 'health reports the database and a fresh backup', r)
  await x.call('/api/forget', {})
  r = await run(xid)
  ok(r.ok && r.gone >= 1 && r.copy === null && r.sessions === 0, 'deleting everything deletes the backup copy too', r)
}

// Leave nothing behind: every person this run created deletes themselves, the way the app's "erase everything" does.
for (const d of devices) if (d.token) await d.call('/api/forget', {}).catch(() => {})

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
