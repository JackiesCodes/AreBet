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

  /** Fetch role + tier from the profiles table for the given user.
   *  Returns "ok" | "retry" | "fatal" so callers can decide whether to retry.
   *  "fatal" = non-transient error (schema mismatch, bad request) — don't retry. */
  async function loadProfile(userId: string): Promise<"ok" | "retry" | "fatal"> {
    try {
      const supabase = createClient()
      const { data, error, status } = await supabase
        .from("profiles")
        .select("role, tier")
        .eq("id", userId)
        .single()

      if (error) {
        // 400 = column doesn't exist or schema mismatch → fatal, no point retrying
        if (status === 400) {
          console.error("[auth] profile query rejected (400) — the 'role' column may be missing. Run the schema migration in Supabase.", error.message)
          return "fatal"
        }
        // PGRST116 = row not found (new user whose trigger hasn't run yet) → retry
        if (error.code !== "PGRST116") {
          console.warn("[auth] profile load error:", error.code, error.message)
        }
        return "retry"
      }

      if (data) {
        setRole((data.role as UserRole) ?? "user")
        setTier((data.tier as "free" | "pro" | "elite") ?? "free")
      }
      return "ok"
    } catch (err) {
      console.warn("[auth] loadProfile threw:", err)
      return "retry"
    }
  }

  /** Load profile with one automatic retry after 1.5s on transient failures. */
  async function loadProfileWithRetry(userId: string) {
    const result = await loadProfile(userId)
    if (result === "ok") return
    if (result === "fatal") {
      // Schema error: fall back to safe defaults immediately, no retry
      setRole("user")
      setTier("free")
      return
    }
    // Transient failure: one retry
    await new Promise((r) => setTimeout(r, 1500))
    const result2 = await loadProfile(userId)
    if (result2 !== "ok") {
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
          await loadProfileWithRetry(u.id)
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
        await loadProfileWithRetry(u.id)
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
