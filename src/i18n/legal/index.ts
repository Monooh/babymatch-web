// The legal pages: legal notice, the formal half of the privacy page, cookies and terms of use.
//
// The texts live here and not in the dictionaries because they are long and only these four pages read them.
// A paragraph is a string; a list is an array of strings. Inside a string, `[words](url)` is a link and these are
// filled in when the page is built: {name} {nif} {address} {email} (who runs the site, from OWNER) and
// {noticeUrl} {privacyUrl} {cookiesUrl} {termsUrl} (the other legal pages in the same language).
import type { Locale } from '../config'
import es from './es'
import en from './en'
import fr from './fr'
import de from './de'
import it from './it'
import pt from './pt'

export type Block = string | string[]
export type Section = { h: string; p: Block[] }
export type Doc = { title: string; desc: string; lead: string; sections: Section[] }
export type Legal = {
  /** "Last updated: {date}" */
  updated: string
  notice: Doc
  /** Added below the plain-words paragraphs of the privacy page (those stay in the dictionary). */
  privacy: { sections: Section[] }
  /** `change` is the button that reopens the analytics notice. */
  cookies: Doc & { change: string }
  terms: Doc
}

/** Who runs the site. The law asks for this to be published (LSSI art. 10, § 5 DDG); it is shown on the legal
 *  notice and nowhere else, and that page is kept out of search engines (robots.ts, noindex, no sitemap entry). */
export const OWNER = {
  name: 'Bruno Velázquez',
  nif: '72808851M',
  address: 'C/ Trinidad Fernández Arenas 2, 31002 Pamplona (Navarra), España',
  email: 'hola@babymatch.app',
} as const

/** The day these texts were last changed. */
export const LEGAL_UPDATED = '2026-11-28'

const LEGAL: Record<Locale, Legal> = { es, en, fr, de, it, pt }
export const getLegal = (l: Locale): Legal => LEGAL[l]
