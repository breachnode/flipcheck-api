/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only build API routes
  experimental: {
    appDir: true,
  },
  // Disable static generation for API routes
  output: 'standalone',
}

module.exports = nextConfig
