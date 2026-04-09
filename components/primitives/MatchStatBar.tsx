interface MatchStatBarProps {
  label: string
  home: number
  away: number
  unit?: string
}

export function MatchStatBar({ label, home, away, unit = "" }: MatchStatBarProps) {
  const total = home + away || 1
  const homePct = (home / total) * 100
  const awayPct = (away / total) * 100
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
        <span className="md-mono">{home}{unit}</span>
        <span className="md-text-muted">{label}</span>
        <span className="md-mono">{away}{unit}</span>
      </div>
      <div className="md-statbar">
        <span style={{ textAlign: "right" }} />
        <div className="md-statbar-bar">
          <div className="md-statbar-fill-h" style={{ width: `${homePct}%` }} />
          <div className="md-statbar-fill-a" style={{ width: `${awayPct}%` }} />
        </div>
        <span />
      </div>
    </div>
  )
}
