'use client'
import { useEffect, useMemo, useState } from 'react'
import type { N } from '@/lib/model'
import { getState, setState, useStore, type State } from '@/lib/store'
import { closePoll, myPoll, openPoll, track, type Poll } from '@/lib/sync'
import { duelsPlayed, enoughDuels, initialsOf, nextPair, play, ranking, soundNotes } from '@/lib/final'
import { t } from '@/lib/t'
import { IconCheck, IconX } from '../Icons'
import { ShareRow } from './Panels'
import type { Ctx } from './types'

// From "names we like" to one name: duels, the finalists next to the surname, and a vote for family and friends.

const FINALISTS = 5
type View = 'duel' | 'top' | 'vote'

/** The names the final round is played with: what both like when there is a partner, the person's own likes otherwise. */
export function finalPool(s: State, byId: Map<number, N>): number[] {
  const theirs = s.partner ? new Set(s.partner.likes) : null
  return Object.keys(s.likes).map(Number).filter(id => byId.has(id) && (!theirs || theirs.has(id)))
}
function useOrder(s: State, pool: number[], byId: Map<number, N>) {
  return useMemo(() => {
    const mine = new Set(s.stars), theirs = new Set(s.partner?.supers || [])
    return ranking(pool, s.final, s.partner?.final, id => Number(mine.has(id)) + Number(theirs.has(id)), id => byId.get(id)!.name)
  }, [s.final, s.partner, s.stars, pool, byId])
}
/** The name both have marked as "this is the one", if they agree. Alone, the person's own pick. */
export function chosenName(s: State, byId: Map<number, N>): N | null {
  const pick = s.final.pick
  if (pick === null || !s.likes[pick]) return null
  if (s.partner?.id && s.partner.final?.pick !== pick) return null
  return byId.get(pick) || null
}

/** The way into the final round, shown where the names to choose from are listed. */
export function FinalCard({ ctx, onOpen }: { ctx: Ctx; onOpen: () => void }) {
  const F = ctx.d.final
  const s = useStore()
  const chosen = chosenName(s, ctx.byId)
  const partner = s.partner?.name || ctx.d.matches.partnerFallback
  return (
    <section className="panel panel--mint">
      {chosen ? (
        <div><h2>{F.pickBothH}</h2><p>{s.partner?.id ? t(F.pickBothP, { partner, name: chosen.name }) : chosen.name}</p></div>
      ) : (
        <div><h2>{F.cardH}</h2><p>{F.cardP}</p></div>
      )}
      <button type="button" className={chosen ? 'btn' : 'btn btn--primary'} onClick={onOpen}>{chosen ? F.title : F.open}</button>
    </section>
  )
}

export function FinalSheet({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { d, c, byId } = ctx
  const F = d.final
  const s = useStore()
  const pool = useMemo(() => finalPool(s, byId), [s.likes, s.partner, byId]) // eslint-disable-line react-hooks/exhaustive-deps
  const order = useOrder(s, pool, byId)
  const played = duelsPlayed(s.final, pool)
  const [view, setView] = useState<View>(() => (played >= enoughDuels(pool.length) ? 'top' : 'duel'))
  useEffect(() => { track('final_opened') }, [])

  return (
    <div className="sheet-back">
      <div className="sheet-panel sheet-panel--full" role="dialog" aria-modal="true" aria-labelledby="final-h">
        <div className="sheet-head">
          <h2 id="final-h">{F.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={c.close}><IconX /></button>
        </div>
        <div className="seg" role="group" aria-label={F.title}>
          {([['duel', F.tabDuel], ['top', F.tabTop], ['vote', F.tabVote]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <div className="sheet-scroll">
          {pool.length < 2 ? <p className="muted">{F.duelNeed}</p>
            : view === 'duel' ? <Duels ctx={ctx} pool={pool} onDone={() => setView('top')} />
              : view === 'top' ? <Finalists ctx={ctx} order={order} pool={pool} />
                : <Vote ctx={ctx} names={order.slice(0, FINALISTS).map(id => [id, byId.get(id)!.name])} />}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Duels ─────────────────────────
function Duels({ ctx, pool, onDone }: { ctx: Ctx; pool: number[]; onDone: () => void }) {
  const { byId } = ctx
  const F = ctx.d.final
  const s = useStore()
  const [pair, setPair] = useState<[number, number] | null>(() => nextPair(pool, getState().final, null))
  const played = duelsPlayed(s.final, pool)
  const enough = played >= enoughDuels(pool.length)
  if (!pair) return null
  const choose = (winner: number, loser: number) => {
    const next = play(getState().final, winner, loser)
    setState({ final: next })
    track('duel')
    if (duelsPlayed(next, pool) >= 10) track('duels_10', true)
    setPair(nextPair(pool, next, [winner, loser]))
  }
  const [a, b] = pair.map(id => byId.get(id)!)
  return (
    <div className="duel">
      <div><h3 className="app-h">{F.duelH}</h3><p className="muted">{F.duelP}</p></div>
      {/* The key makes each new pair a fresh pair of buttons, so focus and the pressed look never carry over. */}
      <button key={`${a.id}-${b.id}-a`} type="button" className="duel-card" onClick={() => choose(a.id, b.id)}>
        <b>{a.name}</b>{s.surname ? <i>{s.surname}</i> : null}<span>{a.meaning}</span>
      </button>
      <button key={`${a.id}-${b.id}-b`} type="button" className="duel-card" onClick={() => choose(b.id, a.id)}>
        <b>{b.name}</b>{s.surname ? <i>{s.surname}</i> : null}<span>{b.meaning}</span>
      </button>
      <div className="duel-foot">
        <span className="muted" role="status">{t(F.duelCount, { count: played })}</span>
        <button type="button" className="btn btn--small" onClick={() => setPair(nextPair(pool, getState().final, pair))}>{F.duelSkip}</button>
      </div>
      {enough ? (
        <section className="panel panel--sugar"><p>{F.duelEnough}</p><button type="button" className="btn btn--primary" onClick={onDone}>{F.duelSee}</button></section>
      ) : null}
    </div>
  )
}

// ───────────────────────── Finalists ─────────────────────────
function Finalists({ ctx, order, pool }: { ctx: Ctx; order: number[]; pool: number[] }) {
  const { d, byId, lang } = ctx
  const F = d.final
  const s = useStore()
  const partner = s.partner?.name || d.matches.partnerFallback
  const theirs = s.partner?.final
  const theyPlayed = !!theirs && duelsPlayed(theirs, pool) > 0
  const [canSpeak, setCanSpeak] = useState(false)
  useEffect(() => { setCanSpeak('speechSynthesis' in window) }, [])
  const say = (text: string) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  const chosen = chosenName(s, byId)
  const top = order.slice(0, FINALISTS), rest = order.slice(FINALISTS)
  const noteText = { rhyme: F.noteRhyme, clash: F.noteClash, same: F.noteSame }
  return (
    <>
      {chosen && s.partner?.id ? (
        <section className="panel panel--mint" role="status"><div><h3>{F.pickBothH}</h3><p>{t(F.pickBothP, { partner, name: chosen.name })}</p></div></section>
      ) : null}
      <div>
        <h3 className="app-h">{F.topH}</h3>
        <p className="muted">{!s.partner?.id ? F.topPSolo : theyPlayed ? t(F.topPBoth, { partner }) : t(F.topPWait, { partner })}</p>
      </div>
      <div className="field">
        <label htmlFor="final-surname">{F.surnameLabel}</label>
        <input id="final-surname" className="input" name="family-name" autoComplete="family-name" maxLength={40} placeholder={F.surnamePh} value={s.surname}
          onChange={e => setState({ surname: e.target.value.slice(0, 40) })} onBlur={() => { if (getState().surname.trim()) track('surname_set', true) }} />
      </div>
      <ol className="finalists">
        {top.map((id, i) => {
          const n = byId.get(id)!
          const surname = s.surname.trim()
          const full = surname ? `${n.name} ${surname}` : n.name
          const mine = s.final.pick === id, also = !!s.partner?.id && theirs?.pick === id
          return (
            <li key={id}>
              <span className="rank" aria-hidden="true">{i + 1}</span>
              <div className="who">
                <b>{full}</b>
                <span>{surname ? `${initialsOf(n.name, surname)} · ` : ''}{n.meaning}</span>
                {surname ? soundNotes(n.name, surname).map(k => <span key={k}>{noteText[k]}</span>) : null}
                {also ? <em className="chip chip--super">{t(F.pickTheirs, { partner })}</em> : null}
              </div>
              <div className="acts">
                {canSpeak ? <button type="button" className="btn btn--small" onClick={() => say(full)}>{F.listen}</button> : null}
                <button type="button" className={mine ? 'btn btn--small btn--primary' : 'btn btn--small'} aria-pressed={mine}
                  onClick={() => setState({ final: { ...getState().final, pick: mine ? null : id } })}>
                  {mine ? <IconCheck size={18} /> : null}{mine ? F.picked : F.pick}
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      {rest.length ? <p className="muted">{rest.map(id => byId.get(id)!.name).join(' · ')}</p> : null}
    </>
  )
}

// ───────────────────────── The vote ─────────────────────────
function Vote({ ctx, names }: { ctx: Ctx; names: [number, string][] }) {
  const { d, hrefs } = ctx
  const F = d.final
  const s = useStore()
  // undefined: still asking · null: no vote open · 'error': the server did not answer
  const [poll, setPoll] = useState<Poll | null | undefined | 'error'>(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    const load = () => { void myPoll().then(p => { if (alive) setPoll(prev => (p === undefined ? (prev && prev !== 'error' ? prev : 'error') : p)) }) }
    load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, 20_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])
  const open = async () => {
    setBusy(true)
    const p = await openPoll(names)
    setBusy(false)
    if (p) { if (poll === null) track('poll_created'); setPoll(p) } else setPoll('error')
  }
  if (poll === undefined) return <div className="empty" role="status"><div className="spinner keep-motion" aria-hidden="true" /></div>
  if (poll === 'error') return <><p role="alert">{F.voteError}</p><button type="button" className="btn" onClick={() => { setPoll(undefined); void myPoll().then(p => setPoll(p === undefined ? 'error' : p)) }}>{d.retry}</button></>
  if (!poll) {
    return (
      <>
        <div><h3 className="app-h">{F.voteH}</h3><p className="muted">{F.voteP}</p></div>
        <p>{t(F.voteNames, { names: names.map(n => n[1]).join(', ') })}</p>
        {s.partner?.id && s.me.trim() ? null : (
          <div className="field">
            <label htmlFor="vote-me">{d.matches.yourName}</label>
            <input id="vote-me" className="input" name="given-name" autoComplete="given-name" maxLength={30} value={s.me} onChange={e => setState({ me: e.target.value })} />
          </div>
        )}
        <button type="button" className="btn btn--primary" onClick={open} disabled={busy}>{busy ? d.matches.joining : F.voteCreate}</button>
      </>
    )
  }
  const link = `${window.location.origin}${hrefs.vote}#v=${poll.code}`
  const total = poll.total || 0
  const most = Math.max(1, ...poll.names.map(([id]) => poll.counts?.[id] || 0))
  const changed = names.map(n => n[0]).join() !== poll.names.map(n => n[0]).join()
  return (
    <>
      <div><h3 className="app-h">{F.voteH}</h3><p className="muted">{total ? t(F.voteTotal, { count: total }) : F.voteNone}</p></div>
      <ul className="bars bars--vote">
        {poll.names.map(([id, name]) => {
          const n = poll.counts?.[id] || 0
          return <li key={id} style={{ ['--w' as string]: n / most }}><span>{name}</span><i /><b>{n}</b></li>
        })}
      </ul>
      <ShareRow ctx={ctx} link={link} message={F.voteShare} onShared={() => track('poll_shared')} />
      {poll.voters?.length ? (
        <div>
          <h4 className="subhead">{F.voteVoters}</h4>
          <ul className="rowlist">{poll.voters.map(([who, id], i) => <li key={i}><span className="who"><b>{who}</b><span>{poll.names.find(n => n[0] === id)?.[1]}</span></span></li>)}</ul>
        </div>
      ) : null}
      <div className="share-row">
        {changed ? <button type="button" className="btn btn--small" onClick={open} disabled={busy}>{F.voteUpdate}</button> : null}
        <button type="button" className="btn btn--small" onClick={() => { if (window.confirm(F.voteCloseConfirm)) void closePoll().then(done => { if (done) setPoll(null) }) }}>{F.voteClose}</button>
      </div>
    </>
  )
}
