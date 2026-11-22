import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LOCALE_CULTURES, isLocale, paths } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { clientLabels } from '@/i18n/taxonomy'
import { allLists } from '@/lib/lists'
import { pageMeta } from '@/lib/seo'
import type { Culture } from '@/lib/model'
import { BabyApp } from '@/components/app/BabyApp'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const d = getDict(lang)
  return pageMeta(lang, { title: d.meta.appTitle, description: d.meta.appDesc, path: l => paths.app(l) })
}

export default async function AppPage({ params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const d = getDict(lang)
  return (
    <div className="app-body">
      <BabyApp
        lang={lang}
        d={d.app}
        c={d.common}
        pop={d.pop}
        labels={clientLabels(lang)}
        lists={allLists(lang).map(x => ({ key: x.key, title: x.title, count: x.count }))}
        hrefs={{ home: paths.home(lang), names: paths.names(lang), app: paths.app(lang) }}
        nativeCultures={LOCALE_CULTURES[lang] as Culture[]}
      />
      <noscript><p style={{ padding: 24 }}>{d.meta.appDesc}</p></noscript>
    </div>
  )
}
