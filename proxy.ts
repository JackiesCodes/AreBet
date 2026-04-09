import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const PROTECTED_PATHS = [
  "/live-matches",
  "/upcoming-matches",
  "/predictions",
  "/odds-comparison",
  "/standings",
  "/teams",
  "/favorites",
  "/insights",
  "/match",
  "/user",
  "/settings",
  "/subscription",
  "/admin",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { response, user } = await updateSession(request)

  const requiresAuth = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (requiresAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // If signed-in user lands on auth pages, bounce them home.
  if ((pathname === "/auth/login" || pathname === "/auth/signup" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.delete("redirect")
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
}
