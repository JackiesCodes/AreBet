/**
 * Next.js Edge Middleware
 *
 * Responsibilities:
 *   1. Refresh Supabase auth session on every request (keeps cookies valid).
 *   2. Guard protected routes — redirect unauthenticated visitors to /auth/login.
 *   3. Redirect already-authenticated visitors away from auth pages.
 *
 * Route classification:
 *   AUTH_ROUTES   — login/signup pages (redirect authed users away)
 *   GUEST_ROUTES  — public pages that need no session
 *   PROTECTED     — everything else listed below requires a session
 *
 * Admin authorisation happens at the API layer (x-admin-secret header);
 * middleware only enforces that a *session* exists before the page loads.
 */

import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Pages that require an authenticated session
const PROTECTED_PREFIXES = [
  "/admin",
  "/user",
  "/settings",
  "/subscription",
  "/favorites",
  "/insights",
] as const

// Pages that authenticated users should be redirected away from
const AUTH_PAGES = ["/auth/login", "/auth/signup"] as const

// Static / API paths that should always pass through untouched
const BYPASS_PREFIXES = [
  "/_next",
  "/api",
  "/favicon",
  "/manifest",
  "/arebet-logo",
  "/sw.js",
] as const

function isBypassed(pathname: string): boolean {
  return BYPASS_PREFIXES.some((p) => pathname.startsWith(p))
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Pass through static assets and API routes without session overhead
  if (isBypassed(pathname)) {
    return NextResponse.next()
  }

  // Refresh session + get current user (updates auth cookies)
  const { response, user } = await updateSession(request)

  // Redirect unauthenticated visitors away from protected pages
  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/auth/login"
    // Preserve the destination so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect already-authenticated visitors away from login/signup
  if (user && isAuthPage(pathname)) {
    const dest = request.nextUrl.searchParams.get("redirect") ?? "/"
    // Validate redirect destination is same-origin only
    const destUrl = request.nextUrl.clone()
    destUrl.pathname = dest.startsWith("/") ? dest : "/"
    destUrl.search = ""
    return NextResponse.redirect(destUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static (static files)
     *   - _next/image  (image optimisation)
     *   - favicon.ico, robots.txt, etc.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt).*)",
  ],
}
