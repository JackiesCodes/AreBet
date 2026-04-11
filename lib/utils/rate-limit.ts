/**
 * Lightweight in-process rate limiter for Next.js route handlers.
 *
 * Uses a sliding-window count per key (typically client IP).
 * Suitable for single-process deployments (Node.js server, local dev).
 *
 * For multi-instance or serverless (Vercel) deployments, replace the
 * in-memory store with Upstash Redis:
 *   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })
 *   const result = limiter.check(ip)
 *   if (!result.allowed) return NextResponse.json(..., { status: 429 })
 */

interface RateLimiterOptions {
  /** Window duration in ms. Default: 60 000 (1 minute) */
  windowMs?: number
  /** Max requests per window per key. Default: 30 */
  max?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // Unix ms timestamp when the window resets
}

interface Bucket {
  count: number
  windowStart: number
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 30
  const store = new Map<string, Bucket>()

  // Periodically evict stale buckets to prevent memory leaks
  const evict = () => {
    const now = Date.now()
    for (const [key, bucket] of store) {
      if (now - bucket.windowStart > windowMs * 2) store.delete(key)
    }
  }

  // Evict every 5 minutes in long-running processes
  if (typeof setInterval !== "undefined") {
    setInterval(evict, 5 * 60_000).unref?.()
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now()
      const existing = store.get(key)

      if (!existing || now - existing.windowStart > windowMs) {
        // New window
        store.set(key, { count: 1, windowStart: now })
        return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
      }

      if (existing.count >= max) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.windowStart + windowMs,
        }
      }

      existing.count++
      return {
        allowed: true,
        remaining: max - existing.count,
        resetAt: existing.windowStart + windowMs,
      }
    },
  }
}

/** Extract the best-effort client IP from a Next.js request. */
export function getClientIp(req: Request): string {
  // Vercel / CDN forwarded headers
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  // Cloudflare
  const cfIp = req.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp
  return "unknown"
}
