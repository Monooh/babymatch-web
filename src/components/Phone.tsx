import type { Locale } from '@/i18n/config'
import { Clip } from './Clip'

// Real captures of the app (scripts/capture-app.mjs), shown as a phone-shaped sheet of card stock.
export type Shot = 'quiz' | 'swipe' | 'filters' | 'lists' | 'likes' | 'invite' | 'matches' | 'match'
export const shotSrc = (l: Locale, shot: Shot) => `/shots/${l}/${shot}.webp`

/** A screenshot, or a short looping clip when `clip` is set (the screenshot is then its poster). */
export function Phone({ l, shot, alt, clip }: { l: Locale; shot: Shot; alt: string; clip?: boolean }) {
  return (
    <figure className="phone">
      {clip
        ? <Clip src={`/shots/${l}/${shot}.mp4`} poster={shotSrc(l, shot)} label={alt} />
        : <img src={shotSrc(l, shot)} alt={alt} width={780} height={1688} loading="lazy" decoding="async" />}
    </figure>
  )
}
