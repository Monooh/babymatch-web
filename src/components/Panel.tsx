'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'

// The owner's usage panel (/es/panel). It draws what cloudflare/api/admin.js returns: the anonymous daily counters
// of every step and the saved lists in aggregate. Getting in is a link sent by email; this browser then keeps a
// secret of its own. Spanish only, like the person who reads it.

const API = process.env.NEXT_PUBLIC_API_BASE || ''
const KEY = 'babymatch:panel'
const PERIODS = [7, 30, 90] as const

type Users = Partial<Record<'total' | 'fresh' | 'freshBefore' | 'active7' | 'active30' | 'returned' | 'returned7' | 'liked' | 'liked10' | 'supers' | 'invited' | 'paired' | 'mailed' | 'finals', number>>
type Stats = {
  days: number; today: string; from: string; before: string; at: number
  events: [string, string, number][]; langs: [string, string, number][]; users: Users; depth: Record<string, number>
  fresh: [string, number][]; cohorts: { first: number; n: number; back1: number; back7: number; liked10: number; paired: number }[]
  polls: { polls?: number; votes?: number }; couples: { couples: number; withMatch: number; matches: number }
}

const nf = new Intl.NumberFormat('es-ES')
const num = (n: number | undefined | null) => nf.format(n || 0)
const pct = (a: number, b: number, digits = 0) => (b > 0 ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format((a / b) * 100)} %` : 'sin datos')
const dayLabel = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const LANGS: Record<string, string> = { es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', it: 'Italiano', pt: 'Portugués', xx: 'Sin idioma' }
const read = () => { try { return window.localStorage.getItem(KEY) } catch { return null } }
const write = (v: string | null) => { try { if (v) window.localStorage.setItem(KEY, v); else window.localStorage.removeItem(KEY) } catch { /* blocked */ } }

async function post(path: string, body: unknown, key?: string | null) {
  const res = await fetch(API + path, {
    method: 'POST', credentials: 'omit', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

type Row = { label: string; value: number; note?: string }

/** Horizontal bars for a list of magnitudes: label and figure in text, a thin bar for the proportion. */
function Bars({ rows, max, empty }: { rows: Row[]; max?: number; empty?: string }) {
  const top = max ?? Math.max(1, ...rows.map(r => r.value))
  if (empty && rows.every(r => !r.value)) return <p className="panel-empty">{empty}</p>
  return (
    <ul className="panel-bars">
      {rows.map(r => (
        <li key={r.label} title={`${r.label}: ${num(r.value)}${r.note ? ` (${r.note})` : ''}`}>
          <span className="panel-bars-label">{r.label}</span>
          <b className="num">{num(r.value)}</b>
          <small>{r.note || ''}</small>
          <i aria-hidden="true"><i style={{ width: `${Math.max(r.value ? 1.5 : 0, (r.value / top) * 100)}%` }} /></i>
        </li>
      ))}
    </ul>
  )
}

/** One column per day. The figure of the day under the pointer, or the last one tapped, is written out above. */
function Daily({ title, days, values }: { title: string; days: string[]; values: number[] }) {
  const [sel, setSel] = useState<number | null>(null)
  const top = Math.max(1, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  const i = sel ?? values.length - 1
  return (
    <figure className="panel-daily">
      <figcaption>
        <b>{title}</b>
        <span className="num">{sel === null ? `${num(total)} en total` : `${dayLabel(days[i])}: ${num(values[i])}`}</span>
      </figcaption>
      <div className="panel-cols" role="img" aria-label={`${title}, por día: ${num(total)} en total, máximo ${num(top)} en un día`} onMouseLeave={() => setSel(null)}>
        {values.map((v, k) => (
          <button key={days[k]} type="button" aria-label={`${dayLabel(days[k])}: ${num(v)}`} aria-pressed={sel === k} onMouseEnter={() => setSel(k)} onFocus={() => setSel(k)} onClick={() => setSel(k)}>
            <i style={{ height: `${v ? Math.max(3, (v / top) * 100) : 0}%` }} />
          </button>
        ))}
      </div>
      <div className="panel-axis"><span>{dayLabel(days[0])}</span><span>máx. {num(top)} al día</span><span>{dayLabel(days[days.length - 1])}</span></div>
    </figure>
  )
}

function Tile({ label, value, before, hint }: { label: string; value: number; before?: number; hint?: string }) {
  const change = before === undefined ? null : before > 0 ? Math.round(((value - before) / before) * 100) : null
  return (
    <li className="panel-tile">
      <span>{label}</span>
      <b className="num">{num(value)}</b>
      <small>{hint ?? (change === null ? 'sin periodo anterior para comparar' : `${change > 0 ? '+' : ''}${nf.format(change)} % frente al periodo anterior (${num(before)})`)}</small>
    </li>
  )
}

export function Panel() {
  const [key, setKey] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [days, setDays] = useState<number>(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'sent' | 'expired'>('idle')

  // A link from the email carries a one-time token after the #: trade it for this browser's own secret.
  useEffect(() => {
    const m = window.location.hash.match(/^#k=([\w-]{20,})$/)
    if (!m) { setKey(read()); setReady(true); return }
    window.history.replaceState(null, '', window.location.pathname)
    post('/api/admin/open', { token: m[1] }).then(({ data }) => {
      if (data.ok && data.key) { write(data.key); setKey(data.key) } else { setKey(read()); setState('expired') }
      setReady(true)
    }).catch(() => { setKey(read()); setState('error'); setReady(true) })
  }, [])

  const load = useCallback(async (k: string, d: number) => {
    setState('loading')
    try {
      const { status, data } = await post('/api/admin/stats', { days: d }, k)
      if (status === 401) { write(null); setKey(null); setStats(null); setState('idle'); return }
      if (!data.ok) { setState('error'); return }
      setStats(data as Stats); setState('idle')
    } catch { setState('error') }
  }, [])
  useEffect(() => { if (key) void load(key, days) }, [key, days, load])

  const view = useMemo(() => {
    if (!stats) return null
    const cur: Record<string, number> = {}, prev: Record<string, number> = {}, byDay: Record<string, Record<string, number>> = {}
    for (const [day, name, n] of stats.events) {
      if (day >= stats.from) { cur[name] = (cur[name] || 0) + n; (byDay[name] ||= {})[day] = n } else prev[name] = (prev[name] || 0) + n
    }
    const dayList: string[] = []
    for (let t = Date.parse(stats.from); t <= Date.parse(stats.today); t += 86400_000) dayList.push(new Date(t).toISOString().slice(0, 10))
    const series = (name: string) => dayList.map(d => (byDay[name] || {})[d] || 0)
    const fresh = Object.fromEntries(stats.fresh)
    const langs: Record<string, Record<string, number>> = {}
    for (const [lang, name, n] of stats.langs) (langs[lang] ||= {})[name] = n
    return { e: (k: string) => cur[k] || 0, p: (k: string) => prev[k] || 0, dayList, series, freshSeries: dayList.map(d => fresh[d] || 0), langs }
  }, [stats])

  if (!ready) return <div className="container panel"><p className="panel-empty">Cargando…</p></div>

  if (!key) {
    return (
      <div className="container panel panel--door">
        <h1>Panel de BabyMatch</h1>
        <p className="lead">Las cifras de uso de la web y de la app. Es privado: se entra con un enlace que llega al correo del propietario.</p>
        {state === 'sent'
          ? <p className="panel-note" role="status">Si este panel es tuyo, tienes el enlace en tu correo. Sirve veinte minutos. Ábrelo en este mismo dispositivo.</p>
          : <button type="button" className="btn btn--primary" disabled={state === 'loading'} onClick={async () => { setState('loading'); try { await post('/api/admin/login', {}); setState('sent') } catch { setState('error') } }}>Enviarme el enlace</button>}
        {state === 'expired' ? <p className="panel-note" role="alert">Ese enlace ya se usó o ha caducado. Pide otro.</p> : null}
        {state === 'error' ? <p className="panel-note" role="alert">No se ha podido conectar. Inténtalo de nuevo.</p> : null}
      </div>
    )
  }

  if (!stats || !view) {
    return <div className="container panel"><p className="panel-empty" role={state === 'error' ? 'alert' : 'status'}>{state === 'error' ? 'No se han podido cargar las cifras. Recarga la página.' : 'Cargando las cifras…'}</p></div>
  }

  const { e, p } = view, u = stats.users
  const total = u.total || 0
  const arrivals = e('visit')
  const steps: [string, number][] = [
    ['Llegan a la web', arrivals], ['Abren la app', e('app_open')], ['Personas nuevas en la app', e('quiz_start')], ['Primer deslizamiento', e('first_swipe')],
    ['Primer «me gusta»', e('first_like')], ['Llegan a 10 «me gusta»', e('likes_10')], ['Crean la invitación', e('invite_created')],
    ['La comparten o la copian', e('invite_shared')], ['La pareja abre el enlace', e('invite_opened')], ['La pareja se une', e('partner_joined')],
  ]
  const funnel: Row[] = steps.map(([label, value], i) => ({ label, value, note: i ? `${pct(value, steps[i - 1][1])} del paso anterior` : 'todas las llegadas desde fuera' }))
  const weeks = stats.days / 7
  const checks: [string, string, boolean | null][] = [
    ['500 aperturas de la app por semana', `${num(Math.round(e('app_open') / weeks))} por semana`, e('app_open') ? e('app_open') / weeks >= 500 : null],
    ['30 % de las personas con lista vuelve otro día', pct(u.returned || 0, total), total ? (u.returned || 0) / total >= 0.3 : null],
    ['15 % de quienes dan un «me gusta» crea la invitación', pct(e('invite_created'), e('first_like')), e('first_like') ? e('invite_created') / e('first_like') >= 0.15 : null],
    ['40 % de las invitaciones acaba en pareja unida', pct(e('partner_joined'), e('invite_created')), e('invite_created') ? e('partner_joined') / e('invite_created') >= 0.4 : null],
  ]
  const langRows = Object.entries(view.langs).sort((a, b) => (b[1].visit || 0) + (b[1].app_open || 0) - ((a[1].visit || 0) + (a[1].app_open || 0)))

  return (
    <div className="container panel">
      <header className="panel-head">
        <div>
          <h1>Panel de BabyMatch</h1>
          <p className="muted">{dayLabel(stats.from)} a {dayLabel(stats.today)}. Actualizado a las {new Date(stats.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.</p>
        </div>
        <div className="pills" role="group" aria-label="Periodo">
          {PERIODS.map(d => <button key={d} type="button" className="pill" aria-pressed={days === d} onClick={() => setDays(d)}>{d} días</button>)}
          <button type="button" className="pill" disabled={state === 'loading'} onClick={() => void load(key, days)}>{state === 'loading' ? 'Cargando…' : 'Actualizar'}</button>
        </div>
      </header>

      <ul className="panel-tiles">
        <Tile label="Llegadas a la web" value={arrivals} before={p('visit')} />
        <Tile label="Aperturas de la app" value={e('app_open')} before={p('app_open')} />
        <Tile label="Empiezan a deslizar" value={e('first_swipe')} before={p('first_swipe')} />
        <Tile label="Parejas que se unen" value={e('partner_joined')} before={p('partner_joined')} />
      </ul>

      <section aria-labelledby="p-embudo">
        <h2 id="p-embudo">Embudo</h2>
        <p className="panel-lede">BabyMatch no tiene registro: lo que en otra web sería «crear la cuenta» aquí es el primer deslizamiento, que es cuando se guarda la lista. Cada paso cuenta veces que ocurrió en el periodo, no personas distintas.</p>
        <Bars rows={funnel} max={Math.max(1, ...steps.map(s => s[1]))} />
        <p className="panel-foot">De quienes abren la app, llega al primer deslizamiento el {pct(e('first_swipe'), e('quiz_start'))} de las personas nuevas. Avisos de match en el periodo: {num(e('match'))}.</p>
      </section>

      <section aria-labelledby="p-dias">
        <h2 id="p-dias">Día a día</h2>
        <div className="panel-grid">
          <Daily title="Llegadas a la web" days={view.dayList} values={view.series('visit')} />
          <Daily title="Aperturas de la app" days={view.dayList} values={view.series('app_open')} />
          <Daily title="Listas nuevas guardadas" days={view.dayList} values={view.freshSeries} />
          <Daily title="Parejas que se unen" days={view.dayList} values={view.series('partner_joined')} />
        </div>
      </section>

      <section aria-labelledby="p-origen">
        <h2 id="p-origen">De dónde llegan</h2>
        <div className="panel-grid">
          <div>
            <h3>Origen de la visita</h3>
            <Bars empty="Aún no hay llegadas contadas en este periodo." rows={[
              { label: 'Buscadores', value: e('src_search') }, { label: 'Asistentes de IA', value: e('src_ai') }, { label: 'Redes sociales', value: e('src_social') },
              { label: 'Otras webs y correo', value: e('src_other') }, { label: 'Directo o sin origen', value: e('src_direct') },
            ].map(r => ({ ...r, note: pct(r.value, arrivals) }))} />
          </div>
          <div>
            <h3>Página por la que entran</h3>
            <Bars empty="Aún no hay llegadas contadas en este periodo." rows={[
              { label: 'Ficha de un nombre', value: e('land_name') }, { label: 'Lista de nombres', value: e('land_list') }, { label: 'Portada', value: e('land_home') },
              { label: 'La app', value: e('land_app') }, { label: 'Santoral', value: e('land_saints') }, { label: 'Estudio del INE', value: e('land_data') }, { label: 'Otras páginas', value: e('land_other') },
            ].map(r => ({ ...r, note: pct(r.value, arrivals) }))} />
          </div>
          <div>
            <h3>Desde dónde abren la app</h3>
            <Bars empty="Nadie ha abierto la app en este periodo." rows={[
              { label: 'Desde la ficha de un nombre', value: e('from_name') }, { label: 'Desde una lista', value: e('from_list') }, { label: 'Desde la portada', value: e('from_home') },
              { label: 'Con el enlace de su pareja', value: e('from_invite') }, { label: 'Desde una votación', value: e('from_vote') }, { label: 'Directo u otros', value: e('from_other') },
            ].map(r => ({ ...r, note: pct(r.value, e('app_open')) }))} />
          </div>
        </div>
      </section>

      <section aria-labelledby="p-uso">
        <h2 id="p-uso">Cuánto la usan</h2>
        <p className="panel-lede">Personas con lista guardada, desde el principio. No depende del periodo elegido.</p>
        <ul className="panel-tiles">
          <Tile label="Personas con lista" value={total} hint={`${num(u.fresh)} nuevas en estos ${stats.days} días`} />
          <Tile label="Activas en 7 días" value={u.active7 || 0} hint={`${pct(u.active7 || 0, total)} del total; ${num(u.active30)} en 30 días`} />
          <Tile label="Volvieron otro día" value={u.returned || 0} hint={`${pct(u.returned || 0, total)} del total; ${num(u.returned7)} seguían una semana después`} />
          <Tile label="Con pareja unida" value={u.paired || 0} hint={`${pct(u.paired || 0, total)} del total`} />
        </ul>
        <div className="panel-grid">
          <div>
            <h3>Nombres deslizados por persona</h3>
            <Bars empty="Aún no hay listas guardadas." rows={[
              { label: 'Menos de 10', value: stats.depth.a || 0 }, { label: 'De 10 a 49', value: stats.depth.b || 0 },
              { label: 'De 50 a 199', value: stats.depth.c || 0 }, { label: '200 o más', value: stats.depth.d || 0 },
            ].map(r => ({ ...r, note: pct(r.value, total) }))} />
          </div>
          <div>
            <h3>Hasta dónde llegan</h3>
            <Bars empty="Aún no hay listas guardadas." max={Math.max(1, total)} rows={[
              { label: 'Han dado algún «me gusta»', value: u.liked || 0 }, { label: 'Tienen 10 «me gusta» o más', value: u.liked10 || 0 }, { label: 'Han dado algún superlike', value: u.supers || 0 },
              { label: 'Han creado la invitación', value: u.invited || 0 }, { label: 'Han abierto la ronda final', value: u.finals || 0 }, { label: 'Han confirmado su correo', value: u.mailed || 0 },
            ].map(r => ({ ...r, note: pct(r.value, total) }))} />
          </div>
        </div>
      </section>

      <section aria-labelledby="p-semanas">
        <h2 id="p-semanas">Retención por semana de llegada</h2>
        {stats.cohorts.length ? (
          <div className="datatable"><div className="datatable-scroll" tabIndex={0} role="region" aria-labelledby="p-semanas">
            <table>
              <thead><tr><th scope="col">Semana del</th><th scope="col" className="r">Personas</th><th scope="col" className="r">Volvieron otro día</th><th scope="col" className="r">Seguían a la semana</th><th scope="col" className="r">10 «me gusta»</th><th scope="col" className="r">Con pareja</th></tr></thead>
              <tbody>
                {stats.cohorts.map(c => (
                  <tr key={c.first}><td>{dayLabel(new Date(c.first).toISOString().slice(0, 10))}</td><td className="r">{num(c.n)}</td><td className="r">{pct(c.back1, c.n)}</td><td className="r">{pct(c.back7, c.n)}</td><td className="r">{pct(c.liked10, c.n)}</td><td className="r">{pct(c.paired, c.n)}</td></tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : <p className="panel-empty">Aún no hay listas guardadas en las últimas nueve semanas.</p>}
      </section>

      <section aria-labelledby="p-compartir">
        <h2 id="p-compartir">Compartir</h2>
        <div className="panel-grid">
          <div>
            <h3>Invitación a la pareja</h3>
            <Bars empty="Nadie ha creado una invitación en este periodo." rows={[
              { label: 'Invitaciones creadas', value: e('invite_created'), note: `${pct(e('invite_created'), e('first_like'))} de quienes dan un «me gusta»` },
              { label: 'Compartidas o copiadas', value: e('invite_shared'), note: `${pct(e('invite_shared'), e('invite_created'))} de las creadas` },
              { label: 'Abiertas por la pareja', value: e('invite_opened'), note: `${pct(e('invite_opened'), e('invite_created'))} de las creadas` },
              { label: 'Parejas unidas', value: e('partner_joined'), note: `${pct(e('partner_joined'), e('invite_created'))} de las creadas` },
            ]} />
            <p className="panel-foot">Parejas en las que los dos han dado «me gusta»: {num(stats.couples.couples)}. Con algún nombre en común: {num(stats.couples.withMatch)} ({pct(stats.couples.withMatch, stats.couples.couples)}).</p>
          </div>
          <div>
            <h3>Votación de familia y amigos</h3>
            <Bars empty="Nadie ha abierto una votación en este periodo." rows={[
              { label: 'Votaciones abiertas', value: e('poll_created') }, { label: 'Compartidas o copiadas', value: e('poll_shared'), note: `${pct(e('poll_shared'), e('poll_created'))} de las abiertas` },
              { label: 'Familiares que la abren', value: e('vote_opened') }, { label: 'Familiares que votan', value: e('vote_cast'), note: `${pct(e('vote_cast'), e('vote_opened'))} de quienes la abren` },
              { label: 'Pasan de la votación a la app', value: e('from_vote'), note: `${pct(e('from_vote'), e('vote_opened'))} de quienes la abren` },
            ]} />
            <p className="panel-foot">Votaciones abiertas ahora mismo: {num(stats.polls.polls)}, con {num(stats.polls.votes)} votos.</p>
          </div>
          <div>
            <h3>Ronda final y correo</h3>
            <Bars empty="Nadie ha llegado a la ronda final en este periodo." rows={[
              { label: 'Abren la ronda final', value: e('final_opened') }, { label: 'Llegan a 10 duelos', value: e('duels_10') }, { label: 'Escriben sus apellidos', value: e('surname_set') },
              { label: 'Guardan la lista con su correo', value: e('email_saved') }, { label: 'Confirman el correo', value: e('email_confirmed'), note: `${pct(e('email_confirmed'), e('email_saved'))} de quienes lo guardan` },
            ]} />
          </div>
        </div>
      </section>

      <section aria-labelledby="p-cobrar">
        <h2 id="p-cobrar">¿Toca ya cobrar?</h2>
        <p className="panel-lede">Los cuatro umbrales del plan de medición. Tienen que cumplirse cuatro semanas seguidas.</p>
        <ul className="panel-checks">
          {checks.map(([label, value, pass]) => (
            <li key={label}><span>{label}</span><b className="num">{value}</b><em data-pass={pass === null ? 'none' : pass ? 'yes' : 'no'}>{pass === null ? 'Sin datos' : pass ? '✓ Se cumple' : '✗ Aún no'}</em></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="p-idiomas">
        <h2 id="p-idiomas">Por idioma</h2>
        {langRows.length ? (
          <div className="datatable"><div className="datatable-scroll" tabIndex={0} role="region" aria-labelledby="p-idiomas">
            <table>
              <thead><tr><th scope="col">Idioma</th><th scope="col" className="r">Llegadas a la web</th><th scope="col" className="r">Aperturas de la app</th><th scope="col" className="r">Primer deslizamiento</th><th scope="col" className="r">Parejas unidas</th></tr></thead>
              <tbody>
                {langRows.map(([lang, v]) => <tr key={lang}><td>{LANGS[lang] || lang}</td><td className="r">{num(v.visit)}</td><td className="r">{num(v.app_open)}</td><td className="r">{num(v.first_swipe)}</td><td className="r">{num(v.partner_joined)}</td></tr>)}
              </tbody>
            </table>
          </div></div>
        ) : <p className="panel-empty">Aún no hay actividad en este periodo.</p>}
      </section>

      <section aria-labelledby="p-mas">
        <h2 id="p-mas">Lo que no está aquí</h2>
        <p className="panel-lede">Las llegadas se cuentan desde el 25 de noviembre de 2026 y solo cuando la página se abre desde fuera de la web. Para el detalle de búsquedas y páginas:</p>
        <ul className="panel-links">
          <li><a href="https://search.google.com/search-console?resource_id=sc-domain%3Ababymatch.app" rel="noopener">Search Console</a><small>búsquedas, clics y posición en Google</small></li>
          <li><a href="https://analytics.google.com/" rel="noopener">Google Analytics</a><small>solo quien acepta el aviso; sirve para proporciones</small></li>
          <li><a href="https://dash.cloudflare.com/?to=/:account/web-analytics" rel="noopener">Cloudflare Web Analytics</a><small>páginas vistas totales, sin cookies</small></li>
        </ul>
        <p><button type="button" className="btn btn--small" onClick={async () => { await post('/api/admin/out', {}, key).catch(() => null); write(null); setKey(null); setStats(null) }}>Cerrar sesión</button></p>
      </section>
    </div>
  )
}
