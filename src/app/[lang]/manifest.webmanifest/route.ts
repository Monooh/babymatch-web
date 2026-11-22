import { LOCALES, SITE_NAME, isLocale, paths } from '@/i18n/config'
import { getDict } from '@/i18n/dict'

export const dynamic = 'force-static'
export function generateStaticParams() {
  return LOCALES.map(lang => ({ lang }))
}

export async function GET(_: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l = isLocale(lang) ? lang : 'en'
  const d = getDict(l)
  return Response.json({
    name: SITE_NAME, short_name: SITE_NAME, description: d.meta.appDesc, lang: l,
    start_url: paths.app(l), scope: `/${l}/`, display: 'standalone', orientation: 'portrait',
    background_color: '#f8f5ea', theme_color: '#f8f5ea',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }, { headers: { 'content-type': 'application/manifest+json' } })
}
