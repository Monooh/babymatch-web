import { LOCALES, LOCALE_NAMES, SITE_NAME, paths, type Locale } from '@/i18n/config'
import type { Dict } from '@/i18n/dict'
import { NameSearch } from './NameSearch'

export function SiteNav({ lang, d }: { lang: Locale; d: Dict }) {
  return (
    <header className="nav">
      <a className="skip" href="#main">{d.nav.skip}</a>
      <div className="container nav-in">
        <a className="wordmark" href={paths.home(lang)} aria-label={d.nav.home}>
          <img src="/logo.png" alt="" width={40} height={40} />
          <span>{SITE_NAME}</span>
        </a>
        <NameSearch lang={lang} base={paths.names(lang)} placeholder={d.nav.searchPlaceholder} label={d.nav.searchLabel} noResults={d.nav.noResults} />
        <nav className="nav-links" aria-label={SITE_NAME}>
          <a href={paths.names(lang)}>{d.nav.names}</a>
          <a href={paths.lists(lang)}>{d.nav.lists}</a>
          <a className="btn btn--small" href={paths.app(lang)}>{d.nav.openApp}</a>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter({ lang, d }: { lang: Locale; d: Dict }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-mast">{SITE_NAME}</div>
        <p className="footer-line">{d.footer.line}</p>
        <div className="footer-cols">
          <nav aria-label={d.footer.explore}>
            <h2>{d.footer.explore}</h2>
            <ul>
              <li><a href={paths.names(lang)}>{d.nav.names}</a></li>
              <li><a href={paths.lists(lang)}>{d.nav.lists}</a></li>
              <li><a href={paths.app(lang)}>{d.nav.openApp}</a></li>
              <li><a href={paths.privacy(lang)}>{d.footer.privacy}</a></li>
            </ul>
          </nav>
          <nav aria-label={d.nav.language}>
            <h2>{d.nav.language}</h2>
            <ul>
              {LOCALES.map(l => (
                <li key={l}><a href={paths.home(l)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{LOCALE_NAMES[l]}</a></li>
              ))}
            </ul>
          </nav>
          <p className="footer-note">{d.footer.note}</p>
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
