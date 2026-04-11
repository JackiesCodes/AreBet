import type { NextConfig } from "next"

/**
 * Security headers applied to every response.
 * These harden the app against common browser-based attacks without
 * affecting functionality.
 */
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Deny framing (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Disable browser XSS auditor (replaced by CSP)
  { key: "X-XSS-Protection", value: "0" },
  // Referrer: send origin only on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions policy: disable unused browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // HSTS: enforce HTTPS for 1 year (only active in production)
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
]

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

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },

  async rewrites() {
    return []
  },
}

export default nextConfig
