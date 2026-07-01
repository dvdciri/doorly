/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/analysis',
        destination: '/backoffice',
        permanent: true,
      },
      {
        source: '/analysis/:path*',
        destination: '/backoffice/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
