import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

  // If supabase isn't configured (demo / dev), skip silently — return null user.
  if (!url || !key) {
    return { response, user: null as null | { id: string } }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options as CookieOptions)
        }
      },
    },
  })

  try {
    const { data } = await supabase.auth.getUser()
    return { response, user: data.user }
  } catch {
    return { response, user: null }
  }
}
