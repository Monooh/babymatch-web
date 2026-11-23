// The only code that runs on Cloudflare. Every page is a static file; this script is reached only when no file
// matches, which in practice means "/" (no language yet) and unknown URLs.
const LOCALES = ['es', 'en', 'fr', 'de', 'it', 'pt']
const DEFAULT_LOCALE = 'en'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    // www is not a second copy of the site: send it to the bare domain.
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      return Response.redirect(url.toString(), 301)
    }
    if (url.pathname === '/') {
      const wanted = (request.headers.get('accept-language') || '')
        .split(',')
        .map(part => {
          const [tag, q] = part.trim().split(';q=')
          return { tag: tag.toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1 }
        })
        .sort((a, b) => b.q - a.q)
      const match = wanted.find(w => LOCALES.includes(w.tag))
      return new Response(null, {
        status: 307,
        headers: { Location: `${url.origin}/${match ? match.tag : DEFAULT_LOCALE}`, Vary: 'Accept-Language', 'Cache-Control': 'private, no-store' },
      })
    }
    // Nothing matched. The assets are configured without a not-found page on purpose: with one, Cloudflare answers
    // browser navigations (Sec-Fetch-Mode: navigate) itself and this script never sees "/" or www.
    const page = await env.ASSETS.fetch(new URL('/404', url))
    return new Response(page.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' },
    })
  },
}
