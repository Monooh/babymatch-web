import type { Dict } from '@/i18n/dict'
import type { Culture, Tag, N } from '@/lib/model'

export type AppProps = {
  lang: string
  d: Dict['app']
  c: Dict['common']
  pop: string[]
  labels: { cultures: Record<Culture, string>; tags: Record<Tag, string> }
  lists: { key: string; title: string; count: number }[]
  hrefs: { home: string; names: string; app: string }
  nativeCultures: Culture[]
}
export type Ctx = AppProps & { names: N[]; byId: Map<number, N> }
