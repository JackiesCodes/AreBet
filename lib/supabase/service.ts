/**
 * Service-role Supabase client — SERVER ONLY.
 *
 * This client bypasses Row Level Security entirely.
 * NEVER import this in client components or expose it to the browser.
 * Use it only in route handlers (app/api/**) or server actions.
 *
 * Requires env var: SUPABASE_SERVICE_ROLE_KEY
 * (set in .env.local, never prefixed with NEXT_PUBLIC_)
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Missing Supabase service-role credentials. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    )
  }

  return createSupabaseClient(url, key, {
    auth: {
      // Service role should never persist sessions
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
