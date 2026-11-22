import type { MetadataRoute } from 'next'
import { LOCALES, HREFLANG, SITE_URL, paths, type Locale } from '@/i18n/config'
import { allNames } from '@/lib/names'
import { allLists, listByKey } from '@/lib/lists'

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
