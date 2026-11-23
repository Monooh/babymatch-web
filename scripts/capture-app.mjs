#!/usr/bin/env node
// Screenshots and short clips of the real app, for the website. Everything shown is the app itself, driven like a
// person would drive it, in each language.
//   node scripts/capture-app.mjs            all six languages
//   node scripts/capture-app.mjs es en      only those
// Needs Google Chrome and ffmpeg. Reads the live site by default (BM_CAPTURE_URL to point elsewhere).
// Writes public/shots/<lang>/{quiz,swipe,filters,lists,likes,invite,matches,match}.webp and {swipe,match}.mp4
// (H.264 only: every browser plays it and at this size it comes out smaller than VP9).
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.BM_CAPTURE_URL || 'https://babymatch.app').replace(/\/$/, '')
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const ALL = ['es', 'en', 'fr', 'de', 'it', 'pt']
const locales = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const VIEW = { width: 390, height: 844, deviceScaleFactor: 2 }
// The two people in the captures: [the one holding the phone, their partner].
const WHO = { es: ['Lucía', 'Dani'], en: ['Emma', 'Sam'], fr: ['Léa', 'Hugo'], de: ['Mia', 'Jonas'], it: ['Giulia', 'Luca'], pt: ['Maria', 'Rui'] }
const sleep = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] })

async function capture(l) {
  const out = join(ROOT, 'public/shots', l)
  mkdirSync(out, { recursive: true })
  const rows = await (await fetch(`${BASE}/data/names.${l}.json`)).json()
  // Well-known names of this language: [id, …, g at 3, pop at 6, fit at 10].
  const known = rows.filter(r => r[10] === 2 && r[6] >= 4)
  const top = g => known.filter(r => r[3] === g && r[6] === 5).map(r => r[0])
  const liked = [...top('f').slice(2, 7), ...top('m').slice(2, 6)]
  const now = Date.now()
  const state = {
    v: 1, quiz: { gender: 'any', styles: [], origin: 'mine', length: 'any', pop: 'any' }, quizSkipped: false,
    likes: Object.fromEntries(liked.map((id, i) => [id, now - i * 60000])), nopes: {}, stars: liked.slice(0, 3),
    filters: { g: [], cultures: [], tags: [], letters: [], len: [], pop: [], nativeOnly: true }, list: null, me: WHO[l][0], surname: '', partner: null,
  }
  // The partner already likes four of ours (the matches) and most well-known names, so the next like is a match.
  const withPartner = { ...state, partner: { name: WHO[l][1], likes: [...liked.slice(0, 4), ...known.map(r => r[0]).filter(id => !liked.includes(id))], at: now } }

  async function open(saved) {
    const page = await browser.newPage()
    await page.setViewport(VIEW)
    page.setDefaultTimeout(60000)
    await page.evaluateOnNewDocument((s) => {
      try {
        localStorage.setItem('babymatch:consent', 'no') // keep the analytics notice out of the picture
        // Every page shares one browser profile: always set or clear, or a first visit inherits the last state.
        if (s) localStorage.setItem('babymatch:v1', s)
        else localStorage.removeItem('babymatch:v1')
      } catch {}
    }, saved ? JSON.stringify(saved) : null)
    await page.goto(`${BASE}/${l}/app`, { waitUntil: 'networkidle0', timeout: 60000 })
    return page
  }
  const shot = async (page, name) => {
    await sleep(700)
    await sharp(await page.screenshot({ type: 'png' })).webp({ quality: 82 }).toFile(join(out, `${name}.webp`))
  }
  const tab = async (page, i) => { await (await page.$$('.tabs .tab'))[i].click(); await sleep(400) }
  /** A translucent dot under the pointer while it is down, so a drag reads as a finger on the recording. */
  const finger = page => page.evaluate(() => {
    const dot = document.createElement('div')
    dot.style.cssText = 'position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(30,32,44,.2);box-shadow:0 0 0 2px rgba(255,255,255,.75);pointer-events:none;opacity:0;transition:opacity .15s'
    document.body.appendChild(dot)
    const at = e => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px' }
    addEventListener('pointerdown', e => { at(e); dot.style.opacity = '1' }, true)
    addEventListener('pointermove', at, true)
    addEventListener('pointerup', () => { dot.style.opacity = '0' }, true)
  })
  async function drag(page, dx) {
    const box = await (await page.$('.card--top')).boundingBox()
    const x = box.x + box.width / 2, y = box.y + box.height * 0.55
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 1; i <= 16; i++) { await page.mouse.move(x + (dx * i) / 16, y - Math.abs(dx) * 0.06 * (i / 16)); await sleep(22) }
    await sleep(120)
    await page.mouse.up()
  }
  async function clip(page, name, act) {
    const raw = join(tmpdir(), `bm-${l}-${name}.webm`)
    const rec = await page.screencast({ path: raw, ffmpegPath: FFMPEG })
    await sleep(600)
    await act()
    await rec.stop()
    const filter = 'scale=540:-2:flags=lanczos,fps=30'
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', raw, '-an', '-vf', filter, '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, `${name}.mp4`)])
    rmSync(raw, { force: true })
  }

  // 1. First visit: the questions.
  let page = await open(null)
  await page.waitForSelector('.welcome')
  await page.click('.quiz-foot .btn--primary')
  await page.waitForSelector('.opt')
  await shot(page, 'quiz')
  await page.close()

  // 2. Someone who has been swiping on their own.
  page = await open(state)
  await page.waitForSelector('.card--top')
  await shot(page, 'swipe')
  await page.click('.swipe-bar .btn')
  await page.waitForSelector('.sheet-panel')
  await shot(page, 'filters')
  await page.click('.sheet-head .icon-btn')
  await tab(page, 1); await shot(page, 'lists')
  await tab(page, 2); await shot(page, 'likes')
  await tab(page, 3); await shot(page, 'invite')
  await page.close()

  // 3. After the partner's link arrives.
  page = await open(withPartner)
  await page.waitForSelector('.card--top')
  await tab(page, 3); await shot(page, 'matches')
  await tab(page, 0)
  await page.waitForSelector('.card--top')
  for (let i = 0; i < 8 && !(await page.$('.overlay')); i++) { await page.click('.deck-actions .btn--primary'); await sleep(900) }
  if (!(await page.$('.overlay'))) throw new Error(`${l}: the match overlay never appeared`)
  await shot(page, 'match')
  await page.close()

  // 4. Clips: swiping, and a match happening.
  page = await open(state)
  await page.waitForSelector('.card--top')
  await finger(page)
  await clip(page, 'swipe', async () => {
    await drag(page, 190); await sleep(1000)
    await drag(page, -190); await sleep(1000)
    await drag(page, 190); await sleep(1000)
    await drag(page, 190); await sleep(900)
  })
  await page.close()

  page = await open(withPartner)
  await page.waitForSelector('.card--top')
  await finger(page)
  await clip(page, 'match', async () => {
    for (let i = 0; i < 6 && !(await page.$('.overlay')); i++) { await drag(page, 190); await sleep(1100) }
    await sleep(2200)
  })
  await page.close()

  const kb = f => Math.round(statSync(join(out, f)).size / 1024)
  console.log(`${l}: ` + ['quiz.webp', 'swipe.webp', 'filters.webp', 'lists.webp', 'likes.webp', 'invite.webp', 'matches.webp', 'match.webp', 'swipe.mp4', 'match.mp4'].map(f => `${f} ${kb(f)} KB`).join(' · '))
}

for (const l of locales) {
  // The live site is far away and now and then slow: one more try before giving up on a language.
  try { await capture(l) } catch (e) { console.log(`${l}: ${e.message.split('\n')[0]} — trying again`); await capture(l) }
}
await browser.close()
