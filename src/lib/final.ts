import type { Final } from './store'

// The final round: from "names we both like" to one name.
// Each person settles head-to-head duels between the names in the pool; every name carries a rating that moves a
// little with each duel (Elo). The couple's order is the sum of both ratings, so a name both rank high wins over one
// that only one of them loves.

const START = 1000
const K = 32

export const ratingOf = (f: Final | undefined, id: number) => f?.duel[id]?.[0] ?? START
export const gamesOf = (f: Final | undefined, id: number) => f?.duel[id]?.[1] ?? 0
/** Duels this person has settled among the names of the pool (each duel counts once, not once per name). */
export const duelsPlayed = (f: Final, pool: number[]) => Math.round(pool.reduce((a, id) => a + gamesOf(f, id), 0) / 2)

/** The result of one duel. */
export function play(f: Final, winner: number, loser: number): Final {
  const rw = ratingOf(f, winner), rl = ratingOf(f, loser)
  const expected = 1 / (1 + 10 ** ((rl - rw) / 400))
  const move = Math.round(K * (1 - expected))
  return {
    ...f,
    duel: { ...f.duel, [winner]: [rw + move, gamesOf(f, winner) + 1], [loser]: [rl - move, gamesOf(f, loser) + 1] },
  }
}

/**
 * The next duel: the name seen least, against the one closest to it in rating, so early duels cover every name and
 * later ones decide between names that are neck and neck. Never the same pair twice in a row.
 */
export function nextPair(pool: number[], f: Final, last: [number, number] | null, rnd: () => number = Math.random): [number, number] | null {
  if (pool.length < 2) return null
  const least = Math.min(...pool.map(id => gamesOf(f, id)))
  const fresh = pool.filter(id => gamesOf(f, id) === least)
  const a = fresh[Math.floor(rnd() * fresh.length)]
  const wasLast = (b: number) => !!last && ((last[0] === a && last[1] === b) || (last[1] === a && last[0] === b))
  const rivals = pool.filter(id => id !== a && (pool.length === 2 || !wasLast(id)))
  const gap = (id: number) => Math.abs(ratingOf(f, id) - ratingOf(f, a))
  const closest = Math.min(...rivals.map(gap))
  const near = rivals.filter(id => gap(id) <= closest + 16)
  const b = near[Math.floor(rnd() * near.length)]
  return rnd() < 0.5 ? [a, b] : [b, a]
}

/** How many duels give a trustworthy order for a pool of this size (the app suggests it, it does not stop there). */
export const enoughDuels = (size: number) => Math.max(3, Math.min(30, Math.round(size * 1.5)))

/**
 * The pool in the couple's order of preference. `boost` breaks the ties before anyone has played: superlikes first.
 * With a partner, both ratings add up; a partner who has not played yet simply does not move anything.
 */
export function ranking(pool: number[], mine: Final, theirs: Final | undefined, boost: (id: number) => number, label: (id: number) => string): number[] {
  const score = (id: number) => ratingOf(mine, id) + (theirs ? ratingOf(theirs, id) : START) + boost(id) * 12
  return [...pool].sort((a, b) => score(b) - score(a) || label(a).localeCompare(label(b)))
}

// ───────── how a name sounds with the family name ─────────

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '')
export type SoundNote = 'rhyme' | 'clash' | 'same'

/** Honest, checkable remarks about a name next to a family name. Nothing here is a verdict: it is what to listen for. */
export function soundNotes(name: string, surname: string): SoundNote[] {
  const n = fold(name).replace(/ /g, ''), first = fold(surname).trim().split(/\s+/)[0] || ''
  if (n.length < 2 || first.length < 2) return []
  const notes: SoundNote[] = []
  // The same ending (Martina Molina): three letters, or two when both are that short.
  const tail = Math.min(3, n.length, first.length)
  if (tail >= 2 && n.slice(-tail) === first.slice(-tail)) notes.push('rhyme')
  // The name ends in the vowel the family name starts with (Lucía Álvarez): the two words run together when said.
  if (/[aeiou]/.test(n.slice(-1)) && n.slice(-1) === first[0]) notes.push('clash')
  if (n[0] === first[0]) notes.push('same')
  return notes
}

export const initialsOf = (name: string, surname: string) =>
  [name, ...surname.trim().split(/\s+/)].filter(Boolean).map(w => w[0].toUpperCase() + '.').join(' ')
