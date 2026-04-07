/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/app', destination: 'https://babymatch.vercel.app/' },
      { source: '/app/:path*', destination: 'https://babymatch.vercel.app/:path*' },
    ]
  },
}
module.exports = nextConfig
