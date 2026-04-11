"use client"

import { useCallback, useEffect, useState } from "react"
import { usePreferences } from "@/hooks/usePreferences"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { SelectField } from "@/components/primitives/SelectField"
import { Toggle } from "@/components/primitives/Toggle"
import { Button } from "@/components/primitives/Button"
import type { AlertPreferences } from "@/types/alerts"

type NotifPermission = "default" | "granted" | "denied" | "unsupported"

// ── Grouped alert toggle config ──────────────────────────────────────────────

interface AlertToggleDef {
  key: keyof Omit<AlertPreferences, "watchedOnly">
  label: string
  description: string
}

const CRITICAL_ALERTS: AlertToggleDef[] = [
  {
    key: "wentLive",
    label: "Match went live",
    description: "Alert when a tracked match kicks off",
  },
  {
    key: "goals",
    label: "Goals scored",
    description: "Alert every time a goal is scored",
  },
  {
    key: "redCards",
    label: "Red cards",
    description: "Alert when a player is sent off",
  },
  {
    key: "valueAppeared",
    label: "Value spot appeared",
    description: "Alert when model detects a value edge ≥ 5%",
  },
]

const SECONDARY_ALERTS: AlertToggleDef[] = [
  {
    key: "kickoffSoon",
    label: "Kicking off in 30 min",
    description: "Alert when a tracked match is approaching kickoff",
  },
  {
    key: "confidenceUp",
    label: "Confidence rising",
    description: "Alert when signal strength increases by 8+ points",
  },
  {
    key: "oddsDrift",
    label: "Odds movement",
    description: "Alert when a market moves more than 5%",
  },
  {
    key: "valueDisappeared",
    label: "Value spot closed",
    description: "Alert when a value edge drops below threshold",
  },
  {
    key: "confidenceDown",
    label: "Confidence falling",
    description: "Alert when signal strength drops by 8+ points",
  },
  {
    key: "matchFinished",
    label: "Match finished",
    description: "Alert when a tracked match ends",
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { prefs, setPrefs, loading } = usePreferences()
  const { alertPrefs, setAlertPrefs } = useMatchIntelligence()
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

  const setPref = useCallback(
    (key: keyof AlertPreferences, value: boolean) => {
      setAlertPrefs({ ...alertPrefs, [key]: value })
    },
    [alertPrefs, setAlertPrefs],
  )

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

      {/* ── Display ───────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Display</CardTitle>
        <CardSubtitle>Density, odds format, and default view</CardSubtitle>
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
          <SelectField
            label="Default sort"
            value={prefs.default_sort}
            onChange={(e) => setPrefs({ default_sort: e.target.value as "confidence" | "kickoff" | "odds" | "league" })}
            options={[
              { label: "Kickoff", value: "kickoff" },
              { label: "Confidence", value: "confidence" },
              { label: "Best odds", value: "odds" },
              { label: "League", value: "league" },
            ]}
          />
          <SelectField
            label="Default filter"
            value={prefs.default_filter_status}
            onChange={(e) => setPrefs({ default_filter_status: e.target.value as "all" | "live" | "soon" | "favorites" | "high" })}
            options={[
              { label: "All matches", value: "all" },
              { label: "Live now", value: "live" },
              { label: "Kicking off soon", value: "soon" },
              { label: "My watchlist", value: "favorites" },

              { label: "High confidence", value: "high" },
            ]}
          />
        </div>
      </Card>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardTitle>Alerts &amp; Signals</CardTitle>
        <CardSubtitle>Control which match events appear in your alert feed</CardSubtitle>

        {/* Watchlist scope toggle */}
        <div className="settings-scope-banner">
          <Toggle
            checked={alertPrefs.watchedOnly}
            onChange={(v) => setPref("watchedOnly", v)}
            label="Watchlist only"
            description="Only surface alerts for matches, teams, and leagues you follow. Off = alerts for all live matches."
          />
        </div>

        <div className="settings-alert-cols">
          {/* Critical alerts */}
          <div className="settings-alert-group">
            <div className="settings-alert-group-label">High-priority signals</div>
            <div className="settings-toggles">
              {CRITICAL_ALERTS.map(({ key, label, description }) => (
                <Toggle
                  key={key}
                  checked={alertPrefs[key]}
                  onChange={(v) => setPref(key, v)}
                  label={label}
                  description={description}
                />
              ))}
            </div>
          </div>

          {/* Secondary alerts */}
          <div className="settings-alert-group">
            <div className="settings-alert-group-label">Secondary signals</div>
            <div className="settings-toggles">
              {SECONDARY_ALERTS.map(({ key, label, description }) => (
                <Toggle
                  key={key}
                  checked={alertPrefs[key]}
                  onChange={(v) => setPref(key, v)}
                  label={label}
                  description={description}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Browser notifications ─────────────────────────────────────────── */}
      <Card>
        <CardTitle>Browser Notifications</CardTitle>
        <CardSubtitle>Get notified of goals and value spots even when AreBet is in the background</CardSubtitle>

        <div className="settings-notif-block">
          {notifPerm === "unsupported" && (
            <div className="settings-notif-status settings-notif-status--muted">
              Browser notifications are not supported in this environment.
            </div>
          )}

          {notifPerm === "denied" && (
            <div className="settings-notif-status settings-notif-status--warning">
              Notifications are blocked. To enable them, update your browser's site permissions for this page, then reload.
            </div>
          )}

          {notifPerm === "default" && (
            <div className="settings-notif-enable">
              <p className="settings-notif-copy">
                AreBet can notify you about goals, value spots, and live starts — even when you're on another tab.
                We only send high-priority alerts, never marketing.
              </p>
              <Button variant="primary" onClick={requestNotifPermission}>
                Enable notifications
              </Button>
            </div>
          )}

          {notifPerm === "granted" && (
            <div className="settings-notif-status settings-notif-status--ok">
              ✓ Notifications enabled — you'll be alerted for goals, value spots, and live starts.
              Manage which alerts fire using the toggles above.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
