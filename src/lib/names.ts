import 'server-only'
import master from '@/data/master.json'
import { LOCALES, LOCALE_CULTURES, type Locale } from '@/i18n/config'
import { type N, type Culture, type Fame, type Gender, type Root, type Tag, firstLetter } from './model'

type Master = {
  id: number; slug: string; f: Record<string, string>; g: Record<string, string>; root: string
  c: string[]; p: number; t: string[]; s: number; m: Record<string, string>
  k?: string[]; r?: Record<string, [number, number, 'f' | 'm']>
}
const MASTER = master as unknown as Master[]

const cache = new Map<Locale, { all: N[]; bySlug: Map<string, N>; byLetter: Map<string, N[]> }>()

function build(l: Locale) {
  const native = LOCALE_CULTURES[l]
  const all: N[] = MASTER.map(e => ({
    id: e.id, slug: e.slug, name: e.f[l] || e.f._, g: (e.g[l] || e.g._) as Gender, root: e.root as Root,
    cultures: [...e.c.filter(c => native.includes(c)), ...e.c.filter(c => !native.includes(c))] as Culture[], pop: e.p, tags: e.t as Tag[], syl: e.s, meaning: e.m[l],
    fit: e.c.includes('intl') || e.c.some(c => native.includes(c)), home: e.c.some(c => native.includes(c)),
    fame: (e.k || []) as Fame[], rank: e.r?.[l]?.[0] || 0, rise: e.r?.[l]?.[1] || 0, rankG: e.r?.[l]?.[2] || '',
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

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const VOWEL = /[aeiouy]/
/** Two spellings of one name, or near enough that a family would not use both (Lucía / Lucio, Ana / Anna). */
const tooClose = (a: string, b: string) => a.slice(0, 4) === b.slice(0, 4) || (a.length > 3 && b.length > 3 && a.slice(0, 3) === b.slice(0, 3) && a.slice(-2) === b.slice(-2))

/**
 * Names for a brother or a sister: the same world as this one (culture, style, how common it is) but clearly a
 * different name, starting with another letter. Deterministic, so a page says the same thing on every build.
 */
export function siblingNames(l: Locale, n: N, each = 5): { sisters: N[]; brothers: N[] } {
  const me = fold(n.name)
  const pick = (g: Gender) => {
    const scored: [number, N][] = []
    for (const o of data(l).all) {
      if (o.id === n.id || o.g !== g || !o.fit) continue
      const other = fold(o.name)
      if (other[0] === me[0] || tooClose(me, other) || other.slice(-3) === me.slice(-3)) continue
      const shared = o.tags.filter(t => n.tags.includes(t)).length
      let s = shared * 1.5
      if (o.cultures[0] === n.cultures[0]) s += 3
      else if (o.cultures.some(c => c !== 'intl' && n.cultures.includes(c))) s += 1.5
      if (s < 3) continue
      s += 1.5 - Math.abs(o.pop - n.pop) * 0.9 + (Math.abs(o.syl - n.syl) <= 1 ? 0.5 : 0) + (o.home ? 0.5 : 0) + o.pop * 0.1
      scored.push([s, o])
    }
    return scored.sort((a, b) => b[0] - a[0] || a[1].slug.localeCompare(b[1].slug)).slice(0, each).map(x => x[1])
  }
  return { sisters: pick('f'), brothers: pick('m') }
}

/**
 * Second names that sit well after this one. What makes a pair easy to say: a different length, no rhyme, and no
 * vowel running into the same vowel ("Ana Alba"). Well-known names are preferred: a second name is rarely the odd one.
 */
export function middleNames(l: Locale, n: N, limit = 8): N[] {
  if (n.g === 'u') return []
  const me = fold(n.name)
  const last = me[me.length - 1]
  const scored: [number, N][] = []
  for (const o of data(l).all) {
    if (o.id === n.id || o.g !== n.g || !o.home || o.pop < 3) continue
    const other = fold(o.name)
    if (/[\s-]/.test(o.name) || tooClose(me, other) || other.slice(-2) === me.slice(-2)) continue
    if (other[0] === last && VOWEL.test(last)) continue
    let s = o.pop * 0.6
    if (o.syl !== n.syl) s += 1.5
    if ((n.syl <= 2 && o.syl >= 3) || (n.syl >= 3 && o.syl <= 2)) s += 1
    if (other[0] !== me[0]) s += 0.5
    if (VOWEL.test(last) !== VOWEL.test(other[0])) s += 0.75 // a consonant meeting a vowel links the two
    s += o.tags.filter(t => n.tags.includes(t)).length * 0.5 + (o.cultures[0] === n.cultures[0] ? 1 : 0) + (o.tags.includes('classic') ? 0.5 : 0)
    scored.push([s, o])
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].slug.localeCompare(b[1].slug)).slice(0, limit).map(x => x[1])
}
