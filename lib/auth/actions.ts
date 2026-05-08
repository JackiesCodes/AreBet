"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate an email address format server-side. */
function isValidEmail(email: string): boolean {
  // RFC 5321 practical limit is 254 chars; local part ≤ 64
  if (!email || email.length > 254) return false
  // Minimal structural check (delegating deep validation to Supabase)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Validate a password meets minimum strength requirements. */
function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8
}

/**
 * Sanitise the `redirect` query parameter so it can only send users to
 * same-origin paths — prevents open-redirect attacks.
 *
 * Returns "/" if the value is absent or unsafe.
 */
function sanitiseRedirect(raw: string): string {
  if (!raw) return "/"
  // Must start with "/" and must not start with "//" (protocol-relative URL)
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/"
  // Reject anything that contains a protocol colon (e.g. "javascript:")
  if (raw.includes(":")) return "/"
  return raw
}

/** Build the login error redirect URL. */
function loginError(message: string, redirectTo: string): string {
  return `/auth/login?error=${encodeURIComponent(message)}&redirect=${encodeURIComponent(redirectTo)}`
}

/** Build the signup error redirect URL. */
function signupError(message: string, redirectTo: string): string {
  return `/auth/signup?error=${encodeURIComponent(message)}&redirect=${encodeURIComponent(redirectTo)}`
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function signInAction(formData: FormData): Promise<void> {
  const email    = String(formData.get("email")    ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const redirectTo = sanitiseRedirect(String(formData.get("redirect") ?? ""))

  // Server-side validation — never rely solely on HTML5 client validation
  if (!isValidEmail(email)) {
    redirect(loginError("Please enter a valid email address.", redirectTo))
  }
  if (!isValidPassword(password)) {
    redirect(loginError("Password must be at least 8 characters.", redirectTo))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Supabase returns detailed auth errors; surface a safe generic message
    // to prevent user-enumeration attacks while still being useful.
    const safeMsg =
      error.message.includes("Invalid login credentials")
        ? "Invalid email or password."
        : "Sign-in failed. Please try again."
    redirect(loginError(safeMsg, redirectTo))
  }

  redirect(redirectTo)
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email    = String(formData.get("email")    ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const redirectTo = sanitiseRedirect(String(formData.get("redirect") ?? ""))

  // Server-side validation
  if (!isValidEmail(email)) {
    redirect(signupError("Please enter a valid email address.", redirectTo))
  }
  if (!isValidPassword(password)) {
    redirect(signupError("Password must be at least 8 characters.", redirectTo))
  }
  // Basic password complexity: at least one letter and one digit
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    redirect(signupError("Password must contain at least one letter and one number.", redirectTo))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    const safeMsg =
      error.message.toLowerCase().includes("already registered")
        ? "An account with this email already exists."
        : "Sign-up failed. Please try again."
    redirect(signupError(safeMsg, redirectTo))
  }

  redirect(redirectTo)
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
