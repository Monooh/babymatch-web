'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { enterCode, requestCode, signOut, track } from '@/lib/sync'
import { askWall } from '@/lib/premium'
import { t } from '@/lib/t'
import { IconCheck, IconHeart, IconMail, IconX } from '../Icons'
import type { Ctx } from './types'

/**
 * The account: one screen to create it and to come back to it. An email address, a six-digit code sent there, no
 * password. It comes up by itself once, at the third like (`ask`), and from the menu at any time. The picture at the
 * top is the person's own list: the names they have just liked, as the cards they swiped.
 */
export function AccountScreen({ ctx, ask, onClose }: { ctx: Ctx; ask: boolean; onClose: () => void }) {
  const { d, c, hrefs } = ctx
  const A = d.account
  const s = useStore()
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [st, setSt] = useState<'idle' | 'busy' | 'bad' | 'slow' | 'network' | 'wrong' | 'expired' | 'resent'>('idle')
  const codeRef = useRef<HTMLInputElement>(null)
  const [address, confirmed] = s.email || ['', 0]
  const mine = !!confirmed && step !== 'done'

  // The three names liked last; on a device with no list yet, three from the catalogue.
  const cards = useMemo(() => {
    const liked = Object.entries(s.likes).sort((a, b) => b[1] - a[1]).map(([id]) => ctx.byId.get(Number(id))).filter(Boolean).slice(0, 3)
    const fill = ctx.names.filter(n => !liked.includes(n) && n.name.length <= 8).slice(0, 3 - liked.length)
    return [...liked, ...fill].map(n => ({ name: n!.name, g: n!.g })).reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  const send = async (again = false) => {
    setSt('busy')
    const r = await requestCode(email)
    if (r !== 'sent') { setSt(r); return }
    if (!again) track('account_start')
    setCode(''); setStep('code'); setSt(again ? 'resent' : 'idle')
  }
  const check = async (value: string) => {
    setSt('busy')
    const r = await enterCode(email, value)
    if (r === 'ok') { track('account_done'); setStep('done'); setSt('idle') } else { setSt(r); setCode(''); codeRef.current?.focus() }
  }
  const onCode = (raw: string) => {
    const value = raw.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    if (st !== 'busy') setSt('idle')
    if (value.length === 6 && st !== 'busy') void check(value)
  }
  const busy = st === 'busy'
  const error = st === 'bad' ? d.menu.mailBad : st === 'slow' ? d.menu.mailSlow : st === 'network' ? d.matches.linkError : st === 'wrong' ? A.wrong : st === 'expired' ? A.expired : ''

  return (
    <div className="acct" role="dialog" aria-modal="true" aria-labelledby="acct-h">
      <div className="acct-art" aria-hidden="true">
        {cards.map((n, i) => (
          <div key={n.name + i} className="acct-card" data-g={n.g} style={{ ['--i' as string]: i - (cards.length - 1) / 2 }}>
            <span>{n.name}</span>
            <IconHeart size={18} />
          </div>
        ))}
      </div>
      <button type="button" className="icon-btn acct-x" onClick={onClose} aria-label={c.close}><IconX /></button>

      <div className="acct-body">
        <div className="wordmark"><img src="/logo.png" alt="" width={40} height={40} /><span>BabyMatch</span></div>

        {mine ? (
          <>
            <h2 id="acct-h">{A.menuOn}</h2>
            <dl className="acct-rows">
              <div><dt>{d.menu.mailLabel}</dt><dd><IconCheck size={16} />{address}</dd></div>
              <div><dt>{A.plan}</dt><dd>{s.plan === 'premium' ? A.premium : A.free}</dd></div>
            </dl>
            {s.pay && s.plan !== 'premium' ? <button type="button" className="btn btn--primary btn--wide" onClick={() => { onClose(); askWall('open') }}>{d.premium.buy}</button> : null}
            <button type="button" className="btn btn--wide" onClick={() => { if (window.confirm(A.outConfirm)) { void signOut(); onClose() } }}>{A.out}</button>
          </>
        ) : step === 'done' ? (
          <>
            <h2 id="acct-h">{A.doneH}</h2>
            <p>{t(A.doneP, { email: address || email })}</p>
            <button type="button" className="btn btn--primary btn--wide" autoFocus onClick={onClose}>{A.doneGo}</button>
          </>
        ) : step === 'code' ? (
          <>
            <h2 id="acct-h">{A.codeH}</h2>
            <p>{t(A.codeP, { email })}</p>
            <input ref={codeRef} className="input acct-code" aria-label={A.codeLabel} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
              placeholder="······" value={code} disabled={busy} onChange={e => onCode(e.target.value)} />
            {error ? <p role="alert">{error}</p> : st === 'resent' ? <p role="status">{A.resent}</p> : null}
            <div className="acct-links">
              <button type="button" className="link" disabled={busy} onClick={() => void send(true)}>{A.resend}</button>
              <button type="button" className="link" disabled={busy} onClick={() => { setStep('email'); setSt('idle') }}>{A.change}</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="acct-h">{ask ? A.saveH : A.openH}</h2>
            <form className="acct-form" onSubmit={e => { e.preventDefault(); if (!busy) void send() }}>
              <input className="input" type="email" name="email" autoComplete="email" inputMode="email" maxLength={120} required aria-label={d.menu.mailLabel} placeholder={d.menu.mailPh}
                value={email} onChange={e => { setEmail(e.target.value); if (!busy) setSt('idle') }} />
              <button type="submit" className="btn btn--primary btn--wide" disabled={busy}><IconMail size={20} />{busy ? A.busy : A.go}</button>
            </form>
            {error ? <p role="alert">{error}</p> : <p className="muted acct-hint">{A.hint}</p>}
            {ask ? <button type="button" className="link" onClick={onClose}>{A.later}</button> : null}
          </>
        )}
      </div>

      <p className="acct-legal">
        <a href={hrefs.privacy} target="_blank" rel="noopener">{A.privacy}</a>
        <a href={hrefs.terms} target="_blank" rel="noopener">{d.premium.terms}</a>
      </p>
    </div>
  )
}
