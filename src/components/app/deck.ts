import { firstLetter, matchList, nameLength, type N } from '@/lib/model'
import type { Filters, Quiz, State } from '@/lib/store'

export function lenBucket(n: N): 'short' | 'medium' | 'long' {
  const len = nameLength(n.name)
  return len <= 4 ? 'short' : len >= 9 ? 'long' : 'medium'
}
export function popBucket(n: N): 'popular' | 'middle' | 'rare' {
  return n.pop >= 4 ? 'popular' : n.pop === 3 ? 'middle' : 'rare'
}

export function passes(n: N, f: Filters, list: string | null): boolean {
  if (f.g.length && !f.g.includes(n.g)) return false
  if (list) return matchList(list, n) // a list is its own scope: only the gender filter still applies
  if (f.cultures.length) { if (!n.cultures.some(c => f.cultures.includes(c))) return false }
  else if (f.nativeOnly && !n.fit) return false
  if (f.tags.length && !n.tags.some(t => f.tags.includes(t))) return false
  if (f.letters.length && !f.letters.includes(firstLetter(n.name))) return false
  if (f.len.length && !f.len.includes(lenBucket(n))) return false
  if (f.pop.length && !f.pop.includes(popBucket(n))) return false
  return true
}

export function activeCount(f: Filters): number {
  return f.g.length + f.cultures.length + f.tags.length + f.letters.length + f.len.length + f.pop.length
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Unswiped names in the order they will be dealt: taste first, a partner's likes sprinkled early, the rest shuffled. */
export function buildDeck(names: N[], s: State, seed: number, firstSlug?: string | null): N[] {
  const rand = mulberry(seed)
  const q: Quiz | null = s.quiz
  const partner = new Set(s.partner?.likes || [])
  const scored: [number, N][] = []
  for (const n of names) {
    if (s.likes[n.id] || s.nopes[n.id]) continue
    if (!passes(n, s.filters, s.list)) continue
    let score = rand() * 4 + n.pop * 0.35 + (n.home ? 2 : n.fit ? 1 : 0)
    if (q) {
      score += n.tags.filter(t => q.styles.includes(t)).length * 1.8
      const len = nameLength(n.name)
      if (q.length === 'short') score += len <= 5 ? 1.5 : len >= 8 ? -1.5 : 0
      if (q.length === 'long') score += len >= 7 ? 1.5 : len <= 4 ? -1.5 : 0
      if (q.pop === 'popular') score += (n.pop - 3) * 1.2
      if (q.pop === 'rare') score += (3 - n.pop) * 1.2
    }
    if (partner.has(n.id)) score += 3.5
    if (firstSlug && n.slug === firstSlug) score += 1000
    scored.push([score, n])
  }
  scored.sort((a, b) => b[0] - a[0])
  return scored.map(x => x[1])
}
