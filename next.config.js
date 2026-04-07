/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/app', destination: 'https://babymatch.vercel.app', permanent: false },
      { source: '/app/:path*', destination: 'https://babymatch.vercel.app/:path*', permanent: false },
    ]
  },
}
module.exports = nextConfig
