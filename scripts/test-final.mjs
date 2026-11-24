#!/usr/bin/env node
// The final round in real browsers: duels on two phones, the same finalists on both, one name chosen by the two,
// a vote that a relative answers on a third phone, and the list saved under an email and opened on a fourth.
// Needs the app and the API running locally (see test-app.mjs). The email part only runs against the local API,
// which keeps the emails instead of sending them.
//   node scripts/test-final.mjs [app url] [lang] [api url]
import puppeteer from 'puppeteer-core'

const APP = (process.argv[2] || 'http://localhost:3210').replace(/\/$/, '')
const L = process.argv[3] || 'es'
const API = (process.argv[4] || 'http://localhost:8787').replace(/\/$/, '')
const LOCAL = /localhost|127\.0\.0\.1/.test(APP)
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let passed = 0, failed = 0
const ok = (cond, what, extra) => { if (cond) { passed++; console.log('  ✓ ' + what) } else { failed++; console.log('  ✗ ' + what, extra === undefined ? '' : JSON.stringify(extra).slice(0, 300)) } }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const phones = []
async function phone() {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  page.setDefaultTimeout(30000)
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('babymatch:consent', 'no') } catch {} })
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()) })
  page.on('dialog', dlg => dlg.accept())
  const p = { page, errors }
  phones.push(p)
  return p
}
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('babymatch:v1') || '{}'))
const text = (page, sel) => page.$eval(sel, e => e.innerText).catch(() => null)
const tab = async (page, i) => { await (await page.$$('.tabs .tab'))[i].click(); await sleep(300) }
const skipQuiz = async page => { await page.waitForSelector('.quiz-foot .btn'); await page.click('.quiz-foot .btn'); await page.waitForSelector('.card--top') }
const dismiss = async page => { if (await page.$('.overlay')) { await page.click('.overlay .btn--primary'); await sleep(300) } }
const like = async (page, n) => { for (let i = 0; i < n; i++) { await page.click('.deck-actions .btn--primary'); await sleep(500); await dismiss(page) } }
const until = async (fn, ms = 30000) => { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) return null; await sleep(400) } }
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const seg = async (page, i) => { await (await page.$$('.seg button'))[i].click(); await sleep(400) }
/** Open the final round from the matches tab. */
const openFinal = async page => {
  await dismiss(page); await tab(page, 3)
  await page.waitForSelector('.panel--mint .btn')
  await sleep(600); await dismiss(page) // the partner's names arriving also announce the new matches, on top of everything
  await page.click('.panel--mint .btn'); await page.waitForSelector('.sheet-panel--full')
}
const synced = page => until(async () => { const s = await state(page); return s.uid && !Object.keys(s.dirty).length && !s.finalDirty && !s.prefsDirty ? s : null })

// ── a couple with names in common ──
const A = await phone(), B = await phone()
await A.page.goto(`${APP}/${L}/app`, { waitUntil: 'networkidle2' })
await skipQuiz(A.page)
await like(A.page, 6)
await tab(A.page, 3)
await A.page.type('#me', 'Lucía')
await A.page.click('.panel .btn--primary')
await A.page.waitForSelector('.linkbox')
const link = await text(A.page, '.linkbox')
await B.page.goto(link, { waitUntil: 'networkidle2' })
await B.page.waitForSelector('.welcome h1')
await B.page.type('#me', 'Dani')
await B.page.click('.quiz-foot .btn--primary')
await skipQuiz(B.page)
await sleep(1500)
await like(B.page, 7)
let b = await synced(B.page)
const matches = b ? Object.keys(b.likes).map(Number).filter(id => b.partner.likes.includes(id)) : []
ok(matches.length >= 3, 'the couple has at least three names in common', matches.length)

// ── duels on Dani's phone ──
await openFinal(B.page)
ok(!!(await B.page.$('.duel-card')) && (await overflow(B.page)) === 0, 'the final round opens on a duel, with nothing wider than the phone')
for (let i = 0; i < 8; i++) { await (await B.page.$$('.duel-card'))[i % 2].click(); await sleep(250) }
b = await synced(B.page)
const games = b ? Object.values(b.final.duel).reduce((n, e) => n + e[1], 0) : 0
ok(b && games === 16 && Object.keys(b.final.duel).every(id => matches.includes(Number(id))), 'eight duels are recorded, only among the names in common, and saved on the server', b && { games, final: b.final })
await seg(B.page, 1)
await B.page.click('#final-surname', { clickCount: 3 }); await B.page.type('#final-surname', 'García Molina')
const first = await text(B.page, '.finalists li .who b')
ok(/García Molina$/.test(first || '') && (await overflow(B.page)) === 0, 'the finalists show next to the surname', first)
const bOrder = await B.page.$$eval('.finalists li .who b', els => els.map(e => e.innerText.replace(' García Molina', '')))

// ── Lucía sees the same order before playing, then plays and they agree on one ──
await openFinal(A.page)
await seg(A.page, 1)
const aOrder = await until(async () => {
  await A.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  const names = await A.page.$$eval('.finalists li .who b', els => els.map(e => e.innerText.split(' ')[0]))
  return names.join() === bOrder.map(n => n.split(' ')[0]).join() ? names : null
}, 40000)
ok(!!aOrder, 'her phone shows the finalists in the order his duels gave them', { hers: await A.page.$$eval('.finalists li .who b', els => els.map(e => e.innerText)), his: bOrder })
await (await B.page.$$('.finalists .acts .btn:last-child'))[0].click(); await sleep(300)
b = await synced(B.page)
ok(b && b.final.pick !== null, 'he marks his choice')
await until(async () => {
  await A.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  return A.page.$('.finalists .chip--super')
}, 40000)
ok(!!(await A.page.$('.finalists li:first-child .chip--super')), 'she sees which one he chose')
await (await A.page.$$('.finalists .acts .btn:last-child'))[0].click(); await sleep(300)
ok(!!(await A.page.$('.sheet-scroll > .panel--mint')), 'when both choose the same name, the app says they have a name')
await synced(A.page)

// ── the vote ──
await seg(B.page, 2)
await B.page.waitForSelector('.sheet-scroll .btn--primary')
await B.page.click('.sheet-scroll .btn--primary')
await B.page.waitForSelector('.sheet-scroll .linkbox')
const vlink = await text(B.page, '.sheet-scroll .linkbox')
ok(new RegExp(`/${L}/vote#v=[a-z0-9]{10}$`).test(vlink || ''), 'opening the vote gives one link to share', vlink)
const box = await B.page.$eval('.sheet-scroll .linkbox', e => e.getBoundingClientRect().height)
ok(box >= 36, 'the link is fully visible', box)
const V = await phone()
await V.page.goto(vlink, { waitUntil: 'networkidle2' })
await V.page.waitForSelector('.vote-list')
const lead = await text(V.page, '.vote .lead')
ok(/Dani/.test(lead || '') && /Lucía/.test(lead || '') && !(await V.page.$('.bars--vote')) && (await overflow(V.page)) === 0, 'a relative sees who asks and the names, not the tally', lead)
await V.page.type('#voter', 'Abuela Carmen')
await (await V.page.$$('.vote-list .duel-card'))[1].click()
await V.page.waitForSelector('.bars--vote')
ok((await V.page.$$eval('.bars--vote b', els => els.map(e => e.innerText).join())) === [0, 1, 0, 0, 0].slice(0, (await V.page.$$('.bars--vote li')).length).join(), 'after voting they see the totals', await V.page.$$eval('.bars--vote b', els => els.map(e => e.innerText)))
await V.page.reload({ waitUntil: 'networkidle2' })
await V.page.waitForSelector('.vote-list .duel-card[aria-pressed="true"]')
ok(true, 'and their vote is remembered when they come back')
const tally = await until(async () => { const t = await text(B.page, '.sheet-scroll .rowlist'); return t && /Abuela Carmen/.test(t) ? t : null }, 40000)
ok(!!tally, 'the couple sees the vote and who cast it', tally)
await seg(A.page, 2)
const hers = await until(async () => text(A.page, '.sheet-scroll .linkbox'), 15000)
ok(hers === vlink, 'the partner finds the same vote on her phone', hers)

// ── the list under an email (local API only: it keeps the emails) ──
if (LOCAL) {
  const mail = `final${Date.now()}@example.test`
  await A.page.click('.sheet-head .icon-btn'); await sleep(300)
  await A.page.click('.app-bar .icon-btn'); await sleep(200)
  await (await A.page.$$('.menu button'))[1].click()
  await A.page.waitForSelector('#mail')
  await A.page.type('#mail', mail)
  await A.page.click('.sheet-panel form .btn--primary')
  const sent = await until(async () => { const t = await text(A.page, '.sheet-panel .panel--sugar'); return t && t.includes(mail) ? t : null }, 15000)
  ok(!!sent, 'saving an email says a link was sent to it', await text(A.page, '.sheet-panel .panel--sugar'))
  const box2 = (await fetch(API + '/api/_outbox').then(r => r.json())).mail.filter(m => m.to === mail).pop()
  const mlink = box2 && (box2.text.match(/https?:\/\/\S+#m=[\w-]+/) || [])[0]
  ok(!!mlink, 'the email carries the link', box2)
  const E = await phone()
  await E.page.goto(mlink, { waitUntil: 'networkidle2' })
  await E.page.waitForSelector('.quiz-foot .btn--primary')
  await E.page.click('.quiz-foot .btn--primary')
  const a = await state(A.page)
  const e = await until(async () => { const s = await state(E.page); return s.uid === a.uid && Object.keys(s.likes).length === Object.keys(a.likes).length ? s : null }, 30000)
  ok(e && e.partner && e.partner.name === 'Dani' && e.email && e.email[1] === 1 && e.final.pick === a.final.pick, 'opened on another phone, the link brings the list, the partner and the final round', e && { uid: e.uid, likes: Object.keys(e.likes).length, email: e.email })
  const hash = await E.page.evaluate(() => location.hash)
  ok(hash === '', 'and the link does not stay in the address bar', hash)
}

const errs = phones.flatMap(p => p.errors)
// Leave nothing behind: each phone erases its person on the server, as "erase everything" in the menu does.
for (const p of phones) {
  await p.page.evaluate(async api => {
    const token = localStorage.getItem('babymatch:k')
    if (token) await fetch(api + '/api/forget', { method: 'POST', credentials: api ? 'include' : 'same-origin', body: '{}', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }).catch(() => {})
  }, LOCAL ? API : '').catch(() => {})
}
ok(errs.length === 0, 'no errors in any browser console', errs.slice(0, 5))
console.log(`${passed} passed, ${failed} failed`)
await browser.close()
process.exit(failed ? 1 : 0)
