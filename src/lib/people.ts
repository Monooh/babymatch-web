import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import fameData from '@/data/fame.json'
import officialData from '@/data/official.json'
import { LOCALES, type Locale } from '@/i18n/config'
import type { Fame } from './model'

// Real-world data layered on the names: well-known bearers (Wikidata) and national rankings (statistics offices).
// Both are optional; a name without them simply shows less.

type Stored = { id: string; links?: number; b?: number | null; d?: number | null; k?: string[]; l: Record<string, string>; t: Record<string, string>; w: Record<string, string> }
export type Person = { id: string; name: string; about: string; years: string; url: string | null }

// Read from disk rather than imported: it is large, and only the name pages need it while the site is built.
let people: Record<string, Stored[]> | null = null
function allPeople() {
  if (!people) {
    const path = join(process.cwd(), 'data/people.json')
    people = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
  }
  return people!
}

function show(p: Stored, l: Locale): Person | null {
  const name = p.l[l] || p.l.en || Object.values(p.l)[0]
  if (!name) return null
  const title = p.w[l] // a Wikipedia article in the reader's language, or no link at all
  const years = p.b ? (p.d ? `${p.b}–${p.d}` : `${p.b}`) : ''
  return {
    id: p.id, name, about: p.t[l] || '', years,
    url: title ? `https://${l}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` : null,
  }
}

/** Well-known people who go by this name; those described in the reader's language come first. */
export function famousNamed(l: Locale, slug: string, limit = 6): Person[] {
  const list = (allPeople()[slug] || []).map(p => show(p, l)).filter((p): p is Person => !!p)
  return [...list.filter(p => p.about), ...list.filter(p => !p.about)].slice(0, limit)
}

const FAME = fameData as unknown as Record<string, Partial<Record<Fame, Stored>>>
/** The best-known person of a kind who bears this name: the "like MrBeast" under a name on a list of youtubers. */
export function fameExample(l: Locale, slug: string, kind: Fame): Person | null {
  const p = FAME[slug]?.[kind]
  return p ? show(p, l) : null
}

type Official = { source: string; url: string; secondary: boolean; year: number; prevYear: number | null; f: [string, number, number][]; m: [string, number, number][] }
const OFFICIAL = officialData as unknown as Partial<Record<Locale, Official>>
export const officialFor = (country: Locale) => OFFICIAL[country]

export type RankRow = { country: Locale; g: 'f' | 'm'; rank: number; prev: number; year: number; prevYear: number | null }
const ranks = new Map<string, RankRow[]>()
for (const country of LOCALES) {
  const o = OFFICIAL[country]
  if (!o) continue
  for (const g of ['f', 'm'] as const) for (const [slug, rank, prev] of o[g]) {
    if (!ranks.has(slug)) ranks.set(slug, [])
    ranks.get(slug)!.push({ country, g, rank, prev, year: o.year, prevYear: o.prevYear })
  }
}
/** Where a name stands in each country's latest ranking; the reader's own country first. */
export function ranksFor(l: Locale, slug: string): RankRow[] {
  return [...(ranks.get(slug) || [])].sort((a, b) => (a.country === l ? -1 : b.country === l ? 1 : 0) || a.rank - b.rank)
}
