'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fromRow, type N, type Row } from '@/lib/model'
import { actions, setState, useStore, EMPTY_FILTERS } from '@/lib/store'
import { decodeInvite } from '@/lib/share'
import { t } from '@/lib/t'
import { SwipeStack, type CardData } from '../SwipeStack'
import { IconCards, IconHeart, IconHome, IconLayers, IconMore, IconRefresh, IconSliders, IconTrash, IconUsers, IconX } from '../Icons'
import { activeCount, buildDeck } from './deck'
import { Quiz } from './Quiz'
import { FiltersSheet, LikesTab, ListsTab, MatchesTab } from './Panels'
import type { AppProps, Ctx } from './types'

type Tab = 'swipe' | 'lists' | 'likes' | 'matches'

export function BabyApp(props: AppProps) {
  const { lang, d, c, hrefs } = props
  const s = useStore()
  const [names, setNames] = useState<N[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<Tab>('swipe')
  const [showFilters, setShowFilters] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [redoQuiz, setRedoQuiz] = useState(false)
  const [match, setMatch] = useState<N | null>(null)
  const [invite, setInvite] = useState<{ name: string; ids: number[] } | null>(null)
  const [mounted, setMounted] = useState(false)
  const seed = useRef(1)
  const firstSlug = useRef<string | null>(null)

  // Names for this language, fetched once.
  useEffect(() => {
    let alive = true
    setFailed(false)
    fetch(`/data/names.${lang}.json`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((rows: Row[]) => { if (alive) setNames(rows.map(fromRow)) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [lang, attempt])

  // What the URL asks for: a list to swipe, a name to show first, a partner's likes.
  useEffect(() => {
    seed.current = (Date.now() & 0xffffffff) >>> 0
    const url = new URL(window.location.href)
    const list = url.searchParams.get('list')
    if (list && props.lists.some(x => x.key === list)) setState({ list })
    firstSlug.current = url.searchParams.get('n')
    const m = url.hash.match(/^#p=([\w-]+)$/)
    if (m) {
      const inv = decodeInvite(m[1])
      if (inv && inv.ids.length) setInvite(inv)
    }
    if (list || firstSlug.current || m) window.history.replaceState(null, '', url.pathname)
    setMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const byId = useMemo(() => new Map((names || []).map(n => [n.id, n])), [names])
  const ctx: Ctx | null = names ? { ...props, names, byId } : null

  // The deck is rebuilt when taste changes, never on a single swipe (that would reshuffle under the user's thumb).
  const deckKey = JSON.stringify([s.filters, s.list, s.quiz, s.partner?.at, Object.keys(s.nopes).length === 0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deck = useMemo(() => (names && mounted ? buildDeck(names, s, seed.current, firstSlug.current) : []), [names, mounted, deckKey])
  const [prog, setProg] = useState<{ deck: N[]; pos: number; hist: number[] }>({ deck, pos: 0, hist: [] })
  const p = prog.deck === deck ? prog : { deck, pos: 0, hist: [] as number[] }
  const rest = deck.slice(p.pos, p.pos + 3)

  const gLabel = (g: string) => (g === 'f' ? c.girl : g === 'm' ? c.boy : c.unisex)
  const toCard = (n: N): CardData => ({
    id: n.id, name: n.name, g: n.g, gLabel: gLabel(n.g), origin: props.labels.cultures[n.cultures[0]], meaning: n.meaning,
    tags: n.tags.slice(0, 3).map(x => props.labels.tags[x]),
    meta: (
      <div className="card-meta">
        <span>{props.pop[n.pop - 1]}</span>
        <a href={`${hrefs.names}/${n.slug}`} target="_blank" rel="noopener">{d.deck.details}</a>
      </div>
    ),
  })

  const partnerLikes = useMemo(() => new Set(s.partner?.likes || []), [s.partner])
  const likeIds = Object.keys(s.likes).map(Number)
  const matchCount = likeIds.filter(id => partnerLikes.has(id)).length

  function onSwipe(dir: 'like' | 'nope', card: CardData) {
    if (dir === 'like') {
      actions.like(card.id)
      if (partnerLikes.has(card.id)) setMatch(byId.get(card.id) || null)
    } else actions.nope(card.id)
    setProg({ deck, pos: p.pos + 1, hist: [...p.hist, card.id] })
  }
  function undo() {
    const id = p.hist[p.hist.length - 1]
    if (id === undefined) return
    actions.unswipe(id)
    setProg({ deck, pos: p.pos - 1, hist: p.hist.slice(0, -1) })
  }

  const needsQuiz = mounted && ((!s.quiz && !s.quizSkipped) || redoQuiz)
  const activeList = s.list ? props.lists.find(x => x.key === s.list) : null
  const nFilters = activeCount(s.filters)
  const partnerName = s.partner?.name || d.matches.partnerFallback

  let body: React.ReactNode
  if (failed) {
    body = (
      <div className="empty">
        <h2>{d.loadError}</h2>
        <button type="button" className="btn" onClick={() => setAttempt(a => a + 1)}><IconRefresh size={20} />{d.retry}</button>
      </div>
    )
  } else if (!ctx || !mounted) {
    body = <div className="empty" role="status"><div className="spinner keep-motion" aria-hidden="true" /><p>{d.loading}</p></div>
  } else if (invite) {
    body = (
      <div className="quiz">
        <div className="welcome">
          <img src="/logo.png" alt="" width={96} height={96} />
          <h1>{invite.name ? t(d.matches.importH, { partner: invite.name, count: invite.ids.length }) : t(d.matches.importHAnon, { count: invite.ids.length })}</h1>
          <p className="lead">{d.matches.importP}</p>
        </div>
        <div className="quiz-foot">
          <button type="button" className="btn" onClick={() => setInvite(null)}>{d.matches.importDecline}</button>
          <button type="button" className="btn btn--primary" onClick={() => { setState({ partner: { name: invite.name, likes: invite.ids, at: Date.now() } }); setInvite(null) }}>{d.matches.importAccept}</button>
        </div>
      </div>
    )
  } else if (needsQuiz) {
    body = <Quiz ctx={ctx} onDone={() => { setRedoQuiz(false); setTab('swipe') }} />
  } else if (tab === 'swipe') {
    body = (
      <div className="swipe">
        <div className="swipe-bar">
          <button type="button" className="btn btn--small" onClick={() => setShowFilters(true)}>
            <IconSliders size={18} />{d.deck.filters}{nFilters ? ` (${nFilters})` : ''}
          </button>
          {activeList ? (
            <button type="button" className="pill" onClick={() => setState({ list: null })} aria-label={`${d.deck.clearList}: ${activeList.title}`} title={d.deck.clearList}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '11rem' }}>{activeList.title}</span><IconX size={16} />
            </button>
          ) : <span className="muted">{t(d.deck.remaining, { count: deck.length - p.pos })}</span>}
        </div>
        {rest.length ? (
          <SwipeStack cards={rest.map(toCard)} onSwipe={onSwipe} onUndo={undo} canUndo={p.hist.length > 0}
            onStar={card => { if (!s.likes[card.id]) actions.like(card.id); actions.toggleStar(card.id) }}
            starred={s.stars.includes(rest[0].id)} surname={s.surname || undefined}
            labels={{ like: c.like, nope: c.nope, undo: c.undo, star: c.star }} />
        ) : (
          <div className="empty">
            <h2>{d.deck.emptyH}</h2>
            <p>{d.deck.emptyP}</p>
            <button type="button" className="btn btn--primary" onClick={() => setShowFilters(true)}>{d.deck.changeFilters}</button>
            {p.hist.length > 0 ? <button type="button" className="btn" onClick={undo}>{c.undo}</button> : null}
            {Object.keys(s.nopes).length > 0 ? <button type="button" className="btn" onClick={() => actions.clearNopes()}>{d.deck.seeAgain}</button> : null}
          </div>
        )}
      </div>
    )
  } else if (tab === 'lists') {
    body = <ListsTab ctx={ctx} onPick={key => { setState({ list: key }); setTab('swipe') }} />
  } else if (tab === 'likes') {
    body = <LikesTab ctx={ctx} onSwipe={() => setTab('swipe')} />
  } else {
    body = <MatchesTab ctx={ctx} onSwipe={() => setTab('swipe')} />
  }

  const showTabs = !!ctx && mounted && !invite && !needsQuiz && !failed
  const tabs: [Tab, string, React.ReactNode, number][] = [
    ['swipe', d.tabSwipe, <IconCards key="i" size={22} />, 0],
    ['lists', d.tabLists, <IconLayers key="i" size={22} />, 0],
    ['likes', d.tabLikes, <IconHeart key="i" size={22} />, likeIds.length],
    ['matches', d.tabMatches, <IconUsers key="i" size={22} />, matchCount],
  ]

  return (
    <div className="app">
      <header className="app-bar">
        <a className="wordmark" href={hrefs.home}><img src="/logo.png" alt="" width={32} height={32} /><span>BabyMatch</span></a>
        <button type="button" className="icon-btn" aria-label={d.menu.open} aria-expanded={showMenu} aria-haspopup="menu" onClick={() => setShowMenu(v => !v)}><IconMore /></button>
      </header>

      {showMenu ? (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} aria-hidden="true" />
          <div className="menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setRedoQuiz(true) }}><IconRefresh size={18} />{d.menu.redoQuiz}</button>
            <a role="menuitem" href={hrefs.home}><IconHome size={18} />{d.menu.site}</a>
            <hr />
            <button type="button" role="menuitem" className="danger" onClick={() => {
              setShowMenu(false)
              if (window.confirm(d.menu.resetConfirm)) { actions.reset(); setTab('swipe') }
            }}><IconTrash size={18} />{d.menu.reset}</button>
          </div>
        </>
      ) : null}

      <main className="app-main" id="main">{body}</main>

      {showTabs ? (
        <nav className="tabs" aria-label="BabyMatch">
          {tabs.map(([id, label, icon, badge]) => (
            <button key={id} type="button" className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {icon}<span>{label}</span>
              {badge ? <span className="badge">{badge > 99 ? '99+' : badge}</span> : null}
            </button>
          ))}
        </nav>
      ) : null}

      {showFilters && ctx ? <FiltersSheet ctx={ctx} onClose={() => setShowFilters(false)} /> : null}

      {match ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-h">
          <h2 id="match-h">{d.matches.overlayH}</h2>
          <div className="big">{match.name}</div>
          <p className="lead">{t(d.matches.overlayP, { partner: partnerName })}</p>
          <div className="actions">
            <button type="button" className="btn btn--primary" autoFocus onClick={() => setMatch(null)}>{d.matches.keepSwiping}</button>
            <button type="button" className="btn" onClick={() => { setMatch(null); setTab('matches') }}>{d.matches.seeMatches}</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { EMPTY_FILTERS }
