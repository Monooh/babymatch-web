import { LOCALES, LOCALE_NAMES, SITE_NAME, SOCIAL, SOCIAL_LIVE, STUDY, paths, type Locale } from '@/i18n/config'
import type { Dict } from '@/i18n/dict'
import { IconInstagram, IconSearch, IconTikTok, IconYouTube } from './Icons'

export function SiteNav({ lang, d }: { lang: Locale; d: Dict }) {
  return (
    <header className="nav">
      <a className="skip" href="#main">{d.nav.skip}</a>
      <div className="container nav-in">
        <a className="wordmark" href={paths.home(lang)} aria-label={d.nav.home}>
          <img src="/logo.png" alt="" width={40} height={40} />
          <span>{SITE_NAME}</span>
        </a>
        {/* Enhanced by /search.js, a plain script: name and list pages ship no framework code. */}
        <div className="search" role="search" data-lang={lang} data-base={paths.names(lang)} data-none={d.nav.noResults}>
          <IconSearch size={20} />
          <input type="search" name="q" autoComplete="off" spellCheck={false} placeholder={d.nav.searchPlaceholder} aria-label={d.nav.searchLabel}
            role="combobox" aria-expanded={false} aria-controls="name-search-results" aria-autocomplete="list" />
          <ul className="search-pop" id="name-search-results" role="listbox" hidden />
        </div>
        <script src="/search.js" defer />
        <nav className="nav-links" aria-label={SITE_NAME}>
          <a href={paths.names(lang)}>{d.nav.names}</a>
          <a href={paths.lists(lang)}>{d.nav.lists}</a>
          <a className="btn btn--small" href={paths.app(lang)}><span className="nav-long">{d.nav.openApp}</span><span className="nav-short">{d.nav.openShort}</span></a>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter({ lang, d }: { lang: Locale; d: Dict }) {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <a className="footer-brand" href={paths.home(lang)}>
            <img src="/logo.png" alt="" width={32} height={32} loading="lazy" />
            <span>{SITE_NAME}</span>
          </a>
          {SOCIAL_LIVE ? (
            <ul className="footer-social">
              {SOCIAL.map(x => (
                <li key={x.name}>
                  <a href={x.href} rel="me noopener" aria-label={`${SITE_NAME}, ${x.name}`}>{x.name === 'Instagram' ? <IconInstagram size={20} /> : x.name === 'YouTube' ? <IconYouTube size={20} /> : <IconTikTok size={20} />}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="footer-line">{d.footer.line}</p>
        <nav className="footer-nav" aria-label={d.footer.explore}>
          <ul>
            <li><a href={paths.names(lang)}>{d.nav.names}</a></li>
            <li><a href={paths.lists(lang)}>{d.nav.lists}</a></li>
            <li><a href={paths.saints(lang)}>{d.saints.nav}</a></li>
            {lang === 'es' ? <li><a href={STUDY.path}>{STUDY.nav}</a></li> : null}
            <li><a href={paths.app(lang)}>{d.nav.openApp}</a></li>
          </ul>
        </nav>
        <nav className="footer-langs" aria-label={d.nav.language}>
          <ul>
            {LOCALES.map(l => (
              <li key={l}><a href={paths.home(l)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{LOCALE_NAMES[l]}</a></li>
            ))}
          </ul>
        </nav>
        <div className="footer-base">
          <p>{d.footer.note}</p>
          <ul>
            <li>© {year} {SITE_NAME}</li>
            <li><a href={paths.privacy(lang)}>{d.footer.privacy}</a></li>
            <li><a href={paths.cookies(lang)}>{d.footer.cookies}</a></li>
            <li><a href={paths.terms(lang)}>{d.footer.terms}</a></li>
            <li><a href={paths.legal(lang)} rel="nofollow">{d.footer.legal}</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="crumbs">
        {items.map((it, i) => <li key={i}>{it.href ? <a href={it.href}>{it.name}</a> : <span aria-current="page">{it.name}</span>}</li>)}
      </ol>
    </nav>
  )
}
