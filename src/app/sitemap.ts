import type { MetadataRoute } from 'next'
import { LOCALES, HREFLANG, SITE_URL, paths, type Locale } from '@/i18n/config'
import { allNames } from '@/lib/names'
import { allLists, listByKey } from '@/lib/lists'
import { dayPages, daySlug, hasDayPage, monthSlug } from '@/lib/saints'
import { STUDY } from '@/lib/study'

export const dynamic = 'force-static'

// One sitemap per language: /sitemap/es.xml, /sitemap/en.xml…
export function generateSitemaps() {
  return LOCALES.map(id => ({ id }))
}

const u = (p: string) => SITE_URL + p
function langs(build: (l: Locale) => string | null) {
  const out: Record<string, string> = {}
  for (const l of LOCALES) { const p = build(l); if (p) out[HREFLANG[l]] = u(p) }
  return { languages: out }
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const l = (LOCALES as readonly string[]).includes(id) ? (id as Locale) : 'en'
  const now = new Date()
  return [
    { url: u(paths.home(l)), lastModified: now, changeFrequency: 'weekly', priority: 1, alternates: langs(paths.home) },
    { url: u(paths.app(l)), lastModified: now, changeFrequency: 'monthly', priority: 0.9, alternates: langs(paths.app) },
    { url: u(paths.names(l)), lastModified: now, changeFrequency: 'weekly', priority: 0.9, alternates: langs(paths.names) },
    { url: u(paths.lists(l)), lastModified: now, changeFrequency: 'weekly', priority: 0.9, alternates: langs(paths.lists) },
    { url: u(paths.saints(l)), lastModified: now, changeFrequency: 'monthly', priority: 0.7, alternates: langs(paths.saints) },
    { url: u(paths.privacy(l)), lastModified: now, changeFrequency: 'yearly', priority: 0.2, alternates: langs(paths.privacy) },
    // The legal notice is left out on purpose: it is not meant to be found through a search engine.
    { url: u(paths.cookies(l)), lastModified: now, changeFrequency: 'yearly', priority: 0.1, alternates: langs(paths.cookies) },
    { url: u(paths.terms(l)), lastModified: now, changeFrequency: 'yearly', priority: 0.1, alternates: langs(paths.terms) },
    ...(l === 'es' ? [{ url: u(STUDY.path), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...Array.from({ length: 12 }, (_, i) => ({
      url: u(paths.saintsMonth(l, monthSlug(l, i + 1))), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6,
      alternates: langs(o => paths.saintsMonth(o, monthSlug(o, i + 1))),
    })),
    ...dayPages(l).map(x => ({
      url: u(paths.saintsDay(l, daySlug(l, x.month, x.day))), lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5,
      alternates: langs(o => hasDayPage(o, x.month, x.day) ? paths.saintsDay(o, daySlug(o, x.month, x.day)) : null),
    })),
    ...allLists(l).map(x => ({
      url: u(paths.list(l, x.slug)), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8,
      alternates: langs(o => { const y = listByKey(o, x.key); return y ? paths.list(o, y.slug) : null }),
    })),
    ...allNames(l).map(n => ({
      url: u(paths.name(l, n.slug)), lastModified: now, changeFrequency: 'monthly' as const, priority: n.home ? 0.7 : 0.5,
      alternates: langs(o => paths.name(o, n.slug)),
    })),
  ]
}
