import type { ReactNode } from 'react'
import { HREFLANG, paths, type Locale } from '@/i18n/config'
import { LEGAL_UPDATED, OWNER, getLegal, type Section } from '@/i18n/legal'

export type LegalKind = 'legal' | 'cookies' | 'terms'

/** A paragraph of the legal texts: fills in who runs the site and the other legal pages, and turns
 *  `[words](url)` and the contact address into links. */
function rich(l: Locale, text: string): ReactNode[] {
  const values: Record<string, string> = {
    name: OWNER.name, nif: OWNER.nif, address: OWNER.address,
    noticeUrl: paths.legal(l), privacyUrl: paths.privacy(l), cookiesUrl: paths.cookies(l), termsUrl: paths.terms(l),
  }
  const filled = text.replace(/\{(name|nif|address|noticeUrl|privacyUrl|cookiesUrl|termsUrl)\}/g, (_, k: string) => values[k])
  const out: ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)|\{email\}/g
  let at = 0, m: RegExpExecArray | null
  while ((m = re.exec(filled))) {
    if (m.index > at) out.push(filled.slice(at, m.index))
    if (m[0] === '{email}') out.push(<a key={m.index} href={`mailto:${OWNER.email}`}>{OWNER.email}</a>)
    else out.push(<a key={m.index} href={m[2]} rel={m[2].startsWith('http') ? 'noopener' : undefined}>{m[1]}</a>)
    at = m.index + m[0].length
  }
  if (at < filled.length) out.push(filled.slice(at))
  return out
}

export function legalDate(l: Locale) {
  const date = new Intl.DateTimeFormat(HREFLANG[l], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED))
  return getLegal(l).updated.replace('{date}', date)
}

/** `hide` is the section search engines must not quote (who runs the site, with the postal address). */
export function LegalSections({ lang, sections, hide = -1 }: { lang: Locale; sections: Section[]; hide?: number }) {
  return (
    <>
      {sections.map((s, i) => (
        <section key={i} className="legal-sec" data-nosnippet={i === hide ? '' : undefined}>
          <h2>{s.h}</h2>
          {s.p.map((b, j) => typeof b === 'string'
            ? <p key={j}>{rich(lang, b)}</p>
            : <ul key={j}>{b.map((x, k) => <li key={k}>{rich(lang, x)}</li>)}</ul>)}
        </section>
      ))}
    </>
  )
}

export function legalDoc(l: Locale, kind: LegalKind) {
  const all = getLegal(l)
  return kind === 'legal' ? all.notice : kind === 'cookies' ? all.cookies : all.terms
}

export function LegalPage({ lang, kind }: { lang: Locale; kind: LegalKind }) {
  const doc = legalDoc(lang, kind)
  // On the legal notice the texts open with who runs the site. It is shown last: it has to be there, not to lead.
  const sections = kind === 'legal' ? [...doc.sections.slice(1), doc.sections[0]] : doc.sections
  return (
    <section className="page-hero page-hero--legal">
      <div className="container">
        <h1>{doc.title}</h1>
        <p className="lead">{doc.lead}</p>
        <div className="prose prose--legal">
          <LegalSections lang={lang} sections={sections} hide={kind === 'legal' ? sections.length - 1 : -1} />
          {kind === 'cookies' ? <p><button type="button" className="btn btn--small" data-consent-reset>{getLegal(lang).cookies.change}</button></p> : null}
          <p className="legal-date">{legalDate(lang)}</p>
        </div>
      </div>
    </section>
  )
}
