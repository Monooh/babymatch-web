import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOCALES, type Locale } from '@/i18n/config'

// Official figures per name, one file per country (scripts/fetch-stats.mjs): how many people carry it, how old they
// are, where they live, and how its use moved over the decades. Only what the statistics offices publish.
// A country's file is named after the site language of that country: es Spain, en United States, fr France, it Italy.

type Raw = {
  n: number; age?: number; rank?: number; rate?: number
  byDecade?: Record<string, number>; byYear?: Record<string, number>
  top?: [string, number, number?][]; topRate?: [string, number, number][]
  peak?: [number, number]; last?: [number, number, number?]
}
type File = { source: string; url: string; asOf: string; license: string; names: Record<string, Raw | { f?: Raw; m?: Raw }> }

export type NameStats = {
  country: Locale
  /** `residents`: people alive with the name today. `births`: babies given the name since `since`. */
  kind: 'residents' | 'births'
  n: number
  age?: number
  rank?: number
  rate?: number // bearers per 1,000 of that sex
  since?: number
  peak?: [year: number, births: number]
  last?: [year: number, births: number]
  decades: [label: string, n: number][]
  top: [place: string, n: number, rate?: number][]
  topRate: [place: string, n: number, rate: number][]
  source: string; url: string; asOf: string; license: string
}

/** The first year each births file covers. */
const SINCE: Partial<Record<Locale, number>> = { en: 1880, fr: 1900, it: 1999 }

const files = new Map<Locale, File | null>()
function file(country: Locale): File | null {
  if (!files.has(country)) {
    const path = join(process.cwd(), 'data/stats', `${country}.json`)
    files.set(country, existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as File) : null)
  }
  return files.get(country)!
}

function decadesOf(raw: Raw): [string, number][] {
  if (raw.byDecade) {
    // "<1930" sorts first; the rest are the decades in order.
    return Object.entries(raw.byDecade).sort((a, b) => (a[0][0] === '<' ? -1 : b[0][0] === '<' ? 1 : Number(a[0]) - Number(b[0])))
      .map(([k, n]) => [k[0] === '<' ? '< ' + k.slice(1) : k, n])
  }
  if (raw.byYear) {
    const by = new Map<number, number>()
    for (const [y, n] of Object.entries(raw.byYear)) { const d = Math.floor(Number(y) / 10) * 10; by.set(d, (by.get(d) || 0) + n) }
    // A decade the file only catches the tail of (1999 alone) would read as a slump: leave it out.
    const first = Math.min(...Object.keys(raw.byYear).map(Number))
    return [...by].filter(([d]) => d >= first).sort((a, b) => a[0] - b[0]).map(([d, n]) => [String(d), n])
  }
  return []
}

function one(country: Locale, slug: string): NameStats | null {
  const f = file(country)
  const entry = f?.names[slug]
  if (!f || !entry) return null
  // A unisex name has a figure per sex: the page speaks of the larger group.
  const raw = ('n' in entry ? entry : [entry.f, entry.m].filter((x): x is Raw => !!x).sort((a, b) => b.n - a.n)[0]) as Raw | undefined
  if (!raw || !raw.n) return null
  const since = SINCE[country]
  return {
    country, kind: since ? 'births' : 'residents', n: raw.n, age: raw.age, rank: since ? undefined : raw.rank, rate: raw.rate, since,
    peak: raw.peak, last: raw.last ? [raw.last[0], raw.last[1]] : undefined,
    decades: decadesOf(raw), top: raw.top || [], topRate: raw.topRate || [],
    source: f.source, url: f.url, asOf: f.asOf, license: f.license,
  }
}

/** Figures for a name: the reader's own country first (when it has a file), then the others, largest first. */
export function statsFor(l: Locale, slug: string): NameStats[] {
  const all = LOCALES.map(c => one(c, slug)).filter((x): x is NameStats => !!x)
  return all.sort((a, b) => Number(b.country === l) - Number(a.country === l) || b.n - a.n)
}
