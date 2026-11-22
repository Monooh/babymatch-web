import 'server-only'
import master from '@/data/master.json'
import { LOCALES, LOCALE_CULTURES, type Locale } from '@/i18n/config'
import { type N, type Culture, type Gender, type Root, type Tag, firstLetter } from './model'

type Master = {
  id: number; slug: string; f: Record<string, string>; g: Record<string, string>; root: string
  c: string[]; p: number; t: string[]; s: number; m: Record<string, string>
}
const MASTER = master as unknown as Master[]

const cache = new Map<Locale, { all: N[]; bySlug: Map<string, N>; byLetter: Map<string, N[]> }>()

function build(l: Locale) {
  const native = LOCALE_CULTURES[l]
  const all: N[] = MASTER.map(e => ({
    id: e.id, slug: e.slug, name: e.f[l] || e.f._, g: (e.g[l] || e.g._) as Gender, root: e.root as Root,
    cultures: [...e.c.filter(c => native.includes(c)), ...e.c.filter(c => !native.includes(c))] as Culture[], pop: e.p, tags: e.t as Tag[], syl: e.s, meaning: e.m[l],
    fit: e.c.includes('intl') || e.c.some(c => native.includes(c)), home: e.c.some(c => native.includes(c)),
  }))
  const bySlug = new Map(all.map(n => [n.slug, n]))
  const byLetter = new Map<string, N[]>()
  for (const n of all) {
    const k = firstLetter(n.name)
    if (!byLetter.has(k)) byLetter.set(k, [])
    byLetter.get(k)!.push(n)
  }
  for (const arr of byLetter.values()) arr.sort((a, b) => a.name.localeCompare(b.name, l))
  return { all, bySlug, byLetter }
}
function data(l: Locale) {
  if (!cache.has(l)) cache.set(l, build(l))
  return cache.get(l)!
}

export const allNames = (l: Locale) => data(l).all
export const getName = (l: Locale, slug: string) => data(l).bySlug.get(slug)
export const namesByLetter = (l: Locale) => data(l).byLetter
export const nameCount = () => MASTER.length

/** Every spelling a name takes across the site's languages, e.g. Lucía / Lucia. */
export function otherForms(slug: string, l: Locale): string[] {
  const e = MASTER.find(x => x.slug === slug)
  if (!e) return []
  const mine = e.f[l] || e.f._
  return [...new Set([e.f._, ...LOCALES.map(x => e.f[x]).filter(Boolean)])].filter(f => f !== mine)
}

/** Names that feel close: same gender, sharing culture, tags or root; best known first. */
export function similarNames(l: Locale, n: N, limit = 12): N[] {
  const scored: [number, N][] = []
  for (const o of data(l).all) {
    if (o.id === n.id) continue
    if (o.g !== n.g && o.g !== 'u' && n.g !== 'u') continue
    let s = 0
    if (o.cultures[0] === n.cultures[0]) s += 3
    else if (o.cultures.some(c => c !== 'intl' && n.cultures.includes(c))) s += 1.5
    s += o.tags.filter(t => n.tags.includes(t)).length * 1.5
    if (o.root === n.root) s += 0.5
    if (firstLetter(o.name) === firstLetter(n.name)) s += 0.5
    if (Math.abs(o.syl - n.syl) <= 1) s += 0.5
    if (s >= 3.5) scored.push([s + o.pop * 0.2 - Math.abs(o.pop - n.pop) * 0.3, o])
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].slug.localeCompare(b[1].slug)).slice(0, limit).map(x => x[1])
}

/** True when the name's main culture is one of the language's own. */
const native = (l: Locale, n: N) => LOCALE_CULTURES[l].includes(n.cultures[0])

export function topNames(l: Locale, g: Gender, limit: number): N[] {
  return data(l).all.filter(n => n.home && n.g === g && n.pop >= 4)
    .sort((a, b) => Number(native(l, b)) - Number(native(l, a)) || b.pop - a.pop || a.slug.localeCompare(b.slug)).slice(0, limit)
}
