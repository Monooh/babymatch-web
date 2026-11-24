import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, paths } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { VotePage } from '@/components/VotePage'

// Where family and friends vote on a couple's finalists. The link carries the poll's code after the #, so this page
// is the same file for every poll; it is not something to find on a search engine.
type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getDict(lang).vote.title} · BabyMatch`, robots: { index: false, follow: false } }
}

export default async function Vote({ params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const d = getDict(lang)
  return (
    <div className="app-body">
      <VotePage lang={lang} v={d.vote} retry={d.app.retry} loading={d.app.loading} appHref={paths.app(lang)} homeHref={paths.home(lang)} />
    </div>
  )
}
