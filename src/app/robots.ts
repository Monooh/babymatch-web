import type { MetadataRoute } from 'next'
import { LOCALES, SITE_URL } from '@/i18n/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: LOCALES.map(l => `${SITE_URL}/sitemap/${l}.xml`),
    host: SITE_URL,
  }
}
