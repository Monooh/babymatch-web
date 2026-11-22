import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HREFLANG, LOCALES, SEGMENTS, isLocale, paths, type Locale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { cultureLabel, cultureListPhrase, genderAdj, rootAdj, tagLabel } from '@/i18n/taxonomy'
import { allNames, getName, namesByLetter, otherForms, similarNames } from '@/lib/names'
import { allLists, listBySlug, listByKey, listNames, listsForName, relatedLists } from '@/lib/lists'
import { firstLetter, nameLength, parseListKey, type N } from '@/lib/model'
import { pageMeta, jsonLd, breadcrumbLd, abs } from '@/lib/seo'
import { t, num } from '@/lib/t'
import { Crumbs } from '@/components/Chrome'

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

function NameLink({ n, l, gLabel }: { n: N; l: Locale; gLabel?: string }) {
  return (
    <a className="nm" href={paths.name(l, n.slug)}>
      <b>{n.name}</b>
      {gLabel ? <i className={n.g}>{gLabel}</i> : null}
      <span>{n.meaning}</span>
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
            <div className="cta">
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
  const gendered = !!parseListKey(list.key).gender
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
          <p className="lead">{t(d.list.intro, { count: nf(list.count) })}</p>
          <div className="hero-actions">
            <a className="btn btn--primary" href={appHref}>{d.common.swipeThisList}</a>
          </div>
        </div>
      </section>

      <section className="section section--tight" aria-label={list.title}>
        <div className="container">
          <ul className="grid-names">{shown.map(n => <li key={n.id}><NameLink n={n} l={l} gLabel={gendered && n.g !== 'u' ? undefined : gLabel(n.g)} /></li>)}</ul>
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
          <div className="cta">
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
