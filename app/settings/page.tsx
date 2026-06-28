"use client"

import { useCallback, useEffect, useState } from "react"
import { usePreferences } from "@/hooks/usePreferences"
import { useTheme, type Theme } from "@/hooks/useTheme"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { SelectField } from "@/components/primitives/SelectField"
import { Button } from "@/components/primitives/Button"
import { cn } from "@/lib/utils/cn"

type NotifPermission = "default" | "granted" | "denied" | "unsupported"

// ── Page ─────────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; icon: string; desc: string }[] = [
  { value: "dark",  label: "Dark",  icon: "🌙", desc: "Dark backgrounds, easy on the eyes at night" },
  { value: "light", label: "Light", icon: "☀️", desc: "Bright backgrounds, great in daylight" },
]

export default function SettingsPage() {
  const { prefs, setPrefs, loading } = usePreferences()
  const { theme, setTheme } = useTheme()
  const [notifPerm, setNotifPerm] = useState<NotifPermission>("default")

  // Read current browser notification permission
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNotifPerm("unsupported")
      return
    }
    setNotifPerm(Notification.permission as NotifPermission)
  }, [])

  const requestNotifPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return
    const result = await Notification.requestPermission()
    setNotifPerm(result as NotifPermission)
  }, [])

  if (loading) {
    return (
      <div className="md-page">
        <PageHeader title="Settings" />
        <div className="md-text-muted">Loading…</div>
      </div>
    )
  }

  return (
    <div className="md-page">
      <PageHeader title="Settings" subtitle="Customize how AreBet looks and works for you" />

      {/* ── Appearance ────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Appearance</CardTitle>
        <CardSubtitle>Choose your preferred colour theme</CardSubtitle>
        <div className="settings-theme-options">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn("settings-theme-card", theme === opt.value && "settings-theme-card--active")}
              onClick={() => setTheme(opt.value)}
              aria-pressed={theme === opt.value}
            >
              <div className={`settings-theme-preview settings-theme-preview--${opt.value}`}>
                <div className="settings-theme-preview-nav" />
                <div className="settings-theme-preview-body">
                  <div className="settings-theme-preview-card" />
                  <div className="settings-theme-preview-card settings-theme-preview-card--short" />
                </div>
              </div>
              <div className="settings-theme-label">
                <span className="settings-theme-icon">{opt.icon}</span>
                <span className="settings-theme-name">{opt.label}</span>
              </div>
              {theme === opt.value && (
                <span className="settings-theme-check" aria-hidden>✓</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Display ───────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Display</CardTitle>
        <CardSubtitle>Density and odds format</CardSubtitle>
        <div className="settings-grid">
          <SelectField
            label="Density"
            value={prefs.density}
            onChange={(e) => setPrefs({ density: e.target.value as "compact" | "comfortable" })}
            options={[
              { label: "Compact", value: "compact" },
              { label: "Comfortable", value: "comfortable" },
            ]}
          />
          <SelectField
            label="Odds format"
            value={prefs.odds_format}
            onChange={(e) => setPrefs({ odds_format: e.target.value as "decimal" | "fractional" | "american" })}
            options={[
              { label: "Decimal (1.85)", value: "decimal" },
              { label: "Fractional (17/20)", value: "fractional" },
              { label: "American (−118)", value: "american" },
            ]}
          />
        </div>
      </Card>

      {/* ── Responsible Gambling ──────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Responsible Gambling</CardTitle>
        <CardSubtitle>Set limits to help manage your betting activity</CardSubtitle>

        <div className="settings-rg-block">
          <div className="settings-rg-row">
            <div className="settings-rg-label">
              <strong>Deposit Limit</strong>
              <p className="settings-rg-desc">Set a daily, weekly, or monthly deposit cap.</p>
            </div>
            <Button variant="secondary" onClick={() => {}}>
              Set limit
            </Button>
          </div>
          <div className="settings-rg-row">
            <div className="settings-rg-label">
              <strong>Session Limit</strong>
              <p className="settings-rg-desc">Get a reminder when you&apos;ve been logged in for a set duration.</p>
            </div>
            <Button variant="secondary" onClick={() => {}}>
              Set limit
            </Button>
          </div>
          <div className="settings-rg-row">
            <div className="settings-rg-label">
              <strong>Self-Exclusion</strong>
              <p className="settings-rg-desc">Temporarily or permanently pause your account.</p>
            </div>
            <Button variant="secondary" onClick={() => {}}>
              Learn more
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Browser notifications ─────────────────────────────────────────── */}
      <Card>
        <CardTitle>Browser Notifications</CardTitle>
        <CardSubtitle>Get notified about live matches even when AreBet is in the background</CardSubtitle>

        <div className="settings-notif-block">
          {notifPerm === "unsupported" && (
            <div className="settings-notif-status settings-notif-status--muted">
              Browser notifications are not supported in this environment.
            </div>
          )}

          {notifPerm === "denied" && (
            <div className="settings-notif-status settings-notif-status--warning">
              Notifications are blocked. To enable them, update your browser&apos;s site permissions for this page, then reload.
            </div>
          )}

          {notifPerm === "default" && (
            <div className="settings-notif-enable">
              <p className="settings-notif-copy">
                AreBet can notify you about live match starts and score updates — even when you&apos;re on another tab.
              </p>
              <Button variant="primary" onClick={requestNotifPermission}>
                Enable notifications
              </Button>
            </div>
          )}

          {notifPerm === "granted" && (
            <div className="settings-notif-status settings-notif-status--ok">
              ✓ Notifications enabled — you&apos;ll be alerted for live match starts and score updates.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
