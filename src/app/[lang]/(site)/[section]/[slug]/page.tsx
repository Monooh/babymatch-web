import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HREFLANG, LOCALES, SEGMENTS, isLocale, paths, type Locale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { RANK_SOURCE, YEAR_NOW, countryName, cultureLabel, cultureListPhrase, genderAdj, rootAdj, tagLabel } from '@/i18n/taxonomy'
import { allNames, getName, namesByLetter, otherForms, similarNames } from '@/lib/names'
import { allLists, listBySlug, listByKey, listNames, listsForName, relatedLists } from '@/lib/lists'
import { NEW_ENTRY, firstLetter, nameLength, parseListKey, type Fame, type N } from '@/lib/model'
import { famousNamed, fameExample, officialFor, ranksFor, type RankRow } from '@/lib/people'
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
  ])
}

function resolve(lang: Locale, section: string, slug: string) {
  if (section === SEGMENTS[lang].names) { const n = getName(lang, slug); return n ? { kind: 'name' as const, n } : null }
  if (section === SEGMENTS[lang].lists) { const list = listBySlug(lang, slug); return list ? { kind: 'list' as const, list } : null }
  return null
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

  // ───── list page ─────
  const { list } = r
  const { kind, value, gender: listGender } = parseListKey(list.key)
  const gendered = !!listGender
  const official = kind === 'y' ? officialFor(l) : undefined
  const names = listNames(l, list.key)
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
                : t(kind === 'fame' ? d.list.fameLead : d.list.intro, { title: list.title, count: nf(list.count), top: listed(names.slice(0, 5).map(n => n.name)) })
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
