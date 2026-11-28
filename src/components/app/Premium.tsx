'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { startCheckout, track } from '@/lib/sync'
import { FREE_LIKES, FREE_SUPERS, type Wall } from '@/lib/premium'
import { t } from '@/lib/t'
import { IconCheck, IconX } from '../Icons'
import { MailBox } from './Panels'
import type { Ctx } from './types'

/**
 * The Premium offer. It comes up when the day's likes (or the superlike) run out, and from the menu. Two ways out:
 * carry on tomorrow, or pay once. Swiping left never stops, and neither does inviting a partner or seeing matches.
 */
export function PremiumSheet({ ctx, why, onClose }: { ctx: Ctx; why: Wall; onClose: () => void }) {
  const { d, c, hrefs } = ctx
  const P = d.premium
  const s = useStore()
  const [state, setSt] = useState<'idle' | 'busy' | 'error'>('idle')
  const premium = s.plan === 'premium'
  useEffect(() => { if (!premium) track('premium_seen') }, [premium])
  const buy = async () => {
    setSt('busy')
    track('premium_start')
    const url = await startCheckout()
    if (url) window.location.assign(url); else setSt('error')
  }
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="premium-h">
        <div className="sheet-head">
          <h2 id="premium-h">{premium ? P.onH : why === 'likes' ? t(P.likesH, { count: FREE_LIKES }) : why === 'supers' ? P.supersH : P.openH}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={c.close}><IconX /></button>
        </div>
        <div className="sheet-scroll">
          {premium ? <p>{P.onP}</p> : (
            <>
              <p>{t(P.p, { likes: FREE_LIKES, supers: FREE_SUPERS })}</p>
              <ul className="perks">
                {P.perks.map(x => <li key={x}><IconCheck size={18} />{x}</li>)}
              </ul>
              <button type="button" className="btn btn--primary" onClick={buy} disabled={state === 'busy'}>{state === 'busy' ? P.busy : P.buy}</button>
              {state === 'error' ? <p role="alert">{P.error}</p> : null}
              <button type="button" className="btn" onClick={onClose}>{P.later}</button>
              <p className="muted">{P.small} <a href={hrefs.terms} target="_blank" rel="noopener">{P.terms}</a></p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** "Save your list": offered once the person has a list worth keeping, never before, and never in the way. */
export function SaveSheet({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { d, c } = ctx
  const P = d.premium
  const s = useStore()
  const saved = !!s.email
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="save-h">
        <div className="sheet-head">
          <h2 id="save-h">{P.saveH}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={c.close}><IconX /></button>
        </div>
        <div className="sheet-scroll">
          <p>{t(P.saveP, { count: Object.keys(s.likes).length })}</p>
          <MailBox ctx={ctx} plain />
          <button type="button" className={saved ? 'btn btn--primary' : 'btn'} onClick={onClose}>{saved ? c.close : P.saveLater}</button>
        </div>
      </div>
    </div>
  )
}
