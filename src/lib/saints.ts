import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HREFLANG, type Locale } from '@/i18n/config'
import type { N } from './model'
import { allNames } from './names'

// Name days: for each name, the feast day of the best-known saints who go by it (scripts/fetch-saints.mjs, Wikidata).
// Optional like the rest of the real-world data: a name without a saint simply has no name day.

type Stored = { id: string; day: string; links?: number; l: Record<string, string>; t: Record<string, string>; w: Record<string, string> }
export type Saint = { id: string; month: number; day: number; date: string; name: string; about: string; url: string | null }

let saints: Record<string, Stored[]> | null = null
function all() {
  if (!saints) {
    const path = join(process.cwd(), 'data/saints.json')
    saints = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
  }
  return saints!
}

/** "13 de diciembre", "December 13", "13. Dezember"… (2024 is a leap year, so 29 February exists.) */
export const dayLabel = (l: Locale, month: number, day: number) =>
  new Intl.DateTimeFormat(HREFLANG[l], { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, month - 1, day)))
export const monthName = (l: Locale, month: number) =>
  new Intl.DateTimeFormat(HREFLANG[l], { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, month - 1, 1)))
/** The month as it appears in a URL: "diciembre", "fevrier", "marz". */
export const monthSlug = (l: Locale, month: number) => monthName(l, month).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')
export const monthFromSlug = (l: Locale, slug: string) => { for (let m = 1; m <= 12; m++) if (monthSlug(l, m) === slug) return m; return 0 }

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
