// Shared between the server (SEO pages) and the client (the app). No data imports here.

export const ROOTS = [
  'latin', 'greek', 'hebrew', 'germanic', 'celtic', 'norse', 'slavic', 'arabic', 'persian', 'turkish',
  'sanskrit', 'japanese', 'chinese', 'korean', 'african', 'polynesian', 'basque', 'native', 'other',
] as const
export type Root = (typeof ROOTS)[number]

export const CULTURES = [
  'spanish', 'basque', 'catalan', 'galician', 'portuguese', 'french', 'italian', 'german', 'english',
  'irish', 'scottish', 'welsh', 'scandinavian', 'dutch', 'russian', 'polish', 'greek', 'hebrew', 'arabic',
  'turkish', 'persian', 'indian', 'japanese', 'chinese', 'korean', 'african', 'hawaiian', 'intl',
] as const
export type Culture = (typeof CULTURES)[number]

export const TAGS = [
  'biblical', 'saint', 'mythology', 'nature', 'flower', 'celestial', 'sea', 'royal', 'literary', 'classic',
  'vintage', 'modern', 'trendy', 'strong', 'sweet', 'virtue', 'gem', 'animal', 'place', 'warrior', 'light',
  'love', 'music',
] as const
export type Tag = (typeof TAGS)[number]

export type Gender = 'f' | 'm' | 'u'

/** One name, already resolved for one site language. */
export type N = {
  id: number
  slug: string
  name: string
  g: Gender
  root: Root
  cultures: Culture[]
  pop: number // 1–5
  tags: Tag[]
  syl: number
  meaning: string
  fit: boolean // usable in this site language: native to it, or international
  home: boolean // belongs to one of this language's own cultures
}

/** Compact row shipped to the client: [id, slug, name, g, rootIdx, cultureIdxs, pop, tagIdxs, syl, meaning, fit] (fit: 2 home, 1 international, 0 foreign) */
export type Row = [number, string, string, Gender, number, number[], number, number[], number, string, 0 | 1 | 2]

export function fromRow(r: Row): N {
  return {
    id: r[0], slug: r[1], name: r[2], g: r[3], root: ROOTS[r[4]], cultures: r[5].map(i => CULTURES[i]),
    pop: r[6], tags: r[7].map(i => TAGS[i]), syl: r[8], meaning: r[9], fit: r[10] > 0, home: r[10] === 2,
  }
}
export function toRow(n: N): Row {
  return [
    n.id, n.slug, n.name, n.g, ROOTS.indexOf(n.root), n.cultures.map(c => CULTURES.indexOf(c)), n.pop,
    n.tags.map(t => TAGS.indexOf(t)), n.syl, n.meaning, n.home ? 2 : n.fit ? 1 : 0,
  ]
}

export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd')
    .replace(/[ıİ]/g, 'i').replace(/[þÞ]/g, 'th').replace(/[ðÐ]/g, 'd').replace(/[œŒ]/g, 'oe')
    .toLowerCase()
}
export function slugify(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
export function firstLetter(name: string): string {
  const c = fold(name).replace(/[^a-z]/g, '')[0]
  return (c || 'a').toUpperCase()
}

// ───────────────────────── Lists ─────────────────────────
// A list is identified by a stable key. The key encodes its filter, so server and client agree.
//   g:f                gender
//   c:basque  c:basque:f     culture (+gender)
//   t:biblical t:biblical:m  tag (+gender)
//   l:a  l:a:f               first letter (+gender)
//   len:short len:long (+gender)
//   syl:1 syl:2 (+gender)
//   pop:top pop:rare (+gender)   (top = popular among names native to the site language)

export type ListKey = string
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const GENDERS: Gender[] = ['f', 'm']

export function allListKeys(): ListKey[] {
  const keys: ListKey[] = ['g:f', 'g:m', 'g:u']
  const withGenders = (base: string) => { keys.push(base); for (const g of GENDERS) keys.push(`${base}:${g}`) }
  withGenders('pop:top'); withGenders('pop:rare')
  for (const c of CULTURES) withGenders(`c:${c}`)
  for (const t of TAGS) withGenders(`t:${t}`)
  withGenders('len:short'); withGenders('len:long')
  withGenders('syl:1'); withGenders('syl:2')
  for (const l of LETTERS) withGenders(`l:${l.toLowerCase()}`)
  return keys
}

export function parseListKey(key: ListKey): { kind: string; value: string; gender?: Gender } {
  const [kind, value, gender] = key.split(':')
  if (kind === 'g') return { kind, value, gender: value as Gender }
  return { kind, value, gender: gender as Gender | undefined }
}

export function matchList(key: ListKey, n: N): boolean {
  const { kind, value, gender } = parseListKey(key)
  // A gendered list also welcomes unisex names; the unisex list holds only those.
  if (gender && n.g !== gender && !(gender !== 'u' && n.g === 'u')) return false
  switch (kind) {
    case 'g': return true
    case 'c': return n.cultures.includes(value as Culture)
    case 't': return n.tags.includes(value as Tag)
    case 'l': return firstLetter(n.name) === value.toUpperCase()
    case 'len': return value === 'short' ? nameLength(n.name) <= 4 : nameLength(n.name) >= 9
    case 'syl': return n.syl === Number(value)
    case 'pop': return value === 'top' ? n.home && n.pop >= 4 : n.pop <= 1
    default: return false
  }
}
export function nameLength(name: string): number {
  return name.replace(/[^\p{L}]/gu, '').length
}

/** Sort used on list pages: familiar names first, then alphabetical. */
export function byPopThenName(a: N, b: N): number {
  return (a.home === b.home ? 0 : a.home ? -1 : 1) || b.pop - a.pop || a.name.localeCompare(b.name)
}
