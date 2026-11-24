'use client'
import { useSyncExternalStore } from 'react'
import type { Culture, Gender, Tag } from './model'

export type Quiz = {
  gender: 'f' | 'm' | 'any'
  styles: Tag[]
  origin: 'mine' | 'all' | 'pick'
  length: 'short' | 'any' | 'long'
  pop: 'popular' | 'any' | 'rare'
}
export type Filters = {
  g: Gender[]; cultures: Culture[]; tags: Tag[]; letters: string[]
  len: ('short' | 'medium' | 'long')[]; pop: ('popular' | 'middle' | 'rare')[]; nativeOnly: boolean
}
/** `id` is set when the partner is joined through the server (live); without it, it is a list imported from an old link. */
export type Partner = { name: string; likes: number[]; supers?: number[]; at: number; id?: string; rev?: number; final?: Final }
/** The final round, one per person: how each name fared head to head ([rating, duels played]) and the one they would pick. */
export type Final = { duel: Record<number, [number, number]>; pick: number | null }
export const EMPTY_FINAL: Final = { duel: {}, pick: null }
export type State = {
  v: 1
  quiz: Quiz | null
  quizSkipped: boolean
  likes: Record<number, number> // id → time of the answer
  nopes: Record<number, number>
  stars: number[]               // the likes that are superlikes
  filters: Filters
  list: string | null
  me: string
  surname: string
  partner: Partner | null
  // What follows keeps the list safe on the server (src/lib/sync.ts). The device stays the working copy.
  gone: Record<number, number>  // answers taken back (undo, "see again"), so that reaches the other devices too
  dirty: Record<number, 1>      // names whose current answer the server has not confirmed
  rev: number                   // the server revision this device last merged
  prefsAt: number               // when the opening answers or filters last changed
  prefsDirty: boolean
  uid: string | null
  invite: string | null         // my code for a partner to join
  pending: { code: string; name: string } | null // an invitation opened but not answered or not yet through
  seen: number[]                // matches already announced
  once: Record<string, 1>       // one-off usage events already counted
  final: Final
  finalAt: number               // when the final round last changed here
  finalDirty: boolean
  mail: boolean                 // the server can send email (otherwise the app does not mention it)
  email: [address: string, confirmed: 0 | 1] | null
}

export const EMPTY_FILTERS: Filters = { g: [], cultures: [], tags: [], letters: [], len: [], pop: [], nativeOnly: true }
const INITIAL: State = {
  v: 1, quiz: null, quizSkipped: false, likes: {}, nopes: {}, stars: [], filters: EMPTY_FILTERS, list: null, me: '', surname: '', partner: null,
  gone: {}, dirty: {}, rev: 0, prefsAt: 0, prefsDirty: false, uid: null, invite: null, pending: null, seen: [], once: {},
  final: EMPTY_FINAL, finalAt: 0, finalDirty: false, mail: false, email: null,
}
const KEY = 'babymatch:v1'
/** What travels to the server as "preferences": losing a device should not mean answering the questions again. */
const PREFS = ['quiz', 'quizSkipped', 'filters', 'surname', 'me'] as const

let state: State = INITIAL
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.v === 1) {
        state = { ...INITIAL, ...parsed, filters: { ...EMPTY_FILTERS, ...(parsed.filters || {}) } }
        // A list from before the server copy existed: everything in it still has to be sent.
        if (!('dirty' in parsed)) state = { ...state, dirty: allDirty(state), prefsDirty: !!(state.quiz || state.quizSkipped), prefsAt: state.quiz || state.quizSkipped ? Date.now() : 0 }
      }
    }
  } catch { /* private mode or corrupt data: start fresh */ }
}
function persist() {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full or blocked */ }
}

export function getState(): State { load(); return state }
/** `remote` marks a change that came from the server: it must not be sent back as if the person had made it. */
export function setState(patch: Partial<State> | ((s: State) => Partial<State>), opts?: { remote?: boolean }) {
  load()
  const p = typeof patch === 'function' ? patch(state) : patch
  const touchesPrefs = !opts?.remote && PREFS.some(k => k in p && p[k] !== state[k])
  const touchesFinal = !opts?.remote && 'final' in p && p.final !== state.final
  state = { ...state, ...p, ...(touchesPrefs ? { prefsAt: Date.now(), prefsDirty: true } : null), ...(touchesFinal ? { finalAt: Date.now(), finalDirty: true } : null) }
  persist()
  listeners.forEach(fn => fn())
}
export function subscribe(fn: () => void) {
  load()
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { loaded = false; load(); fn() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage) }
}
export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, () => INITIAL)
}

// ───────── one answer per name: [kind, time] ─────────
export const NO = 0, LIKE = 1, SUPER = 2, CLEARED = 3
export type Entry = [kind: number, at: number]
export type Op = [id: number, kind: number, at: number]

export function entryOf(s: State, id: number, stars?: Set<number>): Entry | null {
  if (s.likes[id]) return [(stars ? stars.has(id) : s.stars.includes(id)) ? SUPER : LIKE, s.likes[id]]
  if (s.nopes[id]) return [NO, s.nopes[id]]
  if (s.gone[id]) return [CLEARED, s.gone[id]]
  return null
}
/** Newest wins; at the very same instant the stronger answer wins. The server applies the same rule. */
export const newer = (kind: number, at: number, cur: Entry | null) => !cur || at > cur[1] || (at === cur[1] && kind > cur[0])

function allDirty(s: State): Record<number, 1> {
  const d: Record<number, 1> = {}
  for (const id in s.likes) d[id] = 1
  for (const id in s.nopes) d[id] = 1
  for (const id in s.gone) d[id] = 1
  return d
}
export const markAllDirty = () => setState(s => ({ dirty: allDirty(s), prefsDirty: s.prefsAt > 0, finalDirty: s.finalAt > 0 }), { remote: true })

/** Put answers into the four maps. Used for a person's own swipes and for what arrives from the server. */
function withEntries(s: State, entries: Op[]): Pick<State, 'likes' | 'nopes' | 'stars' | 'gone'> {
  const likes = { ...s.likes }, nopes = { ...s.nopes }, gone = { ...s.gone }
  const stars = new Set(s.stars)
  for (const [id, kind, at] of entries) {
    delete likes[id]; delete nopes[id]; delete gone[id]; stars.delete(id)
    if (kind === LIKE || kind === SUPER) { likes[id] = at; if (kind === SUPER) stars.add(id) }
    else if (kind === NO) nopes[id] = at
    else gone[id] = at
  }
  return { likes, nopes, stars: [...stars], gone }
}
function answer(ids: number[], kind: number) {
  const at = Date.now()
  setState(s => {
    const dirty = { ...s.dirty }
    for (const id of ids) dirty[id] = 1
    return { ...withEntries(s, ids.map(id => [id, kind, at] as Op)), dirty }
  })
}

/**
 * Merge a full list from the server into this device. Whatever is newer here stays and is queued to be sent, so
 * neither side can overwrite the other with something older.
 */
export function mergeRemote(s: State, remote: Op[]): Pick<State, 'likes' | 'nopes' | 'stars' | 'gone' | 'dirty'> {
  const stars = new Set(s.stars)
  const take: Op[] = []
  const dirty = { ...s.dirty }
  const seen = new Set<number>()
  for (const [id, kind, at] of remote) {
    seen.add(id)
    const cur = entryOf(s, id, stars)
    if (cur && cur[0] === kind && cur[1] === at) { delete dirty[id]; continue }
    if (newer(kind, at, cur)) { take.push([id, kind, at]); delete dirty[id] } else dirty[id] = 1
  }
  for (const id in allDirty(s)) if (!seen.has(Number(id))) dirty[id] = 1 // the server never heard of it
  return { ...withEntries(s, take), dirty }
}

export const actions = {
  like(id: number) { answer([id], LIKE) },
  superlike(id: number) { answer([id], SUPER) },
  nope(id: number) { answer([id], NO) },
  unswipe(id: number) { answer([id], CLEARED) },
  toggleStar(id: number) { answer([id], getState().stars.includes(id) ? LIKE : SUPER) },
  clearNopes() { answer(Object.keys(getState().nopes).map(Number), CLEARED) },
  /** Start over on this device. The copy on the server is deleted by the caller (sync.forget). */
  reset() { setState({ ...INITIAL }, { remote: true }) },
}
