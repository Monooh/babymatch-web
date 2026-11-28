import type { State } from './store'

// The free plan, like the dating apps: a few likes and one superlike a day; Premium (one payment) has no limit.
// The limits only exist while the server can take the payment (`pay`), and they are counted on this device from the
// time of each answer, so they start again at midnight wherever the person is.
export const FREE_LIKES = 30
export const FREE_SUPERS = 1

/** `canSuper` is for a new answer (it is a like too); `canSuperOnly` is for turning a like already given into a superlike. */
export type Limits = { limited: boolean; likesLeft: number; supersLeft: number; canLike: boolean; canSuper: boolean; canSuperOnly: boolean }

export function limitsOf(s: Pick<State, 'likes' | 'stars' | 'plan' | 'pay'>, at = Date.now()): Limits {
  const limited = s.pay && s.plan !== 'premium'
  if (!limited) return { limited: false, likesLeft: Infinity, supersLeft: Infinity, canLike: true, canSuper: true, canSuperOnly: true }
  const day = new Date(at)
  day.setHours(0, 0, 0, 0)
  const from = day.getTime()
  let likes = 0, supers = 0
  for (const id in s.likes) if (s.likes[id] >= from) likes++
  for (const id of s.stars) if (s.likes[id] >= from) supers++
  const likesLeft = Math.max(0, FREE_LIKES - likes), supersLeft = Math.max(0, FREE_SUPERS - supers)
  return { limited: true, likesLeft, supersLeft, canLike: likesLeft > 0, canSuper: likesLeft > 0 && supersLeft > 0, canSuperOnly: supersLeft > 0 }
}

/** Ask the app to show the Premium offer from anywhere (the likes list, for one). */
export type Wall = 'likes' | 'supers' | 'open'
export const askWall = (why: Wall) => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bm:wall', { detail: why })) }
