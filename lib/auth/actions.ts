"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const redirectTo = String(formData.get("redirect") ?? "/")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(
      `/auth/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`,
    )
  }
  redirect(redirectTo)
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const redirectTo = String(formData.get("redirect") ?? "/")

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect(
      `/auth/signup?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`,
    )
  }
  redirect(redirectTo)
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
