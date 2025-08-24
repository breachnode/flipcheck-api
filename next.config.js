/** @type {import("next").NextConfig} */
const nextConfig = {
  // Only build API routes
  // Disable static generation for API routes
  output: "standalone",
}

module.exports = nextConfig
