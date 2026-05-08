"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = "user" | "admin"

interface AuthContextValue {
  user:    User | null
  loading: boolean
  /** Role from the profiles table. null while loading or unauthenticated. */
  role:    UserRole | null
  /** Subscription tier from the profiles table. */
  tier:    "free" | "pro" | "elite" | null
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  role:    null,
  tier:    null,
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role,    setRole]    = useState<UserRole | null>(null)
  const [tier,    setTier]    = useState<"free" | "pro" | "elite" | null>(null)

  /** Fetch role + tier from the profiles table for the given user. */
  async function loadProfile(userId: string) {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("profiles")
        .select("role, tier")
        .eq("id", userId)
        .single()

      if (data) {
        setRole((data.role as UserRole) ?? "user")
        setTier((data.tier as "free" | "pro" | "elite") ?? "free")
      }
    } catch {
      // Graceful: if profiles table doesn't exist yet (fresh deploy), default to non-admin
      setRole("user")
      setTier("free")
    }
  }

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!mounted) return
        const u = data.user ?? null
        setUser(u)
        if (u) {
          await loadProfile(u.id)
        } else {
          setRole(null)
          setTier(null)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setUser(null)
        setRole(null)
        setTier(null)
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await loadProfile(u.id)
      } else {
        setRole(null)
        setTier(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, role, tier }}>
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
