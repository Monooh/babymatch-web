/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

// Production is a fully static export (out/), packaged for Cloudflare by scripts/build-cf.mjs.
// Redirects and headers therefore live in cloudflare/_redirects and cloudflare/_headers; the block below only
// keeps `next dev` usable, where "/" has no language yet.
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  ...(isDev
    ? { async redirects() { return [{ source: '/', destination: '/es', permanent: false }] } }
    : { output: 'export' }),
}
module.exports = nextConfig
