'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fromRow, type N, type Row } from '@/lib/model'
import { actions, getState, setState, useStore, EMPTY_FILTERS } from '@/lib/store'
import { adoptKey, checkPaid, confirmEmail, forgetAll, joinInvite, removeEmail, startSync, track, useRestoring } from '@/lib/sync'
import { limitsOf, type Wall } from '@/lib/premium'
import { decodeInvite } from '@/lib/share'
import { t } from '@/lib/t'
import { SwipeStack, type CardData, type Swipe } from '../SwipeStack'
import { IconCards, IconCopy, IconHeart, IconHome, IconLayers, IconMore, IconRefresh, IconSliders, IconStar, IconTrash, IconUser, IconUsers, IconX } from '../Icons'
import { activeCount, buildDeck } from './deck'
import { Quiz } from './Quiz'
import { FinalSheet } from './Final'
import { BackupSheet, FiltersSheet, LikesTab, ListsTab, MatchesTab } from './Panels'
import { PremiumSheet } from './Premium'
import { AccountScreen } from './Account'
import type { AppProps, Ctx } from './types'

type Tab = 'swipe' | 'lists' | 'likes' | 'matches'
/** The account screen comes up by itself at this many likes. */
const ACCOUNT_AT = 3

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
  const [news, setNews] = useState(0) // several new matches at once: announced as a number
  const [invite, setInvite] = useState<{ name: string; ids: number[] } | null>(null) // a list inside an old-style link
  const [key, setKey] = useState<string | null>(null) // a "my list on another phone" link was opened
  const [mailKey, setMailKey] = useState(false) // …and it came by email: it confirms the address too, and works once
  const [mailOff, setMailOff] = useState<string | 'done' | null>(null) // the "stop writing to me" link of an email
  const [showFinal, setShowFinal] = useState(false)
  const [join, setJoin] = useState<'ask' | 'busy' | 'taken' | 'unknown' | 'network'>('ask')
  const [takenBy, setTakenBy] = useState('')
  const [showBackup, setShowBackup] = useState(false)
  const [wall, setWall] = useState<Wall | null>(null)                 // the Premium offer, and why it came up
  const [account, setAccount] = useState<'ask' | 'open' | null>(null) // the account screen: it came up by itself, or from the menu
  const [paid, setPaid] = useState<'wait' | 'yes' | 'no' | null>(null) // back from the payment page
  const [mounted, setMounted] = useState(false)
  const restoring = useRestoring()
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

  // What the URL asks for: a list to swipe, a name to show first, a partner's invitation, a saved list to open.
  useEffect(() => {
    seed.current = (Date.now() & 0xffffffff) >>> 0
    const url = new URL(window.location.href)
    const list = url.searchParams.get('list')
    if (list && props.lists.some(x => x.key === list)) setState({ list })
    firstSlug.current = url.searchParams.get('n')
    const mine = getState()
    const joinLink = url.hash.match(/^#j=([a-z0-9]{6,20})(?:&n=([^&]*))?$/)
    const keyLink = url.hash.match(/^#k=([\w-]{20,})$/)
    const oldLink = url.hash.match(/^#p=([\w-]+)$/)
    const mailLink = url.hash.match(/^#m=([\w-]{20,})$/)
    const offLink = url.hash.match(/^#u=([a-z0-9]{16,40})$/)
    const paidLink = url.hash === '#paid'
    if (joinLink) {
      // Tapping your own link (to check it before sending) must not do anything.
      if (joinLink[1] !== mine.invite) {
        let name = ''
        try { name = decodeURIComponent(joinLink[2] || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 30) } catch { /* a mangled name is just left out */ }
        setState({ pending: { code: joinLink[1], name } }, { remote: true })
        track('invite_opened')
      }
    } else if (keyLink) {
      setKey(keyLink[1])
    } else if (mailLink) {
      setKey(mailLink[1]); setMailKey(true)
    } else if (offLink) {
      setMailOff(offLink[1])
    } else if (oldLink) {
      const inv = decodeInvite(oldLink[1])
      const own = !!inv && inv.name === mine.me.trim().slice(0, 30) && inv.ids.every(id => mine.likes[id])
      if (inv && inv.ids.length && !own) setInvite(inv)
    }
    // The address must not keep a code or a key: it would end up in the history and in screenshots.
    if (list || firstSlug.current || joinLink || keyLink || oldLink || mailLink || offLink || paidLink || url.searchParams.has('from')) window.history.replaceState(null, '', url.pathname)
    startSync(lang)
    // Back from Stripe, or a payment was started here and its outcome is still unknown: ask the server how it went.
    if (paidLink) {
      setPaid('wait')
      void checkPaid().then(async ok => {
        // Stripe can take a moment to mark the session as paid: ask once more before saying "not yet".
        if (!ok) { await new Promise(r => window.setTimeout(r, 3500)); ok = await checkPaid() }
        if (ok) track('premium_paid')
        setPaid(ok ? 'yes' : 'no')
      })
    } else if (mine.plan !== 'premium' && mine.payAt && Date.now() - mine.payAt < 7 * 86400_000) {
      void checkPaid().then(ok => { if (ok) { track('premium_paid'); setPaid('yes') } })
    }
    const onWall = (e: Event) => setWall((e as CustomEvent<Wall>).detail || 'open')
    window.addEventListener('bm:wall', onWall)
    track('app_open')
    // Where this visit to the app came from: a name page, a list, the home, a partner's link, or somewhere else.
    let fromHome = false
    try { fromHome = new URL(document.referrer).pathname.replace(/\/$/, '') === hrefs.home.replace(/\/$/, '') && new URL(document.referrer).origin === url.origin } catch { /* no referrer */ }
    track(url.searchParams.get('from') === 'vote' ? 'from_vote' : joinLink ? 'from_invite' : list ? 'from_list' : firstSlug.current ? 'from_name' : fromHome ? 'from_home' : 'from_other')
    setMounted(true)
    return () => window.removeEventListener('bm:wall', onWall)
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
  const partnerSupers = useMemo(() => new Set(s.partner?.supers || []), [s.partner])
  const likeIds = Object.keys(s.likes).map(Number)
  const matchIds = useMemo(() => Object.keys(s.likes).map(Number).filter(id => partnerLikes.has(id)), [s.likes, partnerLikes])
  const matchCount = matchIds.length

  // A match can also come from the other side: the partner liked something already in this list, or just joined.
  useEffect(() => {
    if (!mounted || !names) return
    const seen = new Set(getState().seen)
    const fresh = matchIds.filter(id => !seen.has(id))
    if (!fresh.length) return
    setState(st => ({ seen: [...st.seen, ...fresh] }), { remote: true })
    if (fresh.length === 1) setMatch(byId.get(fresh[0]) || null)
    else setNews(fresh.length)
    track('match')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchIds, mounted, names])

  // The free plan: a few likes and one superlike a day. Saying no to a name is never limited.
  const lim = limitsOf(s)
  function allow(dir: Swipe) {
    const fresh = limitsOf(getState())
    const ok = dir === 'super' ? fresh.canSuper : fresh.canLike
    if (!ok) { track('limit_hit'); setWall(dir === 'super' && fresh.canLike ? 'supers' : 'likes') }
    return ok
  }
  function onSwipe(dir: Swipe, card: CardData) {
    const total = Object.keys(s.likes).length + Object.keys(s.nopes).length + 1
    track('first_swipe', true)
    if (total >= 10) track('swipes_10', true)
    if (total >= 50) track('swipes_50', true)
    if (dir === 'nope') actions.nope(card.id)
    else {
      if (dir === 'super') { actions.superlike(card.id); track('superlike') } else actions.like(card.id)
      track('first_like', true)
      if (likeIds.length + 1 >= 10) track('likes_10', true)
      if (partnerLikes.has(card.id)) {
        setState(st => ({ seen: [...st.seen, card.id] }), { remote: true })
        setMatch(byId.get(card.id) || null)
        track('match')
      } else if (s.mail && !(s.email && s.email[1]) && !s.once.account_ask && likeIds.length + 1 >= ACCOUNT_AT) {
        // There is now a list to lose: offer the account that keeps it. Once, skippable, and never on top of a match.
        track('account_ask', true)
        setAccount('ask')
      }
    }
    setProg({ deck, pos: p.pos + 1, hist: [...p.hist, card.id] })
  }
  async function doJoin(claim = false) {
    const pending = getState().pending
    if (!pending) return
    setJoin('busy')
    const r = await joinInvite(pending.code, claim)
    if (r.result === 'taken') { setTakenBy(r.partner || ''); setJoin('taken') }
    else if (r.result === 'unknown' || r.result === 'network') setJoin(r.result)
    else {
      setJoin('ask')
      if (r.result === 'joined') { track('partner_joined'); if (s.quiz || s.quizSkipped) setTab('matches') }
    }
  }
  async function openKey() {
    if (!key) return
    setJoin('busy')
    const done = mailKey ? await confirmEmail(key) : await adoptKey(key)
    if (done) { setKey(null); setJoin('ask'); track(mailKey ? 'email_confirmed' : 'restored'); setTab('likes') } else setJoin('network')
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
  } else if (restoring || join === 'busy') {
    body = <div className="empty" role="status"><div className="spinner keep-motion" aria-hidden="true" /><p>{restoring ? d.menu.restoring : d.matches.joining}</p></div>
  } else if (key) {
    const failed = join === 'network'
    body = (
      <div className="quiz">
        <div className="welcome">
          <img src="/logo.png" alt="" width={96} height={96} />
          <h1>{failed ? (mailKey ? d.menu.mailLinkBadH : d.matches.networkH) : d.menu.keyH}</h1>
          <p className="lead">{failed ? (mailKey ? d.menu.mailLinkBadP : d.matches.networkP) : d.menu.keyP}</p>
        </div>
        <div className="quiz-foot">
          <button type="button" className="btn" onClick={() => { setKey(null); setJoin('ask') }}>{d.matches.importDecline}</button>
          <button type="button" className="btn btn--primary" onClick={openKey}>{failed ? d.retry : d.menu.keyAccept}</button>
        </div>
      </div>
    )
  } else if (mailOff) {
    const done = mailOff === 'done'
    body = (
      <div className="quiz">
        <div className="welcome">
          <img src="/logo.png" alt="" width={96} height={96} />
          <h1>{done ? d.menu.mailOffDone : d.menu.mailOffH}</h1>
          {done ? null : <p className="lead">{d.menu.mailOffP}</p>}
        </div>
        <div className="quiz-foot">
          <button type="button" className={done ? 'btn btn--primary' : 'btn'} onClick={() => setMailOff(null)}>{done ? c.close : d.matches.importDecline}</button>
          {done ? null : <button type="button" className="btn btn--primary" onClick={() => { void removeEmail(mailOff).then(() => setMailOff('done')) }}>{d.menu.mailOffYes}</button>}
        </div>
      </div>
    )
  } else if (s.pending || join === 'unknown') {
    const M = d.matches
    const who = s.pending?.name || ''
    const drop = () => { setState({ pending: null }, { remote: true }); setJoin('ask') }
    const [h, p2, yes, onYes] =
      join === 'taken' ? [M.takenH, t(M.takenP, { partner: takenBy || M.partnerFallback }), M.takenYes, () => doJoin(true)] as const
        : join === 'unknown' ? [M.unknownH, M.unknownP, '', drop] as const
          : join === 'network' ? [M.networkH, M.networkP, d.retry, () => doJoin()] as const
            : [who ? t(M.joinH, { partner: who }) : M.joinHAnon, M.joinP, M.joinAccept, () => doJoin()] as const
    body = (
      <div className="quiz">
        <div className="welcome">
          <img src="/logo.png" alt="" width={96} height={96} />
          <h1>{h}</h1>
          <p className="lead">{p2}</p>
          {join === 'ask' ? (
            <div className="field field--wide">
              <label htmlFor="me">{M.yourName}</label>
              <input id="me" className="input" name="given-name" autoComplete="given-name" maxLength={30} placeholder={M.yourNamePh} value={s.me}
                onChange={e => setState({ me: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') void doJoin() }} />
            </div>
          ) : null}
        </div>
        <div className="quiz-foot">
          <button type="button" className={yes ? 'btn' : 'btn btn--primary'} onClick={drop}>{join === 'taken' ? M.takenNo : yes ? M.importDecline : c.close}</button>
          {yes ? <button type="button" className="btn btn--primary" onClick={onYes}>{yes}</button> : null}
        </div>
      </div>
    )
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
          <button type="button" className="btn btn--primary" onClick={() => {
            setState({ partner: { name: invite.name, likes: invite.ids, at: Date.now() } })
            setInvite(null)
            // Someone already swiping wants the answer first: which names both like. A newcomer gets the questions.
            if (s.quiz || s.quizSkipped) setTab('matches')
          }}>{d.matches.importAccept}</button>
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
          ) : lim.limited ? (
            <button type="button" className="pill" onClick={() => setWall('open')}>
              <IconHeart size={16} />{lim.likesLeft ? t(d.premium.left, { count: lim.likesLeft }) : d.premium.leftNone}
            </button>
          ) : <span className="muted">{t(d.deck.remaining, { count: deck.length - p.pos })}</span>}
        </div>
        {rest.length ? (
          <SwipeStack cards={rest.map(toCard)} onSwipe={onSwipe} allow={allow} onUndo={undo} canUndo={p.hist.length > 0}
            superlike surname={s.surname || undefined}
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
    body = <ListsTab ctx={ctx} onPick={key => { setState({ list: key }); track('list_opened'); setTab('swipe') }} />
  } else if (tab === 'likes') {
    body = <LikesTab ctx={ctx} onSwipe={() => setTab('swipe')} onFinal={() => setShowFinal(true)} />
  } else {
    body = <MatchesTab ctx={ctx} onSwipe={() => setTab('swipe')} onFinal={() => setShowFinal(true)} />
  }

  const showTabs = !!ctx && mounted && !invite && !key && !mailOff && !s.pending && join === 'ask' && !restoring && !needsQuiz && !failed
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
            <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setAccount('open') }}><IconUser size={18} />{s.email && s.email[1] ? d.account.menuOn : d.account.menu}</button>
            <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setRedoQuiz(true) }}><IconRefresh size={18} />{d.menu.redoQuiz}</button>
            <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setShowBackup(true) }}><IconCopy size={18} />{d.menu.backup}</button>
            {s.pay ? <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setWall('open') }}><IconStar size={18} />{d.premium.menu}</button> : null}
            <a role="menuitem" href={hrefs.home}><IconHome size={18} />{d.menu.site}</a>
            <hr />
            <button type="button" role="menuitem" className="danger" onClick={() => {
              setShowMenu(false)
              if (window.confirm(d.menu.resetConfirm)) { void forgetAll(); setTab('swipe') }
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
      {showBackup && ctx ? <BackupSheet ctx={ctx} onClose={() => setShowBackup(false)} /> : null}
      {showFinal && ctx ? <FinalSheet ctx={ctx} onClose={() => setShowFinal(false)} /> : null}
      {account && ctx ? <AccountScreen ctx={ctx} ask={account === 'ask'} onClose={() => setAccount(null)} /> : null}
      {wall && ctx ? <PremiumSheet ctx={ctx} why={wall} onClose={() => setWall(null)} /> : null}

      {paid ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="paid-h">
          <h2 id="paid-h">{paid === 'yes' ? d.premium.paidH : paid === 'wait' ? d.premium.paidWait : d.premium.openH}</h2>
          {paid === 'wait' ? <div className="spinner keep-motion" aria-hidden="true" /> : <p className="lead">{paid === 'yes' ? d.premium.paidP + (s.email && s.email[1] ? ' ' + t(d.account.paidAs, { email: s.email[0] }) : '') : d.premium.paidNot}</p>}
          {paid === 'wait' ? null : <div className="actions"><button type="button" className="btn btn--primary" autoFocus onClick={() => setPaid(null)}>{paid === 'yes' ? d.matches.keepSwiping : c.close}</button></div>}
        </div>
      ) : null}

      {match || news ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-h">
          <h2 id="match-h">{match ? d.matches.overlayH : t(d.matches.overlayNewH, { count: news })}</h2>
          {match ? <div className="big">{match.name}</div> : null}
          <p className="lead">
            {t(match ? d.matches.overlayP : d.matches.overlayNewP, { partner: partnerName })}
            {match && partnerSupers.has(match.id) ? ' ' + t(d.matches.overlaySuper, { partner: partnerName }) : ''}
          </p>
          <div className="actions">
            <button type="button" className="btn btn--primary" autoFocus onClick={() => { setMatch(null); setNews(0) }}>{d.matches.keepSwiping}</button>
            <button type="button" className="btn" onClick={() => { setMatch(null); setNews(0); setTab('matches') }}>{d.matches.seeMatches}</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { EMPTY_FILTERS }
