import 'server-only'
import { type Locale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { listSlug, listTitle } from '@/i18n/taxonomy'
import { allListKeys, matchList, parseListKey, listOrder, type ListKey, type N } from './model'
import { allNames } from './names'

export type ListInfo = { key: ListKey; title: string; slug: string; count: number }
const MIN_NAMES = 8

const cache = new Map<Locale, { lists: ListInfo[]; bySlug: Map<string, ListInfo>; byKey: Map<string, ListInfo> }>()

function build(l: Locale) {
  const d = getDict(l)
  const names = allNames(l)
  const lists: ListInfo[] = []
  for (const key of allListKeys()) {
    const count = names.reduce((acc, n) => acc + (matchList(key, n) ? 1 : 0), 0)
    if (count < MIN_NAMES) continue
    lists.push({ key, title: listTitle(key, l, d), slug: listSlug(key, l, d), count })
  }
  return { lists, bySlug: new Map(lists.map(x => [x.slug, x])), byKey: new Map(lists.map(x => [x.key, x])) }
}
function data(l: Locale) {
  if (!cache.has(l)) cache.set(l, build(l))
  return cache.get(l)!
}

export const allLists = (l: Locale) => data(l).lists
export const listBySlug = (l: Locale, slug: string) => data(l).bySlug.get(slug)
export const listByKey = (l: Locale, key: ListKey) => data(l).byKey.get(key)
export const listNames = (l: Locale, key: ListKey): N[] => allNames(l).filter(n => matchList(key, n)).sort(listOrder(key))

export type ListGroup = 'gender' | 'popular' | 'famous' | 'origin' | 'style' | 'length' | 'letter'
export function groupOf(key: ListKey): ListGroup {
  const { kind } = parseListKey(key)
  return kind === 'g' ? 'gender' : kind === 'pop' || kind === 'y' ? 'popular' : kind === 'fame' ? 'famous' : kind === 'c' ? 'origin' : kind === 't' ? 'style'
    : kind === 'l' ? 'letter' : 'length'
}

/** Lists a name belongs to, the most specific and useful first. */
export function listsForName(l: Locale, n: N, limit = 10): ListInfo[] {
  const g = n.g === 'u' ? 'u' : n.g
  const keys: ListKey[] = []
  const gk = (base: string) => (g === 'u' ? base : `${base}:${g}`)
  if (n.rank) keys.push(gk('y:now'))
  if (n.rise) keys.push(gk('y:next'))
  for (const k of n.fame.slice(0, 2)) keys.push(gk(`fame:${k}`))
  for (const c of n.cultures.slice(0, 2)) keys.push(g === 'u' ? `c:${c}` : `c:${c}:${g}`)
  for (const tg of n.tags.slice(0, 3)) keys.push(g === 'u' ? `t:${tg}` : `t:${tg}:${g}`)
  keys.push(g === 'u' ? 'g:u' : `g:${g}`)
  return keys.map(k => listByKey(l, k)).filter((x): x is ListInfo => !!x && matchList(x.key, n)).slice(0, limit)
}

/** Neighbouring lists: same thing for the other gender, and siblings of the same kind. */
export function relatedLists(l: Locale, key: ListKey, limit = 8): ListInfo[] {
  const { kind, value, gender } = parseListKey(key)
  const out: ListKey[] = []
  if (kind !== 'g') {
    for (const g of ['f', 'm', ''] as const) { const k = g ? `${kind}:${value}:${g}` : `${kind}:${value}`; if (k !== key) out.push(k) }
  }
  const sameKind = allLists(l).filter(x => {
    const p = parseListKey(x.key)
    return p.kind === kind && p.value !== value && (p.gender || '') === (gender || '')
  }).sort((a, b) => b.count - a.count).map(x => x.key)
  const seen = new Set<string>()
  return [...out, ...sameKind].map(k => listByKey(l, k)).filter((x): x is ListInfo => !!x && !seen.has(x.key) && !!seen.add(x.key)).slice(0, limit)
}
