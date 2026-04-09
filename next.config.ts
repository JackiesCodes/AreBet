import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["recharts"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.api-sports.io" },
    ],
  },
}

export default nextConfig
