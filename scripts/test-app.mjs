#!/usr/bin/env node
// The whole couple flow in real browsers: two people on two phones, then a lost phone and a wiped browser.
// Needs the app and the API running locally:  npm run dev -- --port 3210   and   wrangler dev in cloudflare/api.
//   node scripts/test-app.mjs [app url] [lang]
import puppeteer from 'puppeteer-core'

const APP = (process.argv[2] || 'http://localhost:3210').replace(/\/$/, '')
const L = process.argv[3] || 'es'
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let passed = 0, failed = 0
const ok = (cond, what, extra) => { if (cond) { passed++; console.log('  ✓ ' + what) } else { failed++; console.log('  ✗ ' + what, extra === undefined ? '' : JSON.stringify(extra).slice(0, 300)) } }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
async function phone() {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  page.setDefaultTimeout(30000)
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('babymatch:consent', 'no') } catch {} })
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()) })
  return { ctx, page, errors }
}
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('babymatch:v1') || '{}'))
const text = (page, sel) => page.$eval(sel, e => e.innerText).catch(() => null)
const tab = async (page, i) => { await (await page.$$('.tabs .tab'))[i].click(); await sleep(300) }
const skipQuiz = async page => { await page.waitForSelector('.quiz-foot .btn'); await page.click('.quiz-foot .btn'); await page.waitForSelector('.card--top') }
const like = async (page, n = 1, dismiss = false) => {
  for (let i = 0; i < n; i++) {
    await page.click('.deck-actions .btn--primary'); await sleep(500)
    if (dismiss && await page.$('.overlay')) { await page.click('.overlay .btn--primary'); await sleep(300) } // a match: keep swiping
  }
}
const until = async (fn, ms = 30000) => { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) return null; await sleep(400) } }

// ── Lucía starts on her own ──
const A = await phone()
await A.page.goto(`${APP}/${L}/app`, { waitUntil: 'networkidle2' })
await skipQuiz(A.page)
await like(A.page, 4)
await A.page.click('.deck-actions .btn--super'); await sleep(500)          // a superlike
await A.page.click('.deck-actions .btn:nth-child(2)'); await sleep(500)    // a no
let a = await until(async () => { const s = await state(A.page); return s.uid && !Object.keys(s.dirty).length ? s : null })
ok(a && Object.keys(a.likes).length === 5 && a.stars.length === 1 && Object.keys(a.nopes).length === 1, 'five likes (one superlike) and one no are saved on the server', a && { uid: a.uid, likes: Object.keys(a.likes).length, dirty: a.dirty })

await tab(A.page, 3)
await A.page.type('#me', 'Lucía')
await A.page.click('.panel .btn--primary')
await A.page.waitForSelector('.linkbox')
const link = await text(A.page, '.linkbox')
ok(/#j=[a-z0-9]{12}&n=Luc/.test(link || ''), 'the invitation is one short link with a code', link)

// Opening her own link does nothing.
await A.page.goto('about:blank'); await A.page.goto(link, { waitUntil: 'networkidle2' }); await sleep(800)
ok(!!(await A.page.$('.tabs')) && !(await state(A.page)).pending, 'opening your own link is ignored')

// ── Dani opens it on his phone ──
const B = await phone()
await B.page.goto(link, { waitUntil: 'networkidle2' })
await B.page.waitForSelector('.welcome h1')
ok(/Lucía/.test(await text(B.page, '.welcome h1')), 'the partner is greeted with her name', await text(B.page, '.welcome h1'))
ok(!/#/.test(B.page.url()), 'the code is taken out of the address bar', B.page.url())
await B.page.type('#me', 'Dani')
await B.page.click('.quiz-foot .btn--primary')
await skipQuiz(B.page)
let b = await until(async () => { const s = await state(B.page); return s.partner && s.partner.id ? s : null })
ok(b && b.partner.name === 'Lucía' && b.partner.likes.length === 5 && b.partner.supers.length === 1, 'he is paired and has her likes and superlike', b && b.partner)

// Her likes come up first: the first like is a match.
await like(B.page, 1)
const overlay = await until(() => B.page.$('.overlay'), 5000)
ok(!!overlay, 'his first like is a match')
const matched = await text(B.page, '.overlay .big')
await B.page.click('.overlay .btn--primary'); await sleep(300)

// ── and it reaches her without anyone sending anything ──
await A.page.bringToFront()
const onA = await until(() => A.page.$('.overlay'), 40000)
ok(!!onA && (await text(A.page, '.overlay .big')) === matched, 'she is told about the match on her own phone', await text(A.page, '.overlay'))
await A.page.click('.overlay .btn:nth-child(2)'); await sleep(400)
ok((await text(A.page, '.rowlist b')) === matched && /Dani/.test(await text(A.page, '.app-h') || ''), 'and it is in her Matches, under his name', await text(A.page, '.app-pad'))

// ── her browser wipes its storage (Safari does after a week): the list comes back from the cookie ──
const before = await state(A.page)
await A.page.evaluate(() => { localStorage.removeItem('babymatch:v1'); localStorage.removeItem('babymatch:k') })
await A.page.reload({ waitUntil: 'networkidle2' })
a = await until(async () => { const s = await state(A.page); return s.uid ? s : null })
ok(a && a.uid === before.uid && Object.keys(a.likes).length === 5 && a.stars.length === 1 && Object.keys(a.nopes).length === 1 && a.partner?.name === 'Dani',
  'after the storage is wiped, the list, the superlike and the partner are back', a && { uid: a.uid, likes: Object.keys(a.likes).length, partner: a.partner?.name })
ok(!(await A.page.$('.welcome')) && !(await A.page.$('.overlay')), 'and she is neither asked the opening questions nor told about old matches again')

// ── a new phone: her personal link ──
await A.page.click('.app-bar .icon-btn'); await sleep(200)
await (await A.page.$$('.menu button'))[1].click()
await A.page.waitForSelector('.sheet-panel .btn--primary'); await A.page.click('.sheet-panel .btn--primary')
await A.page.waitForSelector('.sheet-panel .linkbox')
const keyLink = await text(A.page, '.sheet-panel .linkbox')
const C = await phone()
await C.page.goto(keyLink, { waitUntil: 'networkidle2' })
await C.page.waitForSelector('.quiz-foot .btn--primary'); await C.page.click('.quiz-foot .btn--primary')
let c = await until(async () => { const s = await state(C.page); return s.uid ? s : null })
ok(c && c.uid === before.uid && Object.keys(c.likes).length === 5 && c.partner?.name === 'Dani', 'the personal link opens the same list on another phone', c && { uid: c.uid, likes: Object.keys(c.likes).length })

// ── offline: swipes are kept and sent when the connection returns ──
await B.page.bringToFront()
// (Chrome's own offline switch does not stop keep-alive requests, so the connection is cut at fetch.)
await B.page.evaluate(() => { window.__fetch = window.fetch; window.fetch = () => Promise.reject(new TypeError('offline')) })
const likedBefore = Object.keys((await state(B.page)).likes).length
await like(B.page, 3, true)
await sleep(2500)
b = await state(B.page)
ok(Object.keys(b.dirty).length === 3 && Object.keys(b.likes).length === likedBefore + 3, 'offline swipes are kept on the phone, waiting', { dirty: Object.keys(b.dirty).length })
await B.page.evaluate(() => { window.fetch = window.__fetch; window.dispatchEvent(new Event('online')) })
b = await until(async () => { const s = await state(B.page); return Object.keys(s.dirty).length ? null : s }, 20000)
ok(!!b, 'and are sent once the connection is back')

// ── Dani loses everything and opens the first link again: he gets his list back ──
const D = await phone()
await D.page.goto(link, { waitUntil: 'networkidle2' })
await D.page.waitForSelector('.quiz-foot .btn--primary'); await D.page.click('.quiz-foot .btn--primary')
await until(async () => /uso|use|utilis|benutzt|in uso|em uso/.test(await text(D.page, '.welcome h1') || ''), 10000)
ok(/Dani/.test(await text(D.page, '.welcome') || ''), 'a link already in use asks whether it is him', await text(D.page, '.welcome'))
await D.page.click('.quiz-foot .btn--primary')
let d = await until(async () => { const s = await state(D.page); return s.uid ? s : null })
ok(d && d.uid === b.uid && Object.keys(d.likes).length === Object.keys(b.likes).length, 'and gives him his own list back', d && { uid: d.uid, likes: Object.keys(d.likes).length, was: Object.keys(b.likes).length })

// ── delete everything ──
C.page.on('dialog', dlg => dlg.accept())
await C.page.waitForSelector('.app-bar .icon-btn')
await C.page.click('.app-bar .icon-btn'); await sleep(200)
await C.page.click('.menu .danger'); await sleep(2500)
c = await state(C.page)
ok(!c.uid && !Object.keys(c.likes || {}).length, '"erase everything" empties the phone')
await B.page.bringToFront()
await B.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
b = await until(async () => { const s = await state(B.page); return s.partner ? null : s }, 40000)
ok(!!b, 'and her partner is simply unpaired')

const errs = [...A.errors, ...B.errors, ...C.errors, ...D.errors]
ok(errs.length === 0, 'no errors in any browser console', errs.slice(0, 5))
console.log(`${passed} passed, ${failed} failed`)
// Against the live site, the one person this run leaves behind (the partner) can be removed by this id.
console.log('left behind: ' + (d && d.uid))
await browser.close()
process.exit(failed ? 1 : 0)
