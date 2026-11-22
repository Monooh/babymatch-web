import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from '@/i18n/config'

// "/" has no language: send the visitor to the one their browser asks for.
export function middleware(req: NextRequest) {
  const header = req.headers.get('accept-language') || ''
  const wanted = header.split(',').map(part => {
    const [tag, q] = part.trim().split(';q=')
    return { tag: tag.toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1 }
  }).sort((a, b) => b.q - a.q)
  const match = wanted.find(w => (LOCALES as readonly string[]).includes(w.tag))
  const url = req.nextUrl.clone()
  url.pathname = `/${match ? match.tag : DEFAULT_LOCALE}`
  const res = NextResponse.redirect(url, 307)
  res.headers.set('Vary', 'Accept-Language')
  return res
}
export const config = { matcher: ['/'] }
