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
export type Partner = { name: string; likes: number[]; at: number }
export type State = {
  v: 1
  quiz: Quiz | null
  quizSkipped: boolean
  likes: Record<number, number> // id → timestamp
  nopes: Record<number, number>
  stars: number[]
  filters: Filters
  list: string | null
  me: string
  surname: string
  partner: Partner | null
}

export const EMPTY_FILTERS: Filters = { g: [], cultures: [], tags: [], letters: [], len: [], pop: [], nativeOnly: true }
const INITIAL: State = {
  v: 1, quiz: null, quizSkipped: false, likes: {}, nopes: {}, stars: [], filters: EMPTY_FILTERS, list: null, me: '', surname: '', partner: null,
}
const KEY = 'babymatch:v1'

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
      if (parsed && parsed.v === 1) state = { ...INITIAL, ...parsed, filters: { ...EMPTY_FILTERS, ...(parsed.filters || {}) } }
    }
  } catch { /* private mode or corrupt data: start fresh */ }
}
function persist() {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full or blocked */ }
}

export function getState(): State { load(); return state }
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  load()
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  persist()
  listeners.forEach(fn => fn())
}
function subscribe(fn: () => void) {
  load()
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { loaded = false; load(); fn() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage) }
}
export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, () => INITIAL)
}

export const actions = {
  like(id: number) {
    setState(s => { const nopes = { ...s.nopes }; delete nopes[id]; return { likes: { ...s.likes, [id]: Date.now() }, nopes } })
  },
  nope(id: number) {
    setState(s => {
      const likes = { ...s.likes }; delete likes[id]
      return { nopes: { ...s.nopes, [id]: Date.now() }, likes, stars: s.stars.filter(x => x !== id) }
    })
  },
  unswipe(id: number) {
    setState(s => {
      const likes = { ...s.likes }; delete likes[id]
      const nopes = { ...s.nopes }; delete nopes[id]
      return { likes, nopes, stars: s.stars.filter(x => x !== id) }
    })
  },
  toggleStar(id: number) {
    setState(s => ({ stars: s.stars.includes(id) ? s.stars.filter(x => x !== id) : [...s.stars, id] }))
  },
  clearNopes() { setState({ nopes: {} }) },
  reset() { setState({ ...INITIAL }) },
}
