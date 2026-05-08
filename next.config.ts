import type { NextConfig } from "next"

// ---------------------------------------------------------------------------
// Content-Security-Policy
// ---------------------------------------------------------------------------
// Allows:
//   • Scripts     — same origin + 'unsafe-inline' (needed by Next.js RSC and
//                   the FOUC theme script; tighten to nonces in a future pass)
//   • Styles      — same origin + 'unsafe-inline' (CSS-in-JS / inline styles)
//   • Images      — same origin, Supabase storage, API-Football media CDN, data URIs
//   • Fonts       — Google Fonts CDN
//   • Connections — same origin, Supabase REST + Realtime, Stripe
//   • Frames      — Stripe.js (3DS checkout iframes)
//   • Workers     — same origin (service-worker for PWA)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
// Extract just the hostname so CSP is not tied to the full path
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : ""

const cspDirectives = [
  "default-src 'self'",
  // Next.js inline scripts + FOUC script require 'unsafe-inline'; in a
  // future iteration use nonce-based CSP via middleware.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://media.api-sports.io https://img.logo.dev" +
    (supabaseHost ? ` https://${supabaseHost}` : ""),
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'" +
    (supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : "") +
    " https://api.stripe.com https://v3.football.api-sports.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
]

const cspHeader = cspDirectives.join("; ")

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
  // Disable legacy XSS auditor (replaced by CSP)
  { key: "X-XSS-Protection", value: "0" },
  // Referrer: send origin only on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions policy: disable unused browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Content-Security-Policy
  { key: "Content-Security-Policy", value: cspHeader },
  // HSTS: enforce HTTPS for 1 year (only active in production)
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
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
