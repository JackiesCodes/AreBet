"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { createClient } from "@/lib/supabase/client"
import { signOutAction } from "@/lib/auth/actions"
import { TierBadge } from "@/components/primitives/TierBadge"
import Link from "next/link"

// ── Avatar initials helper ────────────────────────────────────────────────────
function getInitials(email: string, username?: string): string {
  if (username) return username.slice(0, 2).toUpperCase()
  const local = email.split("@")[0]
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

function AvatarLarge({ initials }: { initials: string }) {
  return (
    <div className="profile-avatar-lg" aria-hidden>
      {initials}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, tier } = useAuth()
  const [username, setUsername] = useState("")
  const [savedUsername, setSavedUsername] = useState("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Load current username from profiles table
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const name = data?.username ?? ""
        setUsername(name)
        setSavedUsername(name)
      })
  }, [user])

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSave() {
    if (!user) return
    const trimmed = username.trim()
    if (trimmed.length > 32) { setError("Username must be 32 characters or less."); return }
    if (trimmed && !/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setError("Username can only contain letters, numbers, _, . and -")
      return
    }
    setSaving(true)
    setError("")
    const supabase = createClient()
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ username: trimmed || null })
      .eq("id", user.id)
    setSaving(false)
    if (dbErr) {
      if (dbErr.code === "23505") setError("That username is already taken.")
      else setError("Failed to save. Please try again.")
      return
    }
    setSavedUsername(trimmed)
    setEditing(false)
    setSuccess("Profile updated.")
    setTimeout(() => setSuccess(""), 3000)
  }

  function handleCancel() {
    setUsername(savedUsername)
    setEditing(false)
    setError("")
  }

  if (!user) {
    return (
      <div className="md-page">
        <div className="profile-unauth">
          <p className="md-text-muted">You need to be signed in to view your profile.</p>
          <Link href="/auth/login" className="md-btn md-btn--primary">Sign in</Link>
        </div>
      </div>
    )
  }

  const initials = getInitials(user.email ?? "U", savedUsername)
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : null

  return (
    <div className="md-page profile-page">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="profile-hero">
        <AvatarLarge initials={initials} />
        <div className="profile-hero-info">
          <div className="profile-hero-name">
            {savedUsername || user.email?.split("@")[0]}
          </div>
          <div className="profile-hero-email">{user.email}</div>
          <div className="profile-hero-badges">
            <TierBadge tier={tier ?? "free"} />
            {joinedDate && (
              <span className="profile-hero-joined">Joined {joinedDate}</span>
            )}
          </div>
        </div>
      </div>

      {success && (
        <div className="profile-success-banner">{success}</div>
      )}

      {/* ── Edit profile ───────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2 className="profile-section-title">Account Details</h2>

        {/* Username */}
        <div className="profile-field">
          <label className="profile-field-label" htmlFor="profile-username">
            Display name
          </label>
          {editing ? (
            <div className="profile-field-edit-row">
              <input
                ref={inputRef}
                id="profile-username"
                type="text"
                className="profile-field-input"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError("") }}
                placeholder="e.g. jackie_bets"
                maxLength={32}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                  if (e.key === "Escape") handleCancel()
                }}
              />
              <button
                type="button"
                className="md-btn md-btn--primary md-btn--sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="md-btn md-btn--ghost md-btn--sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="profile-field-value-row">
              <span className="profile-field-value">
                {savedUsername || <span className="profile-field-placeholder">Not set</span>}
              </span>
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          )}
          {error && <p className="profile-field-error">{error}</p>}
          <p className="profile-field-hint">
            Your public display name. Used in your profile and bet history.
          </p>
        </div>

        {/* Email — read-only */}
        <div className="profile-field">
          <label className="profile-field-label">Email address</label>
          <div className="profile-field-value-row">
            <span className="profile-field-value">{user.email}</span>
            <span className="profile-field-readonly-tag">Read-only</span>
          </div>
          <p className="profile-field-hint">
            Your email is managed through authentication and cannot be changed here.
          </p>
        </div>
      </section>

      {/* ── Subscription ───────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2 className="profile-section-title">Subscription</h2>
        <div className="profile-plan-row">
          <div className="profile-plan-info">
            <TierBadge tier={tier ?? "free"} />
            <span className="profile-plan-name">
              {tier === "elite" ? "Elite Plan" : tier === "pro" ? "Pro Plan" : "Free Plan"}
            </span>
          </div>
          <Link href="/subscription" className="md-btn md-btn--primary md-btn--sm">
            {tier === "free" ? "Upgrade" : "Manage Plan"}
          </Link>
        </div>
      </section>

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <section className="profile-section">
        <h2 className="profile-section-title">Quick Links</h2>
        <div className="profile-links-grid">
          <Link href="/user/dashboard" className="profile-quick-link">
            <span className="profile-quick-link-icon">📊</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/favorites" className="profile-quick-link">
            <span className="profile-quick-link-icon">♥</span>
            <span>Watchlist</span>
          </Link>
          <Link href="/settings" className="profile-quick-link">
            <span className="profile-quick-link-icon">⚙</span>
            <span>Settings</span>
          </Link>
          <Link href="/subscription" className="profile-quick-link">
            <span className="profile-quick-link-icon">⚡</span>
            <span>Subscription</span>
          </Link>
        </div>
      </section>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      <section className="profile-section profile-section--danger">
        <h2 className="profile-section-title profile-section-title--danger">Sign Out</h2>
        <p className="profile-danger-text">
          Sign out of your account on this device.
        </p>
        <form action={signOutAction}>
          <button type="submit" className="md-btn md-btn--ghost md-btn--sm profile-signout-btn">
            Sign out
          </button>
        </form>
      </section>

    </div>
  )
}
