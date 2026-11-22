import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { LOCALES, SITE_NAME, SITE_URL, isLocale } from '@/i18n/config'
import '@/styles/site.css'

export const dynamicParams = false
export function generateStaticParams() {
  return LOCALES.map(lang => ({ lang }))
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { template: `%s | ${SITE_NAME}`, default: SITE_NAME },
  applicationName: SITE_NAME,
  icons: { icon: '/logo.png', apple: '/icon-192.png' },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f8f5ea' }

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <html lang={lang} className="overflow-x-clip">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=chillax@500,600&display=swap" />
        <link rel="manifest" href={`/${lang}/manifest.webmanifest`} />
      </head>
      <body className="overflow-x-clip">{children}</body>
    </html>
  )
}
