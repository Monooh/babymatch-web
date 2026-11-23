'use client'
import { useCallback, useRef, type ReactNode, type PointerEvent as RPointerEvent, type KeyboardEvent } from 'react'
import { IconHeart, IconX, IconUndo, IconStar } from './Icons'
import type { Gender } from '@/lib/model'

export type CardData = {
  id: number; name: string; g: Gender; gLabel: string; origin: string; meaning: string; tags: string[]; meta?: ReactNode
}
type Labels = { like: string; nope: string; undo?: string; star?: string }

function nameSize(name: string): string {
  const longest = Math.max(...name.split(/[\s-]+/).map(w => w.length))
  const len = Math.max(longest, name.length * 0.62)
  if (len <= 5) return '4.75rem'
  if (len <= 7) return '3.9rem'
  if (len <= 9) return '3.1rem'
  if (len <= 12) return '2.5rem'
  return '2rem'
}

export function NameCardFace({ c, surname }: { c: CardData; surname?: string }) {
  return (
    <>
      <div className="card-top">
        <span className={`chip chip--${c.g}`}>{c.gLabel}</span>
        <span className="card-origin">{c.origin}</span>
      </div>
      <div className="card-main">
        <div className="card-name" style={{ ['--fs' as string]: nameSize(c.name) }}>{c.name}</div>
        {surname ? <div className="card-surname">{surname}</div> : null}
        <p className="card-meaning">{c.meaning}</p>
      </div>
      {c.tags.length ? <div className="card-foot">{c.tags.map(t => <span key={t} className="chip">{t}</span>)}</div> : null}
      {c.meta}
    </>
  )
}

export type Swipe = 'like' | 'nope' | 'super'

/**
 * The stack of name cards. The top card can be dragged, flicked with the arrow keys or sent away with the buttons.
 * `cards[0]` is on top; the parent drops it from the array in onSwipe. With `superlike`, dragging the card up (or
 * the star button) is a third answer; without it the card leaves vertical drags to the page, so it can scroll.
 */
export function SwipeStack({ cards, onSwipe, labels, onUndo, canUndo, superlike, surname, end, ariaLabel }: {
  cards: CardData[]
  onSwipe: (dir: Swipe, card: CardData) => void
  labels: Labels
  onUndo?: () => void
  canUndo?: boolean
  superlike?: boolean
  surname?: string
  end?: ReactNode
  ariaLabel?: string
}) {
  const el = useRef<HTMLDivElement | null>(null)
  const likeStamp = useRef<HTMLSpanElement | null>(null)
  const nopeStamp = useRef<HTMLSpanElement | null>(null)
  const superStamp = useRef<HTMLSpanElement | null>(null)
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null)
  const busy = useRef(false)
  const top = cards[0]

  const paint = (dx: number, dy: number) => {
    const node = el.current
    if (!node) return
    // Going up more than sideways is a superlike in the making: the card follows the finger instead of tilting.
    const up = !!superlike && dy < 0 && -dy > Math.abs(dx)
    node.style.transform = up ? `translate(${dx * 0.4}px, ${dy}px)` : `translate(${dx}px, ${dy * 0.25}px) rotate(${dx * 0.05}deg)`
    if (likeStamp.current) likeStamp.current.style.opacity = up ? '0' : String(Math.max(0, Math.min(1, (dx - 24) / 70)))
    if (nopeStamp.current) nopeStamp.current.style.opacity = up ? '0' : String(Math.max(0, Math.min(1, (-dx - 24) / 70)))
    if (superStamp.current) superStamp.current.style.opacity = up ? String(Math.max(0, Math.min(1, (-dy - 24) / 70))) : '0'
  }

  const fly = useCallback((dir: Swipe) => {
    const node = el.current
    if (!node || !top || busy.current) return
    busy.current = true
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node.classList.remove('card--back')
    node.classList.add('card--fly')
    const sign = dir === 'like' ? 1 : -1
    node.style.transform = dir === 'super' ? 'translate(0, -130%)' : `translate(${sign * 130}%, -6%) rotate(${sign * 16}deg)`
    node.style.opacity = '0'
    const stamp = dir === 'super' ? superStamp.current : dir === 'like' ? likeStamp.current : nopeStamp.current
    if (stamp) stamp.style.opacity = '1'
    window.setTimeout(() => { busy.current = false; onSwipe(dir, top) }, reduce ? 0 : 200)
  }, [top, onSwipe])

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (busy.current || (e.target as HTMLElement).closest('a,button')) return
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.classList.remove('card--back')
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.moved && Math.abs(dx) < 6 && !(superlike && dy < -6)) return
    d.moved = true
    paint(dx, dy)
  }
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (superlike && dy < -110 && -dy > Math.abs(dx)) fly('super')
    else if (dx > 90) fly('like')
    else if (dx < -90) fly('nope')
    else { e.currentTarget.classList.add('card--back'); paint(0, 0) }
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); fly('like') }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); fly('nope') }
    else if (e.key === 'ArrowUp' && superlike) { e.preventDefault(); fly('super') }
  }

  return (
    <div className="deck">
      <div className="deck-stack">
        {cards[2] ? <div className="card card--under2" aria-hidden="true" /> : null}
        {cards[1] ? <div className="card card--under" aria-hidden="true" /> : null}
        {top ? (
          <div key={top.id} ref={el} className={superlike ? 'card card--top card--free' : 'card card--top'} tabIndex={0} role="group" aria-roledescription="card"
            aria-label={ariaLabel ? `${ariaLabel}: ${top.name}` : top.name}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
            <span ref={likeStamp} className="stamp stamp--like" aria-hidden="true">{labels.like}</span>
            <span ref={nopeStamp} className="stamp stamp--nope" aria-hidden="true">{labels.nope}</span>
            {superlike ? <span ref={superStamp} className="stamp stamp--super" aria-hidden="true">{labels.star}</span> : null}
            <NameCardFace c={top} surname={surname} />
          </div>
        ) : end}
      </div>
      {top ? (
        <div className="deck-actions">
          {onUndo ? (
            <button type="button" className="btn btn--mini" onClick={onUndo} disabled={!canUndo} aria-label={labels.undo} title={labels.undo}><IconUndo size={20} /></button>
          ) : null}
          <button type="button" className="btn" onClick={() => fly('nope')} aria-label={labels.nope} title={labels.nope}><IconX size={28} /></button>
          <button type="button" className="btn btn--primary" onClick={() => fly('like')} aria-label={labels.like} title={labels.like}><IconHeart size={28} /></button>
          {superlike ? (
            <button type="button" className="btn btn--mini btn--super" onClick={() => fly('super')} aria-label={labels.star} title={labels.star}><IconStar size={20} /></button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
