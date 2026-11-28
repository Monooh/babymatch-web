'use client'
import { useSyncExternalStore } from 'react'
import { actions, entryOf, getState, markAllDirty, mergeRemote, setState, subscribe, EMPTY_FINAL, type Final, type Op, type Partner, type State } from './store'

// Keeps this device's list in step with the copy on the server (cloudflare/api/worker.js), and through it with the
// partner. The device is always the working copy: every swipe is saved here first and sent a moment later, and a
// request that fails is simply sent again, so being offline or losing a reply never costs a name.

const API = process.env.NEXT_PUBLIC_API_BASE || ''
const TOKEN_KEY = 'babymatch:k'
const OFF_KEY = 'babymatch:nosync' // set by the screenshot script: its made-up swipes must not reach the server
const POLL_MS = 20_000

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline'
type Answer = {
  ok?: boolean; error?: string; anon?: boolean; id?: string; rev?: number; token?: string; key?: string; invite?: string | null
  partner?: { id: string; name: string; rev: number; likes?: number[]; supers?: number[]; final?: string } | null
  state?: { swipes: Op[]; prefs: string; prefsAt: number; final?: string; finalAt?: number; name: string }
  own?: boolean; joined?: boolean; claimed?: boolean; confirmed?: boolean; host?: string
  mail?: boolean; email?: [string, 0 | 1] | null; poll?: Poll | null
  plan?: string; pay?: boolean; url?: string
}
/** The vote a couple opened for family and friends. `counts` and `voters` only come once there is something to show. */
export type Poll = { code: string; names: [number, string][]; who: string[]; lang: string; counts?: Record<number, number>; total?: number; voters?: [string, number][] }

/** A final round as it travels: anything odd is dropped, so a bad blob can never break the app. */
function parseFinal(text: string | undefined): Final {
  try {
    const v = JSON.parse(text || '{}')
    const duel: Final['duel'] = {}
    for (const [id, e] of Object.entries(v.duel || {})) {
      if (Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1])) duel[Number(id)] = [Math.round(e[0] as number), e[1] as number]
    }
    return { duel, pick: Number.isInteger(v.pick) ? v.pick : null }
  } catch { return EMPTY_FINAL }
}

let lang = ''
let started = false
let inflight: Promise<boolean> | null = null
let again = false
let timer: number | undefined
let fails = 0
let status: SyncStatus = 'idle'
let restoring = false
const statusListeners = new Set<() => void>()
const counts: Record<string, number> = {}

const read = (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string | null) => { try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v) } catch { /* blocked */ } }
const off = () => typeof window === 'undefined' || read(OFF_KEY) === '1'
const hasMarker = () => typeof document !== 'undefined' && /(?:^|;\s*)bm_u=1/.test(document.cookie)
function setStatus(next: SyncStatus) {
  if (status === next) return
  status = next
  statusListeners.forEach(fn => fn())
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(fn => { statusListeners.add(fn); return () => statusListeners.delete(fn) }, () => status, () => 'idle')
}
export function useRestoring(): boolean {
  return useSyncExternalStore(fn => { statusListeners.add(fn); return () => statusListeners.delete(fn) }, () => restoring, () => false)
}

function pendingOps(s: State): Op[] {
  const stars = new Set(s.stars)
  const ops: Op[] = []
  for (const id in s.dirty) {
    const e = entryOf(s, Number(id), stars)
    if (e) ops.push([Number(id), e[0], e[1]])
  }
  return ops
}
const prefsOf = (s: State) => JSON.stringify({ quiz: s.quiz, quizSkipped: s.quizSkipped, filters: s.filters, surname: s.surname, me: s.me })

/** One request. Everything this device has not had confirmed rides along, whatever the call is for. */
async function post(path: string, extra: Record<string, unknown> = {}): Promise<Answer> {
  const s = getState()
  const ops = pendingOps(s)
  const sentPrefsAt = s.prefsDirty ? s.prefsAt : 0
  const sentFinalAt = s.finalDirty ? s.finalAt : 0
  const token = read(TOKEN_KEY)
  const body = {
    rev: s.rev, prev: s.partner?.id ? [s.partner.id, s.partner.rev] : null, ops, lang, name: s.me.trim() || undefined,
    prefs: sentPrefsAt ? { at: sentPrefsAt, data: prefsOf(s) } : undefined,
    final: sentFinalAt ? { at: sentFinalAt, data: JSON.stringify(s.final) } : undefined, needToken: !token || undefined, ...extra,
  }
  const res = await fetch(API + path, {
    method: 'POST', credentials: API ? 'include' : 'same-origin', keepalive: ops.length < 400,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : null) },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({ ok: false, error: 'json' }))) as Answer
  if (res.status >= 500) throw new Error(data.error || String(res.status))
  if (data.ok && !data.anon) {
    take(data, ops, sentPrefsAt, sentFinalAt)
    // Answered as a different person than last time (a new one was made, or a partner's list was reclaimed):
    // that person has only seen what this request carried, so queue the whole list for them.
    if (data.id && data.id !== s.uid && (s.uid || s.rev > 0)) { markAllDirty(); again = true }
  }
  return data
}

/** Fold a reply into the device's copy. */
function take(data: Answer, sent: Op[], sentPrefsAt: number, sentFinalAt: number) {
  if (data.token) write(TOKEN_KEY, data.token)
  setState(s => {
    const stars = new Set(s.stars)
    let patch: Partial<State> = {}
    const dirty = { ...s.dirty }
    // What was sent is safe, unless the person changed that name again while the request was in the air.
    for (const [id, kind, at] of sent) { const e = entryOf(s, id, stars); if (e && e[0] === kind && e[1] === at) delete dirty[id] }
    for (const id in dirty) if (!entryOf(s, Number(id), stars)) delete dirty[id] // nothing to send for it
    patch.dirty = dirty
    if (sentPrefsAt && sentPrefsAt === s.prefsAt) patch.prefsDirty = false
    if (sentFinalAt && sentFinalAt === s.finalAt) patch.finalDirty = false
    if (data.mail !== undefined) patch.mail = !!data.mail
    if (data.email !== undefined) patch.email = data.email
    if (data.plan !== undefined) patch.plan = data.plan === 'premium' ? 'premium' : 'free'
    if (data.pay !== undefined) patch.pay = !!data.pay
    if (data.state) {
      patch = { ...patch, ...mergeRemote({ ...s, dirty }, data.state.swipes) }
      if (data.state.prefsAt > s.prefsAt && data.state.prefs) {
        try {
          const p = JSON.parse(data.state.prefs)
          patch = { ...patch, quiz: p.quiz ?? null, quizSkipped: !!p.quizSkipped, filters: { ...s.filters, ...(p.filters || {}) }, surname: p.surname || '', me: p.me || s.me, prefsAt: data.state.prefsAt, prefsDirty: false }
        } catch { /* keep what is here */ }
      }
      if ((data.state.finalAt || 0) > s.finalAt && data.state.final) patch = { ...patch, final: parseFinal(data.state.final), finalAt: data.state.finalAt, finalDirty: false }
    }
    if (typeof data.rev === 'number') patch.rev = data.rev
    if (data.id) patch.uid = data.id
    if (data.invite !== undefined) patch.invite = data.invite
    if (data.partner === null) {
      if (s.partner?.id) patch.partner = null // unpaired on the other side; a list imported from an old link stays
    } else if (data.partner) {
      const p = data.partner, same = s.partner?.id === p.id
      const next: Partner = {
        id: p.id, name: p.name, rev: p.rev, at: same ? s.partner!.at : Date.now(),
        likes: p.likes ?? (same ? s.partner!.likes : []), supers: p.supers ?? (same ? s.partner!.supers || [] : []),
        final: p.final !== undefined ? parseFinal(p.final) : same ? s.partner!.final : undefined,
      }
      // Without the list in the reply, the stored rev must not move on, or the next reply would skip it too.
      if (!p.likes && !same) next.rev = -1
      patch.partner = next
      patch.pending = null
    }
    // A list coming back onto an empty device is not news: its matches were announced long ago.
    if (data.state && s.rev === 0 && !Object.keys(s.likes).length && patch.partner && patch.likes) {
      const theirs = new Set(patch.partner.likes)
      patch.seen = Object.keys(patch.likes).map(Number).filter(id => theirs.has(id))
    }
    return patch
  }, { remote: true })
}

/** Send what is pending and fetch what changed. Never throws; returns whether the server answered. */
export function syncNow(): Promise<boolean> {
  if (off()) return Promise.resolve(false)
  if (inflight) { again = true; return inflight }
  window.clearTimeout(timer); timer = undefined
  const s = getState()
  const busy = needsSend(s)
  if (busy) setStatus('saving')
  inflight = post('/api/sync')
    .then(data => {
      fails = 0
      if (data.error === 'auth' || (data.anon && read(TOKEN_KEY))) {
        // The server does not know this device any more: introduce it again with everything it has.
        write(TOKEN_KEY, null); setState({ rev: 0, uid: null }, { remote: true }); markAllDirty(); again = true
      }
      if (data.anon && data.mail !== undefined && data.mail !== getState().mail) setState({ mail: !!data.mail }, { remote: true })
      if (data.anon && data.pay !== undefined && data.pay !== getState().pay) setState({ pay: !!data.pay }, { remote: true })
      setStatus(data.anon ? 'idle' : 'saved')
      return true
    })
    .catch(() => {
      fails++
      setStatus('offline')
      schedule(Math.min(60_000, 3000 * 2 ** Math.min(fails, 5)))
      return false
    })
    .finally(() => {
      inflight = null
      if (restoring) { restoring = false; statusListeners.forEach(fn => fn()) }
      // After a failure the retry is already booked, further out each time: do not cut in front of it.
      if (fails === 0 && (again || needsSend(getState()))) schedule(again ? 200 : 1200)
      again = false
    })
  return inflight
}
function schedule(ms = 1200) {
  if (off()) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => { timer = undefined; void syncNow() }, ms)
}
const needsSend = (s: State) => Object.keys(s.dirty).length > 0 || s.prefsDirty || s.finalDirty

/** Called once when the app opens. */
export function startSync(language: string) {
  lang = language
  if (started || off()) return
  started = true
  const s = getState()
  const known = !!read(TOKEN_KEY) || hasMarker()
  // Nothing on this device but the browser remembers a saved list: fetch it before asking the opening questions.
  restoring = known && s.rev === 0 && !s.quiz && !s.quizSkipped && !Object.keys(s.likes).length
  if (restoring) window.setTimeout(() => { if (restoring) { restoring = false; statusListeners.forEach(fn => fn()) } }, 6000)
  if (known || needsSend(s) || s.pending) void syncNow()
  // A booked send is left alone, so steady swiping is sent every second or so instead of waiting for a pause.
  subscribe(() => { if (!inflight && timer === undefined && fails === 0 && needsSend(getState())) schedule() })
  // A partner's new likes only arrive by asking; ask while the app is on screen and someone is, or may soon be, paired.
  window.setInterval(() => {
    const st = getState()
    if (document.visibilityState === 'visible' && (st.partner?.id || st.invite)) void syncNow()
  }, POLL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { if (read(TOKEN_KEY) || needsSend(getState())) void syncNow() }
    else { if (needsSend(getState())) void syncNow(); flushEvents() }
  })
  window.addEventListener('pagehide', () => { if (needsSend(getState())) void syncNow(); flushEvents() })
  window.addEventListener('online', () => { fails = 0; void syncNow() })
  // Ask the browser not to evict this site's storage. Not every browser grants it; the server copy is the real net.
  navigator.storage?.persist?.().catch(() => {})
}

async function ask(path: string, extra?: Record<string, unknown>): Promise<Answer> {
  if (inflight) await inflight
  try { return await post(path, extra) } catch { return { ok: false, error: 'network' } }
}

/** My invitation code, created on first use. */
export async function createInvite(): Promise<string | null> {
  const data = await ask('/api/invite')
  return data.ok && data.invite ? data.invite : null
}
export type JoinResult = { result: 'joined' | 'own' | 'taken' | 'unknown' | 'network'; partner?: string; host?: string }
export async function joinInvite(code: string, claim = false): Promise<JoinResult> {
  const data = await ask('/api/join', { code, claim })
  if (data.own) { setState({ pending: null }, { remote: true }); return { result: 'own' } }
  if (data.ok) { setState({ pending: null }, { remote: true }); return { result: 'joined' } }
  if (data.error === 'taken') return { result: 'taken', partner: String((data as { partner?: unknown }).partner || ''), host: data.host }
  if (data.error === 'unknown') { setState({ pending: null }, { remote: true }); return { result: 'unknown' } }
  return { result: 'network' }
}
export async function leavePartner(): Promise<boolean> {
  const data = await ask('/api/leave')
  if (data.ok) setState({ partner: null, invite: null }, { remote: true })
  return !!data.ok
}
/** A key that opens this list on another device. */
export async function deviceKey(): Promise<string | null> {
  const data = await ask('/api/device')
  return data.ok && data.key ? data.key : null
}
/** Open a saved list on this device with a key from another one. What this device already has is merged in. */
export async function adoptKey(key: string): Promise<boolean> {
  if (inflight) await inflight
  write(TOKEN_KEY, key)
  setState({ rev: 0, uid: null, partner: null, invite: null }, { remote: true })
  markAllDirty()
  return syncNow()
}
/** Open the list a link in an email points to, here. What this device already has is merged in. */
export async function confirmEmail(token: string): Promise<boolean> {
  const data = await ask('/api/email/confirm', { token })
  if (data.ok) void syncNow()
  return !!data.ok
}
/** "Continue with my email": the server sends a six-digit code there. The same call for a new account and an old one. */
export async function requestCode(email: string): Promise<'sent' | 'bad' | 'slow' | 'network'> {
  const data = await ask('/api/account', { email })
  return data.ok ? 'sent' : data.error === 'email' ? 'bad' : data.error === 'slow' ? 'slow' : 'network'
}
/** The code from the email. Right: this device is in that account, and what it already had is merged in. */
export async function enterCode(email: string, code: string): Promise<'ok' | 'wrong' | 'expired' | 'network'> {
  const data = await ask('/api/account/code', { email, code })
  if (data.ok) { void syncNow(); return 'ok' }
  return data.error === 'code' ? 'wrong' : data.error === 'expired' ? 'expired' : 'network'
}
/** Sign out here: the device forgets the list, which stays in the account. Whatever was not sent yet goes first. */
export async function signOut(): Promise<void> {
  if (inflight) await inflight
  if (!off()) {
    if (needsSend(getState())) await syncNow()
    try {
      const token = read(TOKEN_KEY)
      await fetch(API + '/api/logout', {
        method: 'POST', credentials: API ? 'include' : 'same-origin', body: '{}',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : null) },
      })
    } catch { /* offline: the device is still cleared below */ }
  }
  write(TOKEN_KEY, null)
  actions.reset()
  setStatus('idle')
}
/** Start the Premium payment: the server opens a Stripe Checkout for this person and answers with its address. */
export async function startCheckout(): Promise<string | null> {
  const data = await ask('/api/pay')
  if (!data.ok || !data.url) return null
  setState({ payAt: Date.now() }, { remote: true })
  return data.url
}
/** Ask the server whether the payment went through. True when this person (or their partner) is Premium. */
export async function checkPaid(): Promise<boolean> {
  const data = await ask('/api/pay/check')
  const premium = data.ok === true && data.plan === 'premium'
  if (premium) setState({ payAt: 0 }, { remote: true })
  return premium
}

/** Stop using the address: from the app (no key) or from the link at the foot of an email. */
export async function removeEmail(key?: string): Promise<boolean> {
  const data = await ask('/api/email/off', key ? { key } : {})
  if (data.ok && !key) setState({ email: null }, { remote: true })
  return !!data.ok
}

// ───────── the vote for family and friends ─────────
export async function openPoll(names: [number, string][]): Promise<Poll | null> {
  const data = await ask('/api/poll', { names })
  return data.ok && data.poll ? data.poll : null
}
/** `undefined` means the server could not be reached; `null` that there is no poll. */
export async function myPoll(): Promise<Poll | null | undefined> {
  const data = await ask('/api/poll/mine')
  return data.ok ? data.poll ?? null : undefined
}
export async function closePoll(): Promise<boolean> {
  return !!(await ask('/api/poll/close')).ok
}

/** Delete everything: the copy on the server and what is on this device. */
export async function forgetAll(): Promise<void> {
  if (inflight) await inflight
  if (!off() && (read(TOKEN_KEY) || hasMarker())) {
    try {
      const token = read(TOKEN_KEY)
      await fetch(API + '/api/forget', {
        method: 'POST', credentials: API ? 'include' : 'same-origin', body: '{}',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : null) },
      })
    } catch { /* offline: the device is still wiped below */ }
  }
  write(TOKEN_KEY, null)
  actions.reset()
  setStatus('idle')
}

// ───────── usage counters ─────────
// No person and no device in them: only "this happened once more today". Sent in one go when the app is left.
// Google Analytics gets the same event when the visitor accepted it.
export function track(name: string, once = false) {
  if (typeof window === 'undefined' || read(OFF_KEY) === '1') return
  if (once) {
    if (getState().once[name]) return
    setState(s => ({ once: { ...s.once, [name]: 1 } }), { remote: true })
  }
  counts[name] = (counts[name] || 0) + 1
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (gtag) gtag('event', name, { app_lang: lang })
}
function flushEvents() {
  const names = Object.keys(counts)
  if (!names.length || off()) return
  const body = JSON.stringify({ ev: { ...counts }, lang })
  for (const k of names) delete counts[k]
  try {
    if (!navigator.sendBeacon || !navigator.sendBeacon(API + '/api/e', body)) {
      void fetch(API + '/api/e', { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
    }
  } catch { /* counters are best effort */ }
}
