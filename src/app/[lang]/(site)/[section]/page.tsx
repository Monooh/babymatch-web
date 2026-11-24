import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HREFLANG, LOCALES, SEGMENTS, isLocale, paths, type Locale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { nameCount, topNames } from '@/lib/names'
import { allLists, groupOf, listByKey, type ListGroup, type ListInfo } from '@/lib/lists'
import { LETTERS } from '@/lib/model'
import { calendar, monthCount, monthName, monthSlug } from '@/lib/saints'
import { pageMeta, jsonLd, breadcrumbLd } from '@/lib/seo'
import { t, num } from '@/lib/t'
import { Crumbs } from '@/components/Chrome'

type Props = { params: Promise<{ lang: string; section: string }> }
type Kind = 'names' | 'lists' | 'privacy' | 'saints'

function kindOf(l: Locale, section: string): Kind | null {
  const s = SEGMENTS[l]
  return section === s.names ? 'names' : section === s.lists ? 'lists' : section === s.privacy ? 'privacy' : section === s.saints ? 'saints' : null
}

export const dynamicParams = false
export function generateStaticParams() {
  return LOCALES.flatMap(lang => [SEGMENTS[lang].names, SEGMENTS[lang].lists, SEGMENTS[lang].privacy, SEGMENTS[lang].saints].map(section => ({ lang, section })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, section } = await params
  if (!isLocale(lang)) return {}
  const kind = kindOf(lang, section)
  if (!kind) return {}
  const d = getDict(lang)
  const count = num(nameCount(), HREFLANG[lang])
  if (kind === 'names') return pageMeta(lang, { title: d.meta.namesTitle, description: t(d.meta.namesDesc, { count }), path: l => paths.names(l) })
  if (kind === 'lists') return pageMeta(lang, { title: d.meta.listsTitle, description: t(d.meta.listsDesc, { count: allLists(lang).length }), path: l => paths.lists(l) })
  if (kind === 'saints') {
    const total = calendar(lang).flat().reduce((acc, x) => acc + x.names.length, 0)
    return pageMeta(lang, { title: d.saints.title, description: t(d.saints.desc, { count: num(total, HREFLANG[lang]) }), path: l => paths.saints(l) })
  }
  return pageMeta(lang, { title: d.meta.privacyTitle, description: d.privacy.p1, path: l => paths.privacy(l) })
}

export default async function SectionPage({ params }: Props) {
  const { lang, section } = await params
  if (!isLocale(lang)) notFound()
  const l: Locale = lang
  const kind = kindOf(l, section)
  if (!kind) notFound()
  const d = getDict(l)
  const nf = (n: number) => num(n, HREFLANG[l])

  if (kind === 'privacy') {
    return (
      <section className="page-hero">
        <div className="container">
          <h1>{d.privacy.h1}</h1>
          <div className="prose" style={{ marginTop: 'var(--space-xl)' }}>
            <p>{d.privacy.p1}</p><p>{d.privacy.p2}</p><p>{d.privacy.p3}</p><p>{d.privacy.p5}</p><p>{d.privacy.p4}</p>
            <p><button type="button" className="btn btn--small" data-consent-reset>{d.privacy.change}</button></p>
          </div>
        </div>
      </section>
    )
  }

  if (kind === 'saints') {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([{ name: 'BabyMatch', path: paths.home(l) }, { name: d.saints.nav, path: paths.saints(l) }]))} />
        <section className="page-hero">
          <div className="container">
            <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.saints.nav }]} />
            <h1>{d.saints.h1}</h1>
            <p className="lead">{d.saints.lead}</p>
          </div>
        </section>
        <section className="section section--tight" aria-labelledby="h-months">
          <div className="container">
            <h2 id="h-months" className="h-sm">{d.saints.months}</h2>
            <ul className="linklist">
              {months.map(m => (
                <li key={m}><a href={paths.saintsMonth(l, monthSlug(l, m))}><span>{cap(monthName(l, m))}</span><small>{nf(monthCount(l, m))}</small></a></li>
              ))}
            </ul>
          </div>
        </section>
      </>
    )
  }

  if (kind === 'names') {
    const girls = topNames(l, 'f', 24), boys = topNames(l, 'm', 24)
    const rows = LETTERS.map(L => ({
      L, f: listByKey(l, `l:${L.toLowerCase()}:f`), m: listByKey(l, `l:${L.toLowerCase()}:m`), all: listByKey(l, `l:${L.toLowerCase()}`),
    })).filter(r => r.all)
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([{ name: 'BabyMatch', path: paths.home(l) }, { name: d.nav.names, path: paths.names(l) }]))} />
        <section className="page-hero">
          <div className="container">
            <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.nav.names }]} />
            <h1>{d.namesHub.h1}</h1>
            <p className="lead">{t(d.namesHub.lead, { count: nf(nameCount()) })}</p>
            <div className="hero-actions">
              <a className="btn btn--primary" href={paths.app(l)}>{d.common.startSwiping}</a>
              <a className="btn" href={paths.lists(l)}>{d.nav.lists}</a>
            </div>
          </div>
        </section>
        <section className="section section--tight" aria-labelledby="h-letters">
          <div className="container">
            <h2 id="h-letters" className="h-sm">{d.namesHub.letterH2}</h2>
            <ul className="letters">
              {rows.map(r => (
                <li key={r.L}>
                  <b><a href={paths.list(l, r.all!.slug)} style={{ color: 'inherit', textDecoration: 'none' }} aria-label={r.all!.title}>{r.L}</a></b>
                  {r.f ? <a href={paths.list(l, r.f.slug)} aria-label={r.f.title}>{d.namesHub.girls} <span className="muted num">{nf(r.f.count)}</span></a> : null}
                  {r.m ? <a href={paths.list(l, r.m.slug)} aria-label={r.m.title}>{d.namesHub.boys} <span className="muted num">{nf(r.m.count)}</span></a> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="section section--tight" aria-labelledby="h-pop">
          <div className="container">
            <h2 id="h-pop" className="h-sm">{d.namesHub.popularH2}</h2>
            <ul className="grid-names">
              {[...girls, ...boys].sort((a, b) => a.name.localeCompare(b.name, l)).map(n => (
                <li key={n.id}>
                  <a className="nm" href={paths.name(l, n.slug)}>
                    <b>{n.name}</b>
                    <i className={n.g}>{n.g === 'f' ? d.common.girl : n.g === 'm' ? d.common.boy : d.common.unisex}</i>
                    <span>{n.meaning}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </>
    )
  }

  // lists hub
  const lists = allLists(l)
  const groups: [ListGroup, string][] = [
    ['gender', d.listsHub.gGender], ['popular', d.listsHub.gPopular], ['famous', d.listsHub.gFamous], ['fiction', d.listsHub.gFiction], ['origin', d.listsHub.gOrigin],
    ['style', d.listsHub.gStyle], ['length', d.listsHub.gLength], ['letter', d.listsHub.gLetter],
  ]
  const by = (g: ListGroup): ListInfo[] => lists.filter(x => groupOf(x.key) === g)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([{ name: 'BabyMatch', path: paths.home(l) }, { name: d.nav.lists, path: paths.lists(l) }]))} />
      <section className="page-hero">
        <div className="container">
          <Crumbs items={[{ name: 'BabyMatch', href: paths.home(l) }, { name: d.nav.lists }]} />
          <h1>{d.listsHub.h1}</h1>
          <p className="lead">{t(d.listsHub.lead, { count: nf(lists.length) })}</p>
        </div>
      </section>
      {groups.map(([g, title]) => (
        <section key={g} className="section section--tight" aria-labelledby={`h-${g}`}>
          <div className="container">
            <h2 id={`h-${g}`} className="h-sm">{title}</h2>
            <ul className="linklist">
              {by(g).map(x => (
                <li key={x.key}><a href={paths.list(l, x.slug)}><span>{x.title}</span><small>{nf(x.count)}</small></a></li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  )
}
