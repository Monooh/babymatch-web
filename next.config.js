/** @type {import('next').NextConfig} */
const OLD_CATEGORIES = {
  nina: 'nombres-de-nina', nino: 'nombres-de-nino', espanoles: 'nombres-espanoles', vascos: 'nombres-vascos',
  gallegos: 'nombres-gallegos', franceses: 'nombres-franceses', italianos: 'nombres-italianos',
  escandinavos: 'nombres-escandinavos', biblicos: 'nombres-biblicos', cortos: 'nombres-cortos', largos: 'nombres-largos',
  griegos: 'nombres-griegos', irlandeses: 'nombres-irlandeses', celtas: 'nombres-irlandeses', arabes: 'nombres-arabes',
  hebreos: 'nombres-hebreos',
}
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      // URLs of the first, Spanish-only version of the site.
      ...Object.entries(OLD_CATEGORIES).map(([from, to]) => ({ source: `/nombres/${from}`, destination: `/es/listas/${to}`, permanent: true })),
      { source: '/nombres', destination: '/es/nombres', permanent: true },
      { source: '/nombres/:slug', destination: '/es/nombres/:slug', permanent: true },
      { source: '/app', destination: '/es/app', permanent: true },
    ]
  },
  async headers() {
    return [{ source: '/data/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] }]
  },
}
module.exports = nextConfig
