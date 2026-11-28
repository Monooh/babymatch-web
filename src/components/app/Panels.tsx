'use client'
import { useEffect, useMemo, useState } from 'react'
import { CULTURES, LETTERS, TAGS, fold, type Culture, type Gender, type N, type Tag } from '@/lib/model'
import { actions, getState, setState, useStore, EMPTY_FILTERS, type Filters } from '@/lib/store'
import { createInvite, deviceKey, leavePartner, loginEmail, removeEmail, saveEmail, syncNow, track, useSyncStatus } from '@/lib/sync'
import { askWall, limitsOf } from '@/lib/premium'
import { t } from '@/lib/t'
import { IconCheck, IconCopy, IconShare, IconStar, IconTrash, IconX } from '../Icons'
import { passes } from './deck'
import { FinalCard } from './Final'
import type { Ctx } from './types'

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
}

// ───────────────────────── Filters ─────────────────────────
export function FiltersSheet({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { d, c, labels, names, nativeCultures } = ctx
  const s = useStore()
  const [f, setF] = useState<Filters>(s.filters)
  const F = d.filters
  const count = useMemo(() => names.reduce((acc, n) => acc + (!s.likes[n.id] && !s.nopes[n.id] && passes(n, f, s.list) ? 1 : 0), 0), [names, f, s.likes, s.nopes, s.list])
  const cultures = useMemo(() => (CULTURES.filter(x => x !== 'intl') as Culture[])
    .sort((x, y) => (nativeCultures.includes(y) ? 1 : 0) - (nativeCultures.includes(x) ? 1 : 0) || labels.cultures[x].localeCompare(labels.cultures[y])), [labels, nativeCultures])
  const Pill = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button type="button" className="pill" aria-pressed={on} onClick={onClick}>{label}</button>
  )
  const genders: [Gender, string][] = [['f', c.girl], ['m', c.boy], ['u', c.unisex]]
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="filters-h">
        <div className="sheet-head">
          <h2 id="filters-h">{F.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={c.close}><IconX /></button>
        </div>
        <div className="sheet-scroll">
          <fieldset className="fgroup"><legend>{F.gender}</legend>
            <div className="pills">{genders.map(([g, label]) => <Pill key={g} on={f.g.includes(g)} label={label} onClick={() => setF({ ...f, g: toggle(f.g, g) })} />)}</div>
          </fieldset>
          <fieldset className="fgroup"><legend>{F.origin}</legend>
            <label className="switch">
              <input type="checkbox" checked={f.nativeOnly && !f.cultures.length} disabled={f.cultures.length > 0} onChange={e => setF({ ...f, nativeOnly: e.target.checked })} />
              <span>{F.nativeOnly}</span>
            </label>
            <div className="pills">{cultures.map(cu => <Pill key={cu} on={f.cultures.includes(cu)} label={labels.cultures[cu]} onClick={() => setF({ ...f, cultures: toggle(f.cultures, cu) })} />)}</div>
          </fieldset>
          <fieldset className="fgroup"><legend>{F.style}</legend>
            <div className="pills">{(TAGS as readonly Tag[]).map(tag => <Pill key={tag} on={f.tags.includes(tag)} label={labels.tags[tag]} onClick={() => setF({ ...f, tags: toggle(f.tags, tag) })} />)}</div>
          </fieldset>
          <fieldset className="fgroup"><legend>{F.letter}</legend>
            <div className="pills pills--letters">{LETTERS.map(L => <Pill key={L} on={f.letters.includes(L)} label={L} onClick={() => setF({ ...f, letters: toggle(f.letters, L) })} />)}</div>
          </fieldset>
          <fieldset className="fgroup"><legend>{F.length}</legend>
            <div className="pills">{([['short', F.short], ['medium', F.medium], ['long', F.long]] as const).map(([k, label]) => <Pill key={k} on={f.len.includes(k)} label={label} onClick={() => setF({ ...f, len: toggle(f.len, k) })} />)}</div>
          </fieldset>
          <fieldset className="fgroup"><legend>{F.popularity}</legend>
            <div className="pills">{([['popular', F.popular], ['middle', F.middle], ['rare', F.rare]] as const).map(([k, label]) => <Pill key={k} on={f.pop.includes(k)} label={label} onClick={() => setF({ ...f, pop: toggle(f.pop, k) })} />)}</div>
          </fieldset>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={() => setF({ ...EMPTY_FILTERS, nativeOnly: false })}>{F.clear}</button>
          <button type="button" className="btn btn--primary" onClick={() => { setState({ filters: f }); track('filters_used'); onClose() }}>{t(F.apply, { count })}</button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Lists ─────────────────────────
export function ListsTab({ ctx, onPick }: { ctx: Ctx; onPick: (key: string) => void }) {
  const { d, lists } = ctx
  const [q, setQ] = useState('')
  const shown = useMemo(() => { const k = fold(q.trim()); return k ? lists.filter(x => fold(x.title).includes(k)) : lists }, [q, lists])
  return (
    <div className="app-pad">
      <div><h1 className="app-h">{d.lists.h}</h1><p className="muted">{d.lists.p}</p></div>
      <input className="input" type="search" name="list" autoComplete="off" placeholder={d.lists.search} aria-label={d.lists.search} value={q} onChange={e => setQ(e.target.value)} />
      {shown.length ? (
        <ul className="listlinks">
          {shown.slice(0, 120).map(x => <li key={x.key}><button type="button" onClick={() => onPick(x.key)}><span>{x.title}</span><small>{x.count}</small></button></li>)}
        </ul>
      ) : <p className="muted">{d.lists.none}</p>}
    </div>
  )
}

// ───────────────────────── Likes ─────────────────────────
function NameRow({ n, ctx, starred, badge }: { n: N; ctx: Ctx; starred?: boolean; badge?: string }) {
  const { d, hrefs } = ctx
  return (
    <li>
      <a className="who" href={`${hrefs.names}/${n.slug}`} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
        <b>{n.name}</b>{badge ? <em className="chip chip--super">{badge}</em> : null}<span>{n.meaning}</span>
      </a>
      {starred !== undefined ? (
        <>
          <button type="button" className="icon-btn" aria-pressed={starred} aria-label={`${starred ? d.likes.favOn : d.likes.favOff}: ${n.name}`} onClick={() => { if (!starred && !limitsOf(getState()).canSuperOnly) askWall('supers'); else actions.toggleStar(n.id) }}><IconStar size={20} /></button>
          <button type="button" className="icon-btn" aria-label={`${d.likes.remove}: ${n.name}`} onClick={() => actions.unswipe(n.id)}><IconTrash size={20} /></button>
        </>
      ) : null}
    </li>
  )
}

function useCopy(): [boolean, (text: string) => void] {
  const [done, setDone] = useState(false)
  return [done, (text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1800) }).catch(() => {})
  }]
}

export function LikesTab({ ctx, onSwipe, onFinal }: { ctx: Ctx; onSwipe: () => void; onFinal: () => void }) {
  const { d, c, byId } = ctx
  const s = useStore()
  const [copied, copy] = useCopy()
  const sync = useSyncStatus()
  const liked = Object.entries(s.likes).sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(Number(id))).filter((n): n is N => !!n)
  const stars = liked.filter(n => s.stars.includes(n.id))
  const rest = liked.filter(n => !s.stars.includes(n.id))
  if (!liked.length) {
    return <div className="empty"><h2>{d.likes.emptyH}</h2><p>{d.likes.emptyP}</p><button type="button" className="btn btn--primary" onClick={onSwipe}>{c.startSwiping}</button></div>
  }
  return (
    <div className="app-pad">
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
        <div>
          <h1 className="app-h">{d.likes.h}</h1>
          <p className="muted">{t(d.likes.count, { count: liked.length })}</p>
          {/* Said out loud because it is the promise that matters most here: the list is not only on this phone. */}
          {sync === 'idle' && !s.uid ? null : (
            <p className="sync-note" role="status">{sync === 'offline' ? d.likes.offline : sync === 'saving' ? d.likes.saving : <><IconCheck size={16} />{d.likes.saved}</>}</p>
          )}
        </div>
        <button type="button" className="btn btn--small" onClick={() => copy(liked.map(n => n.name).join('\n'))}>
          {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}{copied ? c.copied : d.likes.copyList}
        </button>
      </div>
      {/* Alone, the final round is played with the person's own likes; with a partner it lives next to the matches. */}
      {!s.partner && liked.length >= 2 ? <FinalCard ctx={ctx} onOpen={onFinal} /> : null}
      {stars.length ? (<div><h2 className="subhead">{d.likes.favourites}</h2><ul className="rowlist">{stars.map(n => <NameRow key={n.id} n={n} ctx={ctx} starred />)}</ul></div>) : null}
      {rest.length ? (<div>{stars.length ? <h2 className="subhead">{d.likes.others}</h2> : null}<ul className="rowlist">{rest.map(n => <NameRow key={n.id} n={n} ctx={ctx} starred={false} />)}</ul></div>) : null}
    </div>
  )
}

// ───────────────────────── Matches ─────────────────────────
export function ShareRow({ ctx, link, message, onShared }: { ctx: Ctx; link: string; message: string; onShared?: () => void }) {
  const { c } = ctx
  const [copied, copy] = useCopy()
  const share = () => {
    onShared?.()
    if (navigator.share) navigator.share({ text: message, url: link }).catch(() => {})
    else copy(`${message} ${link}`.trim())
  }
  return (
    <>
      <div className="linkbox">{link}</div>
      <div className="share-row">
        <button type="button" className="btn btn--primary" onClick={share}><IconShare size={20} />{c.share}</button>
        <button type="button" className="btn" onClick={() => { onShared?.(); copy(link) }}>{copied ? <IconCheck size={20} /> : <IconCopy size={20} />}{copied ? c.copied : c.copy}</button>
      </div>
    </>
  )
}

/** One link, sent once: the partner opens it and from then on both lists are compared on the server as they change. */
function InvitePanel({ ctx }: { ctx: Ctx }) {
  const { d, hrefs } = ctx
  const M = d.matches
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const me = s.me.trim()
  const link = s.invite ? `${window.location.origin}${hrefs.app}#j=${s.invite}${me ? '&n=' + encodeURIComponent(me) : ''}` : ''
  const make = async () => {
    setBusy(true); setFailed(false)
    const code = await createInvite()
    setBusy(false)
    if (code) track('invite_created'); else setFailed(true)
  }
  return (
    <section className="panel panel--sugar">
      <div><h2>{M.inviteH}</h2><p>{M.inviteP}</p></div>
      {link ? (
        <>
          <strong>{M.linkReady}</strong>
          <ShareRow ctx={ctx} link={link} message={me ? t(M.shareText, { name: me }) : M.shareTextAnon} onShared={() => track('invite_shared')} />
          <p role="status">{M.linkWait}</p>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="me">{M.yourName}</label>
            <input id="me" className="input" name="given-name" autoComplete="given-name" maxLength={30} placeholder={M.yourNamePh} value={s.me} onChange={e => setState({ me: e.target.value })} />
          </div>
          <button type="button" className="btn btn--primary" onClick={make} disabled={busy}>{busy ? M.joining : M.createLink}</button>
          {failed ? <p role="alert">{M.linkError}</p> : null}
        </>
      )}
    </section>
  )
}

export function MatchesTab({ ctx, onSwipe, onFinal }: { ctx: Ctx; onSwipe: () => void; onFinal: () => void }) {
  const { d, byId } = ctx
  const M = d.matches
  const s = useStore()
  const p = s.partner
  if (!p) return <div className="app-pad"><h1 className="app-h">{M.h}</h1><InvitePanel ctx={ctx} /></div>
  const live = !!p.id // joined through the server; otherwise a list imported from an old-style link
  const partner = p.name || M.partnerFallback
  const theirs = new Set(p.likes), theirLoves = new Set(p.supers || []), myLoves = new Set(s.stars)
  const weight = (id: number) => Number(myLoves.has(id)) + Number(theirLoves.has(id))
  const matches = Object.keys(s.likes).map(Number).filter(id => theirs.has(id)).map(id => byId.get(id)).filter((n): n is N => !!n)
    .sort((a, b) => weight(b.id) - weight(a.id) || a.name.localeCompare(b.name))
  const badge = (id: number) => (myLoves.has(id) && theirLoves.has(id) ? M.superBoth : theirLoves.has(id) ? t(M.superTheirs, { partner }) : myLoves.has(id) ? M.superMine : undefined)
  return (
    <div className="app-pad">
      <div>
        <h1 className="app-h">{live ? t(M.liveH, { partner }) : M.h}</h1>
        <p className="muted">{live ? t(M.liveP, { count: matches.length }) : t(M.partnerH, { partner, count: p.likes.length })}</p>
      </div>
      {matches.length >= 2 ? <FinalCard ctx={ctx} onOpen={onFinal} /> : null}
      {matches.length ? (
        <ul className="rowlist">{matches.map(n => <NameRow key={n.id} n={n} ctx={ctx} badge={badge(n.id)} />)}</ul>
      ) : (
        <section className="panel panel--mint">
          <div><h2>{M.emptyH}</h2><p>{t(M.emptyP, { partner })}</p><p>{M.partnerP}</p></div>
          <button type="button" className="btn" onClick={onSwipe}>{M.keepSwiping}</button>
        </section>
      )}
      {live ? (
        <button type="button" className="btn btn--small" style={{ justifySelf: 'start' }}
          onClick={() => { if (window.confirm(t(M.unlinkConfirm, { partner }))) void leavePartner() }}>{M.unlink}</button>
      ) : (
        <>
          <InvitePanel ctx={ctx} />
          <button type="button" className="btn btn--small" style={{ justifySelf: 'start' }} onClick={() => setState({ partner: null })}>{M.forget}</button>
        </>
      )}
    </div>
  )
}

// ───────────────────────── My list under my email ─────────────────────────
/** Shown only when the server can send email. Two uses: keep this list under an address, or ask for a list kept before. */
/** `plain` is the same box inside the "save your list" offer: only the form, without the way to find another list. */
export function MailBox({ ctx, plain }: { ctx: Ctx; plain?: boolean }) {
  const M = ctx.d.menu
  const s = useStore()
  const [email, setEmail] = useState('')
  const [state, setSt] = useState<'idle' | 'busy' | 'bad' | 'slow' | 'network' | 'found'>('idle')
  const [finding, setFinding] = useState(false)
  useEffect(() => { void syncNow() }, []) // an untouched device has not asked the server yet whether email is on
  if (!s.mail) return null
  const hasList = Object.keys(s.likes).length > 0
  const find = !plain && (finding || !hasList)
  const submit = async () => {
    setSt('busy')
    if (find) { const r = await loginEmail(email); setSt(r === 'sent' ? 'found' : r) }
    else { const r = await saveEmail(email); setSt(r === 'sent' ? 'idle' : r); if (r === 'sent') { track('email_saved'); setEmail('') } }
  }
  const [address, confirmed] = s.email || ['', 0]
  return (
    <section className="panel panel--sugar">
      {plain ? <p>{M.mailP}</p> : <div><h3>{find ? M.mailFindH : M.mailH}</h3><p>{find ? M.mailFindP : M.mailP}</p></div>}
      {!find && address ? (
        <p role="status" className={confirmed ? 'sync-note' : undefined}>{confirmed ? <IconCheck size={16} /> : null}{t(confirmed ? M.mailOk : M.mailSent, { email: address })}</p>
      ) : null}
      {state === 'found' ? <p role="status">{M.mailFindSent}</p> : !find && confirmed ? null : (
        <form className="share-row" onSubmit={e => { e.preventDefault(); void submit() }}>
          <div className="field">
            <label htmlFor="mail">{M.mailLabel}</label>
            <input id="mail" className="input" type="email" name="email" autoComplete="email" inputMode="email" maxLength={120} required placeholder={M.mailPh}
              value={email} onChange={e => { setEmail(e.target.value); if (state !== 'busy') setSt('idle') }} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={state === 'busy'}>{state === 'busy' ? ctx.d.matches.joining : find ? M.mailFind : M.mailSave}</button>
          {state === 'bad' ? <p role="alert">{M.mailBad}</p> : state === 'slow' ? <p role="alert">{M.mailSlow}</p> : state === 'network' ? <p role="alert">{ctx.d.matches.linkError}</p> : null}
        </form>
      )}
      {!find && address ? <button type="button" className="btn btn--small" style={{ justifySelf: 'start' }} onClick={() => void removeEmail()}>{M.mailRemove}</button> : null}
      {hasList && !plain ? <button type="button" className="btn btn--small" style={{ justifySelf: 'start' }} onClick={() => { setFinding(v => !v); setSt('idle') }}>{finding ? M.mailH : M.mailFindH}</button> : null}
    </section>
  )
}

// ───────────────────────── My list on another phone ─────────────────────────
export function BackupSheet({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { d, c, hrefs } = ctx
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const make = async () => {
    setBusy(true); setFailed(false)
    const key = await deviceKey()
    setBusy(false)
    if (key) { setLink(`${window.location.origin}${hrefs.app}#k=${key}`); track('backup_link') } else setFailed(true)
  }
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="backup-h">
        <div className="sheet-head">
          <h2 id="backup-h">{d.menu.backupH}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={c.close}><IconX /></button>
        </div>
        <div className="sheet-scroll">
          <p>{d.menu.backupP}</p>
          {link ? (
            <>
              <ShareRow ctx={ctx} link={link} message="" />
              <p className="muted">{d.menu.backupWarn}</p>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--primary" onClick={make} disabled={busy}>{busy ? d.matches.joining : d.menu.backupCreate}</button>
              {failed ? <p role="alert">{d.matches.linkError}</p> : null}
            </>
          )}
          <MailBox ctx={ctx} />
        </div>
      </div>
    </div>
  )
}
