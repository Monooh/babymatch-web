import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HREFLANG, LOCALES, SEGMENTS, isLocale, paths, type Locale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { RANK_SOURCE, YEAR_NOW, countryName, cultureLabel, cultureListPhrase, genderAdj, rootAdj, tagLabel } from '@/i18n/taxonomy'
import { allNames, getName, middleNames, namesByLetter, otherForms, siblingNames, similarNames } from '@/lib/names'
import { statsFor, type NameStats } from '@/lib/stats'
import { calendar, dayFromSlug, dayLabel, dayPages, daySlug, hasDayPage, monthCount, monthFromSlug, monthName, monthSlug, nameDays, namesOn, saintsOn } from '@/lib/saints'
import { allLists, listBySlug, listByKey, listNames, listsForName, relatedLists } from '@/lib/lists'
import { NEW_ENTRY, firstLetter, isFiction, nameLength, parseListKey, type Fame, type N } from '@/lib/model'
import { famousNamed, fameExample, fameWeight, officialFor, ranksFor, type RankRow } from '@/lib/people'
import { pageMeta, jsonLd, breadcrumbLd, abs } from '@/lib/seo'
import { t, num } from '@/lib/t'
import { Crumbs } from '@/components/Chrome'
import { Faq } from '@/components/Faq'
import { shotSrc } from '@/components/Phone'

type Props = { params: Promise<{ lang: string; section: string; slug: string }> }
const MAX_ON_PAGE = 400

export const dynamicParams = false

// The site is exported as static HTML: every list and every name in every language is built ahead.
// BM_ONLY_POPULAR=1 builds just the best-known names, for a quick local build.
export function generateStaticParams() {
  const quick = process.env.BM_ONLY_POPULAR === '1'
  return LOCALES.flatMap(lang => [
    ...allLists(lang).map(x => ({ lang, section: SEGMENTS[lang].lists, slug: x.slug })),
    ...allNames(lang).filter(n => !quick || (n.pop >= 5 && n.home)).map(n => ({ lang, section: SEGMENTS[lang].names, slug: n.slug })),
    ...Array.from({ length: 12 }, (_, i) => ({ lang, section: SEGMENTS[lang].saints, slug: monthSlug(lang, i + 1) })),
    ...dayPages(lang).map(x => ({ lang, section: SEGMENTS[lang].saints, slug: daySlug(lang, x.month, x.day) })),
  ])
}

function resolve(lang: Locale, section: string, slug: string) {
  if (section === SEGMENTS[lang].names) { const n = getName(lang, slug); return n ? { kind: 'name' as const, n } : null }
  if (section === SEGMENTS[lang].lists) { const list = listBySlug(lang, slug); return list ? { kind: 'list' as const, list } : null }
  if (section === SEGMENTS[lang].saints) {
    const month = monthFromSlug(lang, slug)
    if (month) return { kind: 'month' as const, month }
    const date = dayFromSlug(lang, slug)
    return date && hasDayPage(lang, date.month, date.day) ? { kind: 'day' as const, ...date } : null
  }
  return null
}

/** What a day page says, shared by its metadata and its body. */
function dayText(l: Locale, month: number, day: number) {
  const d = getDict(l)
  const names = namesOn(l, month, day)
  const saints = saintsOn(l, month, day)
  const and = new Intl.ListFormat(HREFLANG[l], { style: 'long', type: 'conjunction' })
  const who = saints.map(x => x.saint.name)
  return {
    names, saints,
    vars: {
      date: dayLabel(l, month, day), count: names.length, names: and.format(names.map(x => x.n.name)),
      // Up to four saints are all named; a longer day names the three best known and counts the rest.
      saintNames: who.length <= 4 ? and.format(who) : t(d.saints.dayMore, { list: who.slice(0, 3).join(', '), n: who.length - 3 }),
      v: [1, 8, 11].includes(day) ? 1 : 0, // Italian elides its article before these: l’8 marzo, dell’11 marzo
    },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, section, slug } = await params
  if (!isLocale(lang)) return {}
  const r = resolve(lang, section, slug)
  if (!r) return {}
  const d = getDict(lang)
  if (r.kind === 'name') {
    const n = r.n
    return pageMeta(lang, {
      title: t(d.name.title, { name: n.name }),
      description: t(d.name.desc, { name: n.name, meaning: n.meaning, root: rootAdj(n.root, lang), genderLower: genderAdj(n.g, lang) }),
      path: l => paths.name(l, n.slug),
    })
  }
  if (r.kind === 'month') {
    const month = monthName(lang, r.month)
    return pageMeta(lang, {
      title: t(d.saints.monthTitle, { month }), description: t(d.saints.monthDesc, { month, count: num(monthCount(lang, r.month), HREFLANG[lang]) }),
      path: l => paths.saintsMonth(l, monthSlug(l, r.month)),
    })
  }
  if (r.kind === 'day') {
    const { names, vars } = dayText(lang, r.month, r.day)
    return pageMeta(lang, {
      title: t(d.saints.dayTitle, vars), description: t(names.length ? d.saints.dayDesc : d.saints.dayDescNone, vars),
      path: l => hasDayPage(l, r.month, r.day) ? paths.saintsDay(l, daySlug(l, r.month, r.day)) : null,
    })
  }
  const { list } = r
  const lower = lang === 'de' ? list.title : list.title.charAt(0).toLowerCase() + list.title.slice(1)
  return pageMeta(lang, {
    title: list.title,
    description: t(d.list.desc, { count: num(list.count, HREFLANG[lang]), titleLower: lower }),
    path: l => { const x = listByKey(l, list.key); return x ? paths.list(l, x.slug) : null },
  })
}

function NameLink({ n, l, gLabel, place, sub }: { n: N; l: Locale; gLabel?: string; place?: number; sub?: string }) {
  return (
    <a className="nm" href={paths.name(l, n.slug)}>
      <b>{place ? <span className="num">{place}. </span> : null}{n.name}</b>
      {gLabel ? <i className={n.g}>{gLabel}</i> : null}
      <span>{sub || n.meaning}</span>
    </a>
  )
}

export default async function SlugPage({ params }: Props) {
  const { lang, section, slug } = await params
  if (!isLocale(lang)) notFound()
  const l: Locale = lang
  const r = resolve(l, section, slug)
  if (!r) notFound()
  const d = getDict(l)
  const nf = (x: number) => num(x, HREFLANG[l])
  const gLabel = (g: string) => (g === 'f' ? d.common.girl : g === 'm' ? d.common.boy : d.common.unisex)
  const listed = (items: string[]) => new Intl.ListFormat(HREFLANG[l], { style: 'long', type: 'conjunction' }).format(items)

  if (r.kind === 'name') {
    const n = r.n
    const lead = t(n.g === 'f' ? d.name.leadF : n.g === 'm' ? d.name.leadM : d.name.leadU, { name: n.name, root: rootAdj(n.root, l), meaning: n.meaning })
    const cultures = cultureListPhrase(n.cultures, l)
    const forms = otherForms(n.slug, l)
    const lists = listsForName(l, n)
    const similar = similarNames(l, n, 12)
    const L = firstLetter(n.name)
    const letterList = listByKey(l, `l:${L.toLowerCase()}${n.g === 'u' ? '' : ':' + n.g}`)
    const sameLetter = (namesByLetter(l).get(L) || []).filter(o => o.id !== n.id && (o.g === n.g || o.g === 'u')).sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name, l)).slice(0, 12)
    // The questions people actually type about a name, each answered in one sentence that stands on its own.
    const faq: [string, string][] = [
      [t(d.name.qMeaning, { name: n.name }), t(d.name.aMeaning, { name: n.name, meaning: n.meaning })],
      [t(d.name.qOrigin, { name: n.name }), t(d.name.aOrigin, { name: n.name, root: rootAdj(n.root, l) }) + (cultures ? ' ' + t(d.name.usedIn, { cultures }) : '')],
      [t(d.name.qGender, { name: n.name }), t(n.g === 'f' ? d.name.aGenderF : n.g === 'm' ? d.name.aGenderM : d.name.aGenderU, { name: n.name })],
      [t(d.name.qPop, { name: n.name }), t(d.name.aPop, { name: n.name, min: d.pop[0], max: d.pop[4], level: d.pop[n.pop - 1] })],
    ]
    if (forms.length) faq.push([t(d.name.qForms, { name: n.name }), t(d.name.aForms, { name: n.name, forms: listed(forms) })])
    // What only this name has: the well-known people who bear it and its place in each country's ranking.
    const famous = famousNamed(l, n.slug)
    const standing = ranksFor(l, n.slug)
    const among = (g: 'f' | 'm') => { const w = g === 'f' ? d.listTitle.girl : d.listTitle.boy; return l === 'en' ? w.toLowerCase() : w }
    const rankLine = (r: RankRow) => t(d.name.rankLine, { country: countryName(r.country, l), source: RANK_SOURCE[r.country], year: r.year, name: n.name, rank: r.rank, g: among(r.g) })
    if (standing.length) faq[3][1] += ' ' + rankLine(standing[0])
    if (famous.length >= 2) faq.push([t(d.name.qFamous, { name: n.name }), t(d.name.aFamous, { name: n.name, people: listed(famous.slice(0, 4).map(p => p.name)) })])
    // Name day: the feast of the best-known saint who goes by this name.
    const feast = nameDays(l, n.slug)
    if (feast.length) faq.push([t(d.name.qSaint, { name: n.name }), t(d.name.saintLine, { name: n.name, date: feast[0].date, saint: feast[0].name })])
    // Official figures: how many people carry the name, their age, where they live, how its use moved.
    const stats = statsFor(l, n.slug)
    const homeStats = stats[0]?.country === l ? stats[0] : null
    const dec = (v: number) => new Intl.NumberFormat(HREFLANG[l], { maximumFractionDigits: 1 }).format(v)
    const day = (iso: string) => new Intl.DateTimeFormat(HREFLANG[l], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'))
    const told = (x: NameStats, full: boolean) => {
      const where = countryName(x.country, l)
      const parts = [t(x.kind === 'residents' ? d.name.stLive : d.name.stBorn, { country: where, n: nf(x.n), name: n.name, since: x.since || '' })]
      if (x.age) parts.push(t(d.name.stAge, { age: dec(x.age) }))
      if (full && x.rank && n.g !== 'u') parts.push(t(d.name.stRank, { rank: nf(x.rank), g: among(n.g) }))
      if (full && x.rate) parts.push(t(d.name.stRate, { rate: dec(x.rate) }))
      if (x.peak) parts.push(t(d.name.stPeak, { year: x.peak[0], n: nf(x.peak[1]) }))
      if (full && x.last) parts.push(t(d.name.stLast, { year: x.last[0], n: nf(x.last[1]) }))
      return parts.join(' ')
    }
    if (stats.length) faq.push([t(d.name.qHowMany, { name: n.name }), stats.slice(0, 3).map(x => told(x, false)).join(' ')])
    if (homeStats && homeStats.top.length >= 3) faq.push([t(d.name.qWhere, { name: n.name }), t(d.name.aWhere, { country: countryName(l, l), name: n.name, places: listed(homeStats.top.slice(0, 3).map(x => x[0])) })])
    // Names that go with this one: for a brother or sister, and as a second name.
    const sib = siblingNames(l, n)
    const seconds = middleNames(l, n)
    const sibAll = [...sib.sisters.slice(0, 2), ...sib.brothers.slice(0, 2)]
    if (sibAll.length >= 3) faq.push([t(d.name.qSiblings, { name: n.name }), t(d.name.aSiblings, { name: n.name, names: listed(sibAll.map(o => o.name)) })])
    if (seconds.length >= 3) faq.push([t(d.name.qMiddle, { name: n.name }), t(d.name.aMiddle, { names: listed(seconds.slice(0, 3).map(o => `${n.name} ${o.name}`)) })])
    const ld = {
      '@context': 'https://schema.org', '@type': 'DefinedTerm', name: n.name, description: lead, url: abs(paths.name(l, n.slug)),
      inLanguage: HREFLANG[l], inDefinedTermSet: abs(paths.names(l)),
    }
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([{ name: 'BabyMatch', path: paths.home(l) }, { name: d.nav.names, path: paths.names(l) }, { name: n.name, path: paths.name(l, n.slug) }]))} />
        <section className="page-hero">
          <div className="container">
            <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.nav.names, href: paths.names(l) }, { name: n.name }]} />
            <div className="name-hero">
              <div>
                <h1>{n.name}</h1>
                <p className="lead">{lead}{cultures ? ' ' + t(d.name.usedIn, { cultures }) : ''}</p>
                <div className="hero-actions">
                  <a className="btn btn--primary" href={`${paths.app(l)}?n=${n.slug}`}>{d.common.startSwiping}</a>
                </div>
              </div>
              <aside className="sheet" aria-labelledby="h-facts">
                <h2 id="h-facts">{t(d.name.factsH2, { name: n.name })}</h2>
                <dl className="facts">
                  <dt>{d.common.gender}</dt><dd>{gLabel(n.g)}</dd>
                  <dt>{d.common.meaning}</dt><dd>{n.meaning}</dd>
                  <dt>{d.common.origin}</dt><dd>{cultureLabel(n.cultures[0], l)}</dd>
                  {n.cultures.length > 1 ? (<><dt>{d.common.usedIn}</dt><dd>{n.cultures.slice(1, 6).map(c => cultureLabel(c, l)).join(', ')}</dd></>) : null}
                  <dt>{d.common.popularity}</dt><dd>{d.pop[n.pop - 1]}</dd>
                  {n.tags.length ? (<><dt>{d.common.style}</dt><dd>{n.tags.map(x => tagLabel(x, l)).join(', ')}</dd></>) : null}
                  <dt>{d.common.syllables}</dt><dd className="num">{n.syl}</dd>
                  <dt>{d.common.letters}</dt><dd className="num">{nameLength(n.name)}</dd>
                  {forms.length ? (<><dt>{d.name.otherForms}</dt><dd>{forms.join(', ')}</dd></>) : null}
                  {feast.length ? (<><dt>{d.name.saintFact}</dt><dd>{feast[0].date}</dd></>) : null}
                </dl>
              </aside>
            </div>
          </div>
        </section>

        <Faq id="h-faq" title={t(d.name.faqH2, { name: n.name })} items={faq} small />

        {famous.length ? (
          <section className="section section--tight" aria-labelledby="h-famous">
            <div className="container">
              <h2 id="h-famous" className="h-sm">{t(d.name.famousH2, { name: n.name })}</h2>
              <ul className="people">
                {famous.map(p => (
                  <li key={p.id}>
                    {p.url ? <a href={p.url} rel="noopener">{p.name}</a> : <b>{p.name}</b>}
                    {p.years ? <small>{p.years}</small> : null}
                    {p.about ? <span>{p.about}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="muted note">{d.name.famousNote}</p>
            </div>
          </section>
        ) : null}

        {feast.length ? (
          <section className="section section--tight" aria-labelledby="h-saint">
            <div className="container">
              <h2 id="h-saint" className="h-sm">{t(d.name.saintH2, { name: n.name })}</h2>
              <p className="lead">{t(d.name.saintLine, { name: n.name, date: feast[0].date, saint: feast[0].name })}</p>
              <ul className="people" style={{ marginTop: 'var(--space-lg)' }}>
                {feast.map(p => (
                  <li key={p.id}>
                    {p.url ? <a href={p.url} rel="noopener">{p.name}</a> : <b>{p.name}</b>}
                    <small>{hasDayPage(l, p.month, p.day) ? <a className="link" href={paths.saintsDay(l, daySlug(l, p.month, p.day))}>{p.date}</a> : p.date}</small>
                    {p.about ? <span>{p.about}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="note"><a className="link" href={`${paths.saintsMonth(l, monthSlug(l, feast[0].month))}#d${feast[0].day}`}>{t(d.name.saintMore, { month: monthName(l, feast[0].month) })}</a></p>
              <p className="muted note">{d.name.saintNote}</p>
            </div>
          </section>
        ) : null}

        {stats.length ? (
          <section className="section section--tight" aria-labelledby="h-stats">
            <div className="container">
              <h2 id="h-stats" className="h-sm">{t(d.name.statsH2, { name: n.name })}</h2>
              {homeStats ? (
                <div className="stats">
                  <div>
                    <p className="lead">{told(homeStats, true)}</p>
                    {([[d.name.stTop, homeStats.top], [d.name.stTopRate, homeStats.topRate]] as const).map(([label, rows]) => rows.length ? (
                      <div key={label} className="places">
                        <h3>{label}</h3>
                        <ol>
                          {rows.map(([place, count, rate]) => (
                            <li key={place}><span>{place}</span><b className="num">{nf(count)}</b>{rate ? <small>{t(d.name.stPer, { rate: dec(rate) })}</small> : null}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null)}
                  </div>
                  {homeStats.decades.length >= 3 ? (
                    <div className="places">
                      <h3>{d.name.stDecades}</h3>
                      <ol className="bars">
                        {homeStats.decades.map(([label, count]) => (
                          <li key={label}><span className="num">{label}</span><i style={{ ['--w' as string]: (count / Math.max(...homeStats.decades.map(x => x[1]))).toFixed(3) }} /><b className="num">{nf(count)}</b></li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {stats.length > (homeStats ? 1 : 0) ? (
                <>
                  {homeStats ? <h3 className="stats-more">{d.name.stElsewhere}</h3> : null}
                  <ul className="ranks">{stats.filter(x => x !== homeStats).map(x => <li key={x.country}>{told(x, true)}</li>)}</ul>
                </>
              ) : null}
              <p className="muted note">
                {stats.map((x, i) => <span key={x.country}>{i ? ' ' : ''}{t(d.name.stSource, { source: x.source, date: day(x.asOf) })} <a href={x.url} rel="noopener">{x.license}</a></span>)}
              </p>
            </div>
          </section>
        ) : null}

        {standing.length ? (
          <section className="section section--tight" aria-labelledby="h-ranks">
            <div className="container">
              <h2 id="h-ranks" className="h-sm">{t(d.name.ranksH2, { name: n.name })}</h2>
              <ul className="ranks">
                {standing.map(r => (
                  <li key={r.country + r.g}>
                    {rankLine(r)}
                    {r.prevYear ? <small> {r.prev ? t(d.name.rankPrev, { year: r.prevYear, rank: r.prev }) : t(d.name.rankNew, { year: r.prevYear })}</small> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {sib.sisters.length + sib.brothers.length >= 4 ? (
          <section className="section section--tight" aria-labelledby="h-siblings">
            <div className="container">
              <h2 id="h-siblings" className="h-sm">{t(d.name.siblingsH2, { name: n.name })}</h2>
              <div className="pairs">
                {([[d.name.sisters, sib.sisters], [d.name.brothers, sib.brothers]] as const).map(([label, group]) => group.length ? (
                  <div key={label}>
                    <h3>{label}</h3>
                    <ul className="grid-names grid-names--2">{group.map(o => <li key={o.id}><NameLink n={o} l={l} gLabel={gLabel(o.g)} /></li>)}</ul>
                  </div>
                ) : null)}
              </div>
              <p className="muted note">{t(d.name.siblingsNote, { name: n.name })}</p>
            </div>
          </section>
        ) : null}

        {seconds.length >= 3 ? (
          <section className="section section--tight" aria-labelledby="h-middle">
            <div className="container">
              <h2 id="h-middle" className="h-sm">{t(d.name.middleH2, { name: n.name })}</h2>
              <div className="pills">
                {seconds.map(o => <a key={o.id} className="pill" href={paths.name(l, o.slug)}>{n.name} {o.name}</a>)}
              </div>
              <p className="muted note">{d.name.middleNote}</p>
            </div>
          </section>
        ) : null}

        {similar.length ? (
          <section className="section section--tight" aria-labelledby="h-similar">
            <div className="container">
              <h2 id="h-similar" className="h-sm">{t(d.name.similarH2, { name: n.name })}</h2>
              <ul className="grid-names">{similar.map(o => <li key={o.id}><NameLink n={o} l={l} gLabel={gLabel(o.g)} /></li>)}</ul>
            </div>
          </section>
        ) : null}

        {lists.length ? (
          <section className="section section--tight" aria-labelledby="h-inlists">
            <div className="container">
              <h2 id="h-inlists" className="h-sm">{t(d.name.listsH2, { name: n.name })}</h2>
              <ul className="linklist">
                {lists.map(x => <li key={x.key}><a href={paths.list(l, x.slug)}><span>{x.title}</span><small>{nf(x.count)}</small></a></li>)}
              </ul>
            </div>
          </section>
        ) : null}

        {sameLetter.length ? (
          <section className="section section--tight" aria-labelledby="h-letter">
            <div className="container">
              <h2 id="h-letter" className="h-sm">{t(d.name.letterH2, { letter: L })}</h2>
              <ul className="grid-names">{sameLetter.map(o => <li key={o.id}><NameLink n={o} l={l} gLabel={gLabel(o.g)} /></li>)}</ul>
              {letterList ? <p style={{ marginTop: 'var(--space-lg)' }}><a className="link" href={paths.list(l, letterList.slug)}>{letterList.title}</a></p> : null}
            </div>
          </section>
        ) : null}

        <section className="section section--tight">
          <div className="container">
            <div className="cta cta--shot">
              <div className="cta-shot"><img src={shotSrc(l, 'swipe')} alt={t(d.home.shotAlt, { what: d.common.startSwiping })} width={780} height={1688} loading="lazy" decoding="async" /></div>
              <div>
                <h2>{t(d.name.ctaH2, { name: n.name })}</h2>
                <p>{d.name.ctaP}</p>
              </div>
              <a className="btn" href={`${paths.app(l)}?n=${n.slug}`}>{d.common.startSwiping}</a>
            </div>
          </div>
        </section>
      </>
    )
  }

  if (r.kind === 'month') {
    const month = monthName(l, r.month)
    const days = calendar(l)[r.month - 1]
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
    const around = [r.month === 1 ? 12 : r.month - 1, r.month === 12 ? 1 : r.month + 1]
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([{ name: 'BabyMatch', path: paths.home(l) }, { name: d.saints.nav, path: paths.saints(l) }, { name: cap(month), path: paths.saintsMonth(l, slug) }]))} />
        <section className="page-hero">
          <div className="container">
            <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.saints.nav, href: paths.saints(l) }, { name: cap(month) }]} />
            <h1>{t(d.saints.monthH1, { month })}</h1>
            <p className="lead">{t(d.saints.monthLead, { month, count: nf(monthCount(l, r.month)) })}</p>
            <div className="pills" style={{ marginTop: 'var(--space-lg)' }}>
              {around.map(m => <a key={m} className="pill" href={paths.saintsMonth(l, monthSlug(l, m))}>{cap(monthName(l, m))}</a>)}
            </div>
          </div>
        </section>
        {days.map(x => (
          <section key={x.day} className="section section--tight" aria-labelledby={`d${x.day}`}>
            <div className="container">
              <h2 id={`d${x.day}`} className="h-sm">{hasDayPage(l, r.month, x.day) ? <a href={paths.saintsDay(l, daySlug(l, r.month, x.day))}>{x.date}</a> : x.date}</h2>
              <ul className="grid-names">{x.names.map(({ n, saint }) => <li key={n.id}><NameLink n={n} l={l} gLabel={gLabel(n.g)} sub={saint.name} /></li>)}</ul>
            </div>
          </section>
        ))}
        {/* Every day of the month with a page, including the ones no name on the list falls on. */}
        <section className="section section--tight" aria-labelledby="h-days">
          <div className="container">
            <h2 id="h-days" className="h-sm">{d.saints.days}</h2>
            <div className="pills pills--letters">
              {dayPages(l).filter(x => x.month === r.month).map(x => (
                <a key={x.day} className="pill num" href={paths.saintsDay(l, daySlug(l, x.month, x.day))} aria-label={dayLabel(l, x.month, x.day)}>{x.day}</a>
              ))}
            </div>
            <p className="muted note">{d.name.saintNote}</p>
          </div>
        </section>
      </>
    )
  }

  if (r.kind === 'day') {
    const { names, saints, vars } = dayText(l, r.month, r.day)
    const month = monthName(l, r.month)
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
    const monthHref = paths.saintsMonth(l, monthSlug(l, r.month))
    // The day before and the day after among the days that have a page; 31 December and 1 January meet.
    const pages = dayPages(l)
    const at = pages.findIndex(x => x.month === r.month && x.day === r.day)
    const prev = pages[(at + pages.length - 1) % pages.length], next = pages[(at + 1) % pages.length]
    // A saint is filed under every form of its name; show the forms used in this language, or failing that the first two.
    const borne = (list: N[]) => { const own = list.filter(n => n.fit); return (own.length ? own : list.slice(0, 2)).slice(0, 3) }
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([
          { name: 'BabyMatch', path: paths.home(l) }, { name: d.saints.nav, path: paths.saints(l) }, { name: cap(month), path: monthHref }, { name: vars.date, path: paths.saintsDay(l, slug) },
        ]))} />
        <section className="page-hero">
          <div className="container">
            <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.saints.nav, href: paths.saints(l) }, { name: cap(month), href: monthHref }, { name: vars.date }]} />
            <h1>{t(d.saints.dayH1, vars)}</h1>
            <p className="lead">{t(names.length ? d.saints.dayLead : d.saints.dayLeadNone, vars)}</p>
            <nav className="pills" style={{ marginTop: 'var(--space-lg)' }} aria-label={d.saints.days}>
              <a className="pill" rel="prev" href={paths.saintsDay(l, daySlug(l, prev.month, prev.day))}>{dayLabel(l, prev.month, prev.day)}</a>
              <a className="pill" rel="next" href={paths.saintsDay(l, daySlug(l, next.month, next.day))}>{dayLabel(l, next.month, next.day)}</a>
            </nav>
          </div>
        </section>
        {names.length ? (
          <section className="section section--tight" aria-labelledby="h-names">
            <div className="container">
              <h2 id="h-names" className="h-sm">{d.saints.dayNamesH2}</h2>
              <ul className="grid-names">{names.map(({ n, saint }) => <li key={n.id}><NameLink n={n} l={l} gLabel={gLabel(n.g)} sub={saint.name} /></li>)}</ul>
            </div>
          </section>
        ) : null}
        <section className="section section--tight" aria-labelledby="h-saints">
          <div className="container">
            <h2 id="h-saints" className="h-sm">{t(d.saints.daySaintsH2, vars)}</h2>
            <ul className="people">
              {saints.map(({ saint, names: under }) => {
                const shown = borne(under)
                return (
                  <li key={saint.id}>
                    {saint.url ? <a href={saint.url} rel="noopener">{saint.name}</a> : <b>{saint.name}</b>}
                    {saint.about ? <span>{saint.about}</span> : null}
                    {shown.length ? <span className="named">{t(d.saints.dayBears, { count: shown.length })} {shown.map((n, i) => <span key={n.id}>{i ? ', ' : ''}<a href={paths.name(l, n.slug)}>{n.name}</a></span>)}</span> : null}
                  </li>
                )
              })}
            </ul>
            <p className="note"><a className="link" href={names.length ? `${monthHref}#d${r.day}` : monthHref}>{t(d.name.saintMore, { month })}</a></p>
            <p className="muted note">{d.saints.dayNote} {d.name.saintNote}</p>
          </div>
        </section>
      </>
    )
  }

  // ───── list page ─────
  const { list } = r
  const { kind, value, gender: listGender } = parseListKey(list.key)
  const gendered = !!listGender
  const official = kind === 'y' ? officialFor(l) : undefined
  const listed0 = listNames(l, list.key)
  // A list of characters opens with the ones everybody knows (Harry, Hermione), not with the commonest names.
  const names = kind === 'fame' && isFiction(value)
    ? [...listed0].sort((a, b) => fameWeight(b.slug, value as Fame) - fameWeight(a.slug, value as Fame) || a.name.localeCompare(b.name, l))
    : listed0
  const shown = names.slice(0, MAX_ON_PAGE)
  const related = relatedLists(l, list.key, 9)
  const appHref = `${paths.app(l)}?list=${encodeURIComponent(list.key)}`
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: list.title, numberOfItems: list.count, url: abs(paths.list(l, list.slug)),
    itemListElement: shown.slice(0, 50).map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.name, url: abs(paths.name(l, n.slug)) })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([{ name: 'BabyMatch', path: paths.home(l) }, { name: d.nav.lists, path: paths.lists(l) }, { name: list.title, path: paths.list(l, list.slug) }]))} />
      <section className="page-hero">
        <div className="container">
          <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.nav.lists, href: paths.lists(l) }, { name: list.title }]} />
          <h1>{list.title}</h1>
          <p className="lead">{
            official && value === 'now' ? t(d.list.yNowLead, { source: official.source, dataYear: official.year, count: nf(list.count) })
              : official ? t(d.list.yNextLead, { source: RANK_SOURCE[l], prevYear: official.prevYear || '', dataYear: official.year, year: YEAR_NOW + 1 })
                : t(kind === 'fame' ? (isFiction(value) ? d.list.ficLead : d.list.fameLead) : d.list.intro, { title: list.title, count: nf(list.count), top: listed(names.slice(0, 5).map(n => n.name)) })
          }</p>
          {official ? <p className="muted note">{d.list.source}: <a className="link" href={official.url} rel="noopener">{official.source}</a>{official.secondary ? ` · ${d.list.secondary}` : ''}</p> : null}
          <div className="hero-actions">
            <a className="btn btn--primary" href={appHref}>{d.common.swipeThisList}</a>
          </div>
        </div>
      </section>

      <section className="section section--tight" aria-label={list.title}>
        <div className="container">
          <ul className="grid-names">{shown.map(n => {
            const person = kind === 'fame' ? fameExample(l, n.slug, value as Fame) : null
            const climbed = kind === 'y' && value === 'next' ? (n.rise >= NEW_ENTRY ? d.list.isNew : `+${n.rise}`) : ''
            return (
              <li key={n.id}>
                <NameLink n={n} l={l} gLabel={climbed || (gendered && n.g !== 'u' ? undefined : gLabel(n.g))}
                  place={kind === 'y' && n.rank ? n.rank : undefined} sub={person ? t(d.list.like, { person: person.name }) : undefined} />
              </li>
            )
          })}</ul>
          {names.length > shown.length ? <p className="muted" style={{ marginTop: 'var(--space-lg)' }}>{t(d.list.showing, { shown: nf(shown.length), count: nf(names.length) })}</p> : null}
        </div>
      </section>

      {related.length ? (
        <section className="section section--tight" aria-labelledby="h-related">
          <div className="container">
            <h2 id="h-related" className="h-sm">{d.list.relatedH2}</h2>
            <ul className="linklist">
              {related.map(x => <li key={x.key}><a href={paths.list(l, x.slug)}><span>{x.title}</span><small>{nf(x.count)}</small></a></li>)}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="section section--tight">
        <div className="container">
          <div className="cta cta--shot">
            <div className="cta-shot"><img src={shotSrc(l, 'swipe')} alt={t(d.home.shotAlt, { what: d.common.swipeThisList })} width={780} height={1688} loading="lazy" decoding="async" /></div>
            <div>
              <h2>{t(d.list.ctaH2, { count: nf(list.count) })}</h2>
              <p>{d.list.ctaP}</p>
            </div>
            <a className="btn" href={appHref}>{d.common.swipeThisList}</a>
          </div>
        </div>
      </section>
    </>
  )
}
