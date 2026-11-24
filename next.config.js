/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

// Production is a fully static export (out/), packaged for Cloudflare by scripts/build-cf.mjs.
// Redirects and headers therefore live in cloudflare/_redirects and cloudflare/_headers; the block below only
// keeps `next dev` usable, where "/" has no language yet.
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  // Pages render in milliseconds, but 60,000 of them on a busy or small machine can stall a worker past the default
  // minute; a longer limit keeps a slow build from failing when nothing is actually wrong.
  staticPageGenerationTimeout: 300,
  ...(isDev
    ? { async redirects() { return [{ source: '/', destination: '/es', permanent: false }] } }
    : { output: 'export' }),
}
module.exports = nextConfig
