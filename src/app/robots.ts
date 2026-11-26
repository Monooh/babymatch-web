import type { MetadataRoute } from 'next'
import { LOCALES, SITE_URL, paths } from '@/i18n/config'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    // The legal notice shows the owner's postal address, as the law requires. No crawler has a reason to read it.
    rules: { userAgent: '*', allow: '/', disallow: LOCALES.map(l => paths.legal(l)) },
    sitemap: LOCALES.map(l => `${SITE_URL}/sitemap/${l}.xml`),
    host: SITE_URL,
  }
}
