import type { Metadata } from 'next'
import { LOCALES, HREFLANG, OG_LOCALE, DEFAULT_LOCALE, SITE_URL, SITE_NAME, type Locale } from '@/i18n/config'

export const abs = (path: string) => SITE_URL + path

/** Canonical + hreflang for a page that exists in several languages. `build` may return null where it does not. */
export function pageMeta(l: Locale, opts: { title: string; description: string; path: (l: Locale) => string | null; absoluteTitle?: boolean }): Metadata {
  const languages: Record<string, string> = {}
  for (const x of LOCALES) { const p = opts.path(x); if (p) languages[HREFLANG[x]] = abs(p) }
  const def = opts.path(DEFAULT_LOCALE)
  if (def) languages['x-default'] = abs(def)
  const url = abs(opts.path(l) || `/${l}`)
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: url, languages },
    openGraph: { title: opts.title, description: opts.description, url, siteName: SITE_NAME, locale: OG_LOCALE[l], type: 'website', images: [{ url: abs('/icon-512.png'), width: 512, height: 512 }] },
    twitter: { card: 'summary', title: opts.title, description: opts.description },
  }
}

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  }
}
