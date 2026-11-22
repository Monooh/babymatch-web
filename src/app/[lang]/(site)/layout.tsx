import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { SiteNav, SiteFooter } from '@/components/Chrome'

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const d = getDict(lang)
  return (
    <>
      <SiteNav lang={lang} d={d} />
      <main id="main">{children}</main>
      <SiteFooter lang={lang} d={d} />
    </>
  )
}
