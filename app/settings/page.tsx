"use client"

import { usePreferences } from "@/hooks/usePreferences"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { SelectField } from "@/components/primitives/SelectField"

export default function SettingsPage() {
  const { prefs, setPrefs, loading } = usePreferences()

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
      <PageHeader title="Settings" subtitle="Customize how AreBet looks and works" />
      <Card>
        <CardTitle>Display</CardTitle>
        <CardSubtitle>Density and odds format</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
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
              { label: "American (-118)", value: "american" },
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
              { label: "All", value: "all" },
              { label: "Live", value: "live" },
              { label: "Soon", value: "soon" },
              { label: "Favorites", value: "favorites" },
              { label: "High Confidence", value: "high" },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
