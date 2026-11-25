import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Panel } from '@/components/Panel'

// The owner's usage panel. One file for everyone who opens it: the figures come from the API, and only for a browser
// that got in through the link sent by email (cloudflare/api/admin.js). Not something to find on a search engine.
type Props = { params: Promise<{ lang: string }> }

export const dynamicParams = false
export function generateStaticParams() {
  return [{ lang: 'es' }]
}
export const metadata: Metadata = { title: 'Panel', robots: { index: false, follow: false } }

export default async function PanelPage({ params }: Props) {
  const { lang } = await params
  if (lang !== 'es') notFound()
  return <main id="main"><Panel /></main>
}
