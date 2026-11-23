import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HREFLANG, LOCALES, SITE_NAME, SITE_URL, isLocale, paths, LOCALE_CULTURES, type Locale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { cultureLabel, tagLabel } from '@/i18n/taxonomy'
import { allNames, nameCount, topNames } from '@/lib/names'
import { allLists, listByKey, type ListInfo } from '@/lib/lists'
import { CULTURES, LETTERS, parseListKey, type Culture } from '@/lib/model'
import { pageMeta, jsonLd } from '@/lib/seo'
import { t, num } from '@/lib/t'
import { Torn } from '@/components/Torn'
import { HeroDeck } from '@/components/HeroDeck'
import { Faq } from '@/components/Faq'
import { Phone, shotSrc, type Shot } from '@/components/Phone'
import type { CardData } from '@/components/SwipeStack'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const d = getDict(lang)
  return pageMeta(lang, {
    title: d.meta.homeTitle, absoluteTitle: true,
    description: t(d.meta.homeDesc, { count: num(nameCount(), HREFLANG[lang]) }),
    path: l => paths.home(l),
  })
}

function tileClass(key: string): string {
  const { kind, gender } = parseListKey(key)
  if (kind === 'pop' || kind === 'y') return gender === 'f' ? 'tile--f' : gender === 'm' ? 'tile--m' : 'tile--pear'
  if (gender === 'f') return 'tile--f'
  if (gender === 'm') return 'tile--m'
  if (gender === 'u') return 'tile--u'
  return kind === 'c' ? 'tile--sand' : kind === 't' ? 'tile--hill' : 'tile--pear'
}

export default async function Home({ params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const l: Locale = lang
  const d = getDict(l)
  const nf = (n: number) => num(n, HREFLANG[l])
  const total = nameCount()
  const lists = allLists(l)

  // A dozen well-known names for the live deck, girls and boys alternating.
  const girls = topNames(l, 'f', 6), boys = topNames(l, 'm', 6)
  const deck: CardData[] = girls.flatMap((g, i) => [g, boys[i]]).filter(Boolean).map(n => ({
    id: n.id, name: n.name, g: n.g, gLabel: n.g === 'f' ? d.common.girl : n.g === 'm' ? d.common.boy : d.common.unisex,
    origin: cultureLabel(n.cultures[0], l), meaning: n.meaning, tags: n.tags.slice(0, 2).map(x => tagLabel(x, l)),
  }))

  const home = LOCALE_CULTURES[l]
  const featuredKeys = [
    'y:now:f', 'y:now:m', 'y:next', 'fame:influencer', 'fame:singer', 'fame:youtuber', `c:${home[1] || home[0]}`, 't:vintage', 't:biblical:f', 'len:short', 't:nature', 'g:u',
    't:mythology', 'pop:rare', 't:royal', 'syl:1:m',
  ]
  const featured = featuredKeys.map(k => listByKey(l, k)).filter((x): x is ListInfo => !!x)

  const letters = LETTERS.map(L => ({ L, list: listByKey(l, `l:${L.toLowerCase()}`) })).filter(x => x.list)
  const cultures = (CULTURES.filter(c => c !== 'intl') as Culture[])
    .map(c => ({ c, list: listByKey(l, `c:${c}`) }))
    .filter((x): x is { c: Culture; list: ListInfo } => !!x.list)
    .sort((a, b) => (home.includes(b.c) ? 1 : 0) - (home.includes(a.c) ? 1 : 0) || b.list.count - a.list.count)

  const ld = {
    '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + paths.home(l), inLanguage: HREFLANG[l],
    description: t(d.meta.homeDesc, { count: nf(total) }),
  }
  const appLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name: SITE_NAME, url: SITE_URL + paths.app(l),
    applicationCategory: 'LifestyleApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', inLanguage: HREFLANG[l],
    description: t(d.meta.homeDesc, { count: nf(total) }), isAccessibleForFree: true,
    screenshot: (['swipe', 'match', 'lists'] as Shot[]).map(x => SITE_URL + shotSrc(l, x)),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  }
  const faqVars = { count: nf(total), lists: nf(lists.length), langs: LOCALES.length, cultures: nf(cultures.length) }
  const faq = d.home.faq.map(([q, a]) => [q, t(a, faqVars)] as [string, string])
  const alt = (what: string) => t(d.home.shotAlt, { what })
  const inside: [Shot, string][] = [
    ['quiz', d.home.capQuiz], ['filters', d.home.capFilters], ['lists', t(d.home.capLists, { lists: nf(lists.length) })], ['likes', d.home.capLikes],
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(appLd)} />

      <section className="hero">
        <div className="container hero-in">
          <div className="hero-text">
            <h1>{d.home.h1}</h1>
            <p className="lead">{t(d.home.lead, { count: nf(total) })}</p>
            <div className="hero-actions">
              <a className="btn btn--primary" href={paths.app(l)}>{d.home.ctaPrimary}</a>
              <a className="btn" href={paths.lists(l)}>{d.home.ctaSecondary}</a>
            </div>
          </div>
          <div className="hero-stage">
            <Torn seed={11} depth={9} />
            <HeroDeck cards={deck} labels={{ like: d.common.like, nope: d.common.nope }} appHref={paths.app(l)}
              label={d.home.deckLabel} cta={d.common.startSwiping} savedNote={d.home.deckSaved} endNote={d.home.deckEnd} />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="h-match">
        <div className="container">
          <div className="head"><h2 id="h-match">{d.home.matchH2}</h2></div>
          <ol className="steps">
            <li><Phone l={l} shot="swipe" alt={alt(d.home.row1T)} clip /><h3>{d.home.row1T}</h3><p>{d.home.row1D}</p></li>
            <li><Phone l={l} shot="invite" alt={alt(d.home.row2T)} /><h3>{d.home.row2T}</h3><p>{d.home.row2D}</p></li>
            <li><Phone l={l} shot="match" alt={alt(d.home.row3T)} clip /><h3>{d.home.row3T}</h3><p>{d.home.row3D}</p></li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="h-lists">
        <div className="container">
          <div className="head head--split">
            <h2 id="h-lists">{d.home.listsH2}</h2>
            <p className="lead">{d.home.listsLead}</p>
          </div>
          <div className="rail" tabIndex={0} role="region" aria-labelledby="h-lists">
            {featured.map(x => (
              <a key={x.key} className={`tile ${tileClass(x.key)}`} href={paths.list(l, x.slug)}>
                <h3>{x.title}</h3>
                <span className="num">{t(d.common.namesCount, { count: nf(x.count) })}</span>
              </a>
            ))}
          </div>
          <p className="rail-more"><a className="link" href={paths.lists(l)}>{t(d.home.allLists, { count: nf(lists.length) })}</a></p>
        </div>
      </section>

      <section className="section" aria-labelledby="h-inside">
        <div className="container">
          <div className="head head--split">
            <h2 id="h-inside">{d.home.insideH2}</h2>
            <p className="lead">{d.home.insideLead}</p>
          </div>
          <ul className="gallery">
            {inside.map(([shot, caption]) => (
              <li key={shot}><Phone l={l} shot={shot} alt={alt(caption)} /><p>{caption}</p></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="h-index">
        <div className="container index">
          <div className="head">
            <h2 id="h-index">{d.home.indexH2}</h2>
            <p className="lead">{d.home.indexLead}</p>
          </div>
          <ul className="keys">
            {letters.map(({ L, list }) => (
              <li key={L}>
                <a className="key" href={paths.list(l, list!.slug)} aria-label={list!.title}>
                  <b>{L}</b><small>{nf(list!.count)}</small>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Faq id="h-faq" title={d.home.faqH2} items={faq} />

      <Torn seed={23} className="band band--pear">
        <section className="container" aria-labelledby="h-origins">
          <div className="head head--split">
            <h2 id="h-origins">{t(d.home.originsH2, { count: nf(cultures.length) })}</h2>
            <p className="lead">{d.home.originsLead}</p>
          </div>
          <div className="pills">
            {cultures.map(({ c, list }) => (
              <a key={c} className="pill" href={paths.list(l, list.slug)}>{cultureLabel(c, l)} <small>{nf(list.count)}</small></a>
            ))}
          </div>
        </section>
      </Torn>

      <Torn seed={41} className="band band--ink">
        <section className="container close" aria-labelledby="h-close">
          <h2 id="h-close">{d.home.closeH2}</h2>
          <div className="close-row">
            <div><a className="btn btn--primary" href={paths.app(l)}>{d.home.ctaPrimary}</a></div>
            <dl className="figures">
            <div className="figure"><dt><span>{d.home.figNames}</span></dt><dd><b>{nf(total)}</b></dd></div>
            <div className="figure"><dt><span>{d.home.figLists}</span></dt><dd><b>{nf(lists.length)}</b></dd></div>
            <div className="figure"><dt><span>{d.home.figLangs}</span></dt><dd><b>{LOCALES.length}</b></dd></div>
            </dl>
          </div>
        </section>
      </Torn>
    </>
  )
}
