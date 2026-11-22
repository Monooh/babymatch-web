'use client'
import { useState } from 'react'
import { SwipeStack, type CardData } from './SwipeStack'
import { actions } from '@/lib/store'

/** The home hero: the real deck with a dozen real names. Likes are kept and waiting in the app. */
export function HeroDeck({ cards, labels, appHref, label, cta, savedNote, endNote }: {
  cards: CardData[]; labels: { like: string; nope: string }; appHref: string; label: string; cta: string; savedNote: string; endNote: string
}) {
  const [i, setI] = useState(0)
  const [liked, setLiked] = useState(0)
  const rest = cards.slice(i)
  return (
    <>
      <SwipeStack
        cards={rest}
        labels={labels}
        ariaLabel={label}
        onSwipe={(dir, c) => {
          if (dir === 'like') { actions.like(c.id); setLiked(n => n + 1) } else actions.nope(c.id)
          setI(n => n + 1)
        }}
        end={
          <div className="deck-end">
            <strong>{endNote}</strong>
            <a className="btn" href={appHref}>{cta}</a>
          </div>
        }
      />
      <p className="deck-note" role="status">{liked > 0 && rest.length ? <a className="link" href={appHref}>{savedNote}</a> : null}</p>
    </>
  )
}
