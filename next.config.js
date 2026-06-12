/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  images: {
    domains: ['www.chemicalpro.in', 'www.pharmacloud.in', 'cdn.chemicalpro.in'],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Redirect old URLs to new structure
      { source: '/product/:slug', destination: '/chemical/:slug', permanent: true },
    ]
  },
  // Generate static pages at build time for top products
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
}

module.exports = nextConfig
