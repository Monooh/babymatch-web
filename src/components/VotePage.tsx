'use client'
import { useEffect, useRef, useState } from 'react'
import type { Dict } from '@/i18n/dict'
import { t } from '@/lib/t'

// The page a couple's family and friends open to vote. No account and nothing kept about the voter but a random id
// in this browser (so a vote can be changed, not repeated) and the first name they choose to give.

const API = process.env.NEXT_PUBLIC_API_BASE || ''
const VOTER_KEY = 'babymatch:voter', NAME_KEY = 'babymatch:voter-name'
type Poll = { code: string; names: [number, string][]; who: string[]; counts?: Record<number, number>; total?: number }
type Reply = { ok?: boolean; error?: string; poll?: Poll; mine?: number | null }

const read = (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* blocked: the vote still counts once per visit */ } }
function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
}
async function call(path: string, body: Record<string, unknown>): Promise<Reply & { status: number }> {
  const res = await fetch(API + path, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { status: res.status, ...((await res.json().catch(() => ({}))) as Reply) }
}

export function VotePage({ lang, v, retry, loading, appHref, homeHref }: { lang: string; v: Dict['vote']; retry: string; loading: string; appHref: string; homeHref: string }) {
  const [poll, setPoll] = useState<Poll | 'loading' | 'gone' | 'error'>('loading')
  const [mine, setMine] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [full, setFull] = useState(false)
  const code = useRef(''), voter = useRef('')

  const count = (event: string) => {
    const body = JSON.stringify({ ev: { [event]: 1 }, lang })
    try { if (!navigator.sendBeacon || !navigator.sendBeacon(API + '/api/e', body)) void fetch(API + '/api/e', { method: 'POST', body, keepalive: true, credentials: 'omit' }).catch(() => {}) } catch { /* best effort */ }
  }
  const load = () => {
    setPoll('loading')
    call('/api/poll/get', { code: code.current, voter: voter.current })
      .then(r => { if (r.ok && r.poll) { setPoll(r.poll); setMine(r.mine ?? null) } else setPoll(r.status === 404 ? 'gone' : 'error') })
      .catch(() => setPoll('error'))
  }
  useEffect(() => {
    const m = window.location.hash.match(/^#v=([a-z0-9]{6,20})$/)
    if (!m) { setPoll('gone'); return }
    code.current = m[1]
    voter.current = read(VOTER_KEY) || newId()
    write(VOTER_KEY, voter.current)
    setName(read(NAME_KEY) || '')
    load()
    count('vote_opened')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const vote = async (id: number) => {
    if (busy || id === mine) return
    setBusy(true); setFull(false)
    const clean = name.trim().slice(0, 30)
    if (clean) write(NAME_KEY, clean)
    try {
      const r = await call('/api/vote', { code: code.current, voter: voter.current, id, name: clean })
      if (r.ok && r.poll) { if (mine === null) count('vote_cast'); setPoll(r.poll); setMine(id) }
      else if (r.error === 'full') setFull(true)
      else setPoll(r.status === 404 ? 'gone' : 'error')
    } catch { setPoll('error') }
    setBusy(false)
  }

  let body: React.ReactNode
  if (poll === 'loading') {
    body = <div className="empty" role="status"><div className="spinner keep-motion" aria-hidden="true" /><p>{loading}</p></div>
  } else if (poll === 'gone' || poll === 'error') {
    body = (
      <div className="quiz">
        <div className="welcome">
          <img src="/logo.png" alt="" width={96} height={96} />
          <h1>{poll === 'gone' ? v.goneH : v.errorH}</h1>
          <p className="lead">{poll === 'gone' ? v.goneP : v.errorP}</p>
        </div>
        <div className="quiz-foot">
          {poll === 'error' ? <button type="button" className="btn" onClick={load}>{retry}</button> : null}
          <a className="btn btn--primary" href={`${appHref}?from=vote`}>{v.cta}</a>
        </div>
      </div>
    )
  } else {
    const [a, b] = poll.who
    const most = Math.max(1, ...poll.names.map(([id]) => poll.counts?.[id] || 0))
    const voted = mine !== null ? poll.names.find(n => n[0] === mine)?.[1] : null
    body = (
      <div className="app-pad vote">
        <div>
          <h1 className="app-h">{v.h}</h1>
          <p className="lead">{a && b ? t(v.pTwo, { a, b }) : a ? t(v.pOne, { a }) : v.pNone}</p>
        </div>
        {mine === null ? (
          <div className="field">
            <label htmlFor="voter">{v.yourName}</label>
            <input id="voter" className="input" name="given-name" autoComplete="given-name" maxLength={30} placeholder={v.yourNamePh} value={name} onChange={e => setName(e.target.value)} />
          </div>
        ) : <p role="status">{t(v.voted, { name: voted || '' })}</p>}
        <div className="vote-list">
          {poll.names.map(([id, label]) => (
            <button key={id} type="button" className="duel-card duel-card--row" aria-pressed={mine === id} disabled={busy} onClick={() => void vote(id)}><b>{label}</b></button>
          ))}
        </div>
        {full ? <p role="alert">{v.fullP}</p> : null}
        {mine !== null && poll.counts ? (
          <div>
            <h2 className="subhead">{v.results} · {t(v.total, { count: poll.total || 0 })}</h2>
            <ul className="bars bars--vote">
              {poll.names.map(([id, label]) => {
                const n = poll.counts?.[id] || 0
                return <li key={id} style={{ ['--w' as string]: n / most }}><span>{label}</span><i /><b>{n}</b></li>
              })}
            </ul>
          </div>
        ) : null}
        <section className="panel panel--mint">
          <div><h2>{v.ctaH}</h2><p>{v.ctaP}</p></div>
          <a className="btn btn--primary" href={`${appHref}?from=vote`}>{v.cta}</a>
        </section>
      </div>
    )
  }
  return (
    <div className="app">
      <header className="app-bar">
        <a className="wordmark" href={homeHref}><img src="/logo.png" alt="" width={32} height={32} /><span>BabyMatch</span></a>
      </header>
      <main className="app-main" id="main">{body}</main>
    </div>
  )
}
