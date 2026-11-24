import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HREFLANG, type Locale } from '@/i18n/config'
import type { N } from './model'
import { allNames, getName } from './names'

// Name days: for each name, the feast day of the best-known saints who go by it (scripts/fetch-saints.mjs, Wikidata).
// Optional like the rest of the real-world data: a name without a saint simply has no name day.

type Stored = { id: string; day: string; links?: number; l: Record<string, string>; t: Record<string, string>; w: Record<string, string> }
export type Saint = { id: string; month: number; day: number; date: string; name: string; about: string; url: string | null }

type Fixes = { day?: Record<string, string>; first?: Record<string, string> }
let saints: Record<string, Stored[]> | null = null
function all() {
  if (!saints) {
    const read = (file: string) => { const path = join(process.cwd(), 'data', file); return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {} }
    const data = read('saints.json') as Record<string, Stored[]>
    // A short list of hand corrections (data/saints-fixes.json): a wrong day, or the saint a name day really follows.
    const fixes = read('saints-fixes.json') as Fixes
    const byId = new Map<string, Stored>()
    for (const rows of Object.values(data)) for (const r of rows) { if (fixes.day?.[r.id]) r.day = fixes.day[r.id]; if (!byId.has(r.id)) byId.set(r.id, r) }
    for (const [slug, id] of Object.entries(fixes.first || {})) {
      const saint = byId.get(id) // may be filed under another name: Francis Xavier under Francisco
      if (saint) data[slug] = [saint, ...(data[slug] || []).filter(r => r.id !== id)]
    }
    saints = data
  }
  return saints!
}

/** "13 de diciembre", "December 13", "13. Dezember"… (2024 is a leap year, so 29 February exists.) */
export const dayLabel = (l: Locale, month: number, day: number) => {
  const label = new Intl.DateTimeFormat(HREFLANG[l], { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, month - 1, day)))
  return l === 'fr' && day === 1 ? label.replace(/^1 /, '1er ') : label // French writes the first of the month "1er mars"
}
export const monthName = (l: Locale, month: number) =>
  new Intl.DateTimeFormat(HREFLANG[l], { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, month - 1, 1)))
/** The month as it appears in a URL: "diciembre", "fevrier", "marz". */
export const monthSlug = (l: Locale, month: number) => monthName(l, month).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')
export const monthFromSlug = (l: Locale, slug: string) => { for (let m = 1; m <= 12; m++) if (monthSlug(l, m) === slug) return m; return 0 }
/** The day as people type it in a search: "19-de-marzo", "march-19", "1er-mars", "19-maerz". German spells out its umlaut. */
export const daySlug = (l: Locale, month: number, day: number) => {
  const label = dayLabel(l, month, day).toLowerCase()
  return (l === 'de' ? label.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue') : label).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
const daySlugs = new Map<Locale, Map<string, { month: number; day: number }>>()
export function dayFromSlug(l: Locale, slug: string): { month: number; day: number } | null {
  if (!daySlugs.has(l)) {
    const map = new Map<string, { month: number; day: number }>()
    for (let month = 1; month <= 12; month++) {
      const last = new Date(Date.UTC(2024, month, 0)).getUTCDate()
      for (let day = 1; day <= last; day++) map.set(daySlug(l, month, day), { month, day })
    }
    daySlugs.set(l, map)
  }
  return daySlugs.get(l)!.get(slug) || null
}

function show(p: Stored, l: Locale): Saint | null {
  const m = /^(\d\d)-(\d\d)$/.exec(p.day)
  const name = p.l[l] || p.l.en || Object.values(p.l)[0]
  if (!m || !name) return null
  const month = Number(m[1]), day = Number(m[2])
  const title = p.w[l]
  return { id: p.id, month, day, date: dayLabel(l, month, day), name, about: p.t[l] || '', url: title ? `https://${l}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` : null }
}

/** The saints a name is celebrated for, the best known first. The first one gives the name its day. */
export function nameDays(l: Locale, slug: string): Saint[] {
  return (all()[slug] || []).map(p => show(p, l)).filter((x): x is Saint => !!x)
}

export type CalendarDay = { day: number; date: string; names: { n: N; saint: Saint }[] }
const calendars = new Map<Locale, CalendarDay[][]>()
/** Every name usable in this language, on the day of its best-known saint. Index 0 is January. */
export function calendar(l: Locale): CalendarDay[][] {
  if (!calendars.has(l)) {
    const months: Map<number, { n: N; saint: Saint }[]>[] = Array.from({ length: 12 }, () => new Map())
    for (const n of allNames(l)) {
      if (!n.fit) continue
      const saint = nameDays(l, n.slug)[0]
      if (!saint) continue
      const days = months[saint.month - 1]
      if (!days.has(saint.day)) days.set(saint.day, [])
      days.get(saint.day)!.push({ n, saint })
    }
    calendars.set(l, months.map((days, i) => [...days].sort((a, b) => a[0] - b[0]).map(([day, names]) => ({
      day, date: dayLabel(l, i + 1, day),
      names: names.sort((a, b) => Number(b.n.home) - Number(a.n.home) || b.n.pop - a.n.pop || a.n.name.localeCompare(b.n.name)),
    }))))
  }
  return calendars.get(l)!
}
export const monthCount = (l: Locale, month: number) => calendar(l)[month - 1].reduce((acc, d) => acc + d.names.length, 0)

export type DaySaint = { saint: Saint; names: N[] }
const byDay = new Map<Locale, Map<string, DaySaint[]>>()
function dayIndex(l: Locale) {
  if (!byDay.has(l)) {
    const found = new Map<string, Map<string, DaySaint & { links: number }>>()
    for (const [slug, rows] of Object.entries(all())) {
      const n = getName(l, slug)
      for (const p of rows) {
        const saint = show(p, l)
        if (!saint) continue
        const key = `${saint.month}-${saint.day}`
        if (!found.has(key)) found.set(key, new Map())
        const day = found.get(key)!
        if (!day.has(p.id)) day.set(p.id, { saint, names: [], links: p.links || 0 })
        if (n) day.get(p.id)!.names.push(n)
      }
    }
    const index = new Map<string, DaySaint[]>()
    for (const [key, day] of found) {
      index.set(key, [...day.values()].sort((a, b) => b.links - a.links || a.saint.name.localeCompare(b.saint.name, l)).map(({ saint, names }) => ({
        saint, names: names.sort((a, b) => Number(b.fit) - Number(a.fit) || Number(b.home) - Number(a.home) || b.pop - a.pop || a.name.localeCompare(b.name, l)),
      })))
    }
    byDay.set(l, index)
  }
  return byDay.get(l)!
}
/** Every saint in the data whose feast falls on this day, the best known first, each with the names it is filed under. */
export const saintsOn = (l: Locale, month: number, day: number): DaySaint[] => dayIndex(l).get(`${month}-${day}`) || []
/** The names whose own day this is: the same ones the month page lists under the date. */
export const namesOn = (l: Locale, month: number, day: number) => calendar(l)[month - 1].find(x => x.day === day)?.names || []
/** The days that have a page of their own, in calendar order: those with at least one saint in the data. */
export function dayPages(l: Locale): { month: number; day: number }[] {
  return [...dayIndex(l).keys()].map(k => { const [month, day] = k.split('-').map(Number); return { month, day } }).sort((a, b) => a.month - b.month || a.day - b.day)
}
export const hasDayPage = (l: Locale, month: number, day: number) => dayIndex(l).has(`${month}-${day}`)
