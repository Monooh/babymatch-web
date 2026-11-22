'use client'
import { useMemo, useState } from 'react'
import { CULTURES, LETTERS, TAGS, fold, type Culture, type Gender, type N, type Tag } from '@/lib/model'
import { actions, setState, useStore, EMPTY_FILTERS, type Filters } from '@/lib/store'
import { encodeInvite } from '@/lib/share'
import { t } from '@/lib/t'
import { IconCheck, IconCopy, IconShare, IconStar, IconTrash, IconX } from '../Icons'
import { passes } from './deck'
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
          <button type="button" className="btn btn--primary" onClick={() => { setState({ filters: f }); onClose() }}>{t(F.apply, { count })}</button>
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
function NameRow({ n, ctx, starred }: { n: N; ctx: Ctx; starred?: boolean }) {
  const { d, hrefs } = ctx
  return (
    <li>
      <a className="who" href={`${hrefs.names}/${n.slug}`} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
        <b>{n.name}</b><span>{n.meaning}</span>
      </a>
      {starred !== undefined ? (
        <>
          <button type="button" className="icon-btn" aria-pressed={starred} aria-label={`${starred ? d.likes.favOn : d.likes.favOff}: ${n.name}`} onClick={() => actions.toggleStar(n.id)}><IconStar size={20} /></button>
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

export function LikesTab({ ctx, onSwipe }: { ctx: Ctx; onSwipe: () => void }) {
  const { d, c, byId } = ctx
  const s = useStore()
  const [copied, copy] = useCopy()
  const liked = Object.entries(s.likes).sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(Number(id))).filter((n): n is N => !!n)
  const stars = liked.filter(n => s.stars.includes(n.id))
  const rest = liked.filter(n => !s.stars.includes(n.id))
  if (!liked.length) {
    return <div className="empty"><h2>{d.likes.emptyH}</h2><p>{d.likes.emptyP}</p><button type="button" className="btn btn--primary" onClick={onSwipe}>{c.startSwiping}</button></div>
  }
  return (
    <div className="app-pad">
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
        <div><h1 className="app-h">{d.likes.h}</h1><p className="muted">{t(d.likes.count, { count: liked.length })}</p></div>
        <button type="button" className="btn btn--small" onClick={() => copy(liked.map(n => n.name).join('\n'))}>
          {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}{copied ? c.copied : d.likes.copyList}
        </button>
      </div>
      {stars.length ? (<div><h2 className="subhead">{d.likes.favourites}</h2><ul className="rowlist">{stars.map(n => <NameRow key={n.id} n={n} ctx={ctx} starred />)}</ul></div>) : null}
      {rest.length ? (<div>{stars.length ? <h2 className="subhead">{d.likes.others}</h2> : null}<ul className="rowlist">{rest.map(n => <NameRow key={n.id} n={n} ctx={ctx} starred={false} />)}</ul></div>) : null}
    </div>
  )
}

// ───────────────────────── Matches ─────────────────────────
function InviteMaker({ ctx, title, text }: { ctx: Ctx; title: string; text: string }) {
  const { d, c, hrefs } = ctx
  const M = d.matches
  const s = useStore()
  const [link, setLink] = useState('')
  const [copied, copy] = useCopy()
  const ids = Object.keys(s.likes).map(Number)
  const message = s.me.trim() ? t(M.shareText, { name: s.me.trim() }) : M.shareTextAnon
  const make = () => setLink(`${window.location.origin}${hrefs.app}#p=${encodeInvite(s.me, ids)}`)
  const share = () => {
    if (navigator.share) navigator.share({ text: message, url: link }).catch(() => {})
    else copy(`${message} ${link}`)
  }
  return (
    <section className="panel panel--sugar">
      <div><h2>{title}</h2><p>{text}</p></div>
      {!ids.length ? <p>{M.needLikes}</p> : link ? (
        <>
          <div><strong>{M.linkReady}</strong><p>{t(M.linkHint, { count: ids.length })}</p></div>
          <div className="linkbox">{link}</div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" onClick={share}><IconShare size={20} />{c.share}</button>
            <button type="button" className="btn" onClick={() => copy(link)}>{copied ? <IconCheck size={20} /> : <IconCopy size={20} />}{copied ? c.copied : c.copy}</button>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="me">{M.yourName}</label>
            <input id="me" className="input" name="given-name" autoComplete="given-name" maxLength={30} placeholder={M.yourNamePh} value={s.me} onChange={e => setState({ me: e.target.value })} />
          </div>
          <button type="button" className="btn btn--primary" onClick={make}>{M.createLink}</button>
        </>
      )}
    </section>
  )
}

export function MatchesTab({ ctx, onSwipe }: { ctx: Ctx; onSwipe: () => void }) {
  const { d, byId } = ctx
  const M = d.matches
  const s = useStore()
  if (!s.partner) {
    return <div className="app-pad"><h1 className="app-h">{M.h}</h1><InviteMaker ctx={ctx} title={M.inviteH} text={M.inviteP} /></div>
  }
  const partner = s.partner.name || M.partnerFallback
  const theirs = new Set(s.partner.likes)
  const matches = Object.keys(s.likes).map(Number).filter(id => theirs.has(id)).map(id => byId.get(id)).filter((n): n is N => !!n)
    .sort((a, b) => Number(s.stars.includes(b.id)) - Number(s.stars.includes(a.id)) || a.name.localeCompare(b.name))
  return (
    <div className="app-pad">
      <div><h1 className="app-h">{M.h}</h1><p className="muted">{t(M.partnerH, { partner, count: s.partner.likes.length })}</p></div>
      {matches.length ? (
        <ul className="rowlist">{matches.map(n => <NameRow key={n.id} n={n} ctx={ctx} />)}</ul>
      ) : (
        <section className="panel panel--mint">
          <div><h2>{M.emptyH}</h2><p>{t(M.emptyP, { partner })}</p><p>{M.partnerP}</p></div>
          <button type="button" className="btn" onClick={onSwipe}>{M.keepSwiping}</button>
        </section>
      )}
      <InviteMaker ctx={ctx} title={M.sendBack} text={t(M.sendBackP, { partner })} />
      <button type="button" className="btn btn--small" style={{ justifySelf: 'start' }} onClick={() => setState({ partner: null })}>{M.forget}</button>
    </div>
  )
}
