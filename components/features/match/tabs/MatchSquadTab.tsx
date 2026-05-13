"use client"

import Image from "next/image"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"

export function MatchSquadTab({ match }: { match: Match }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Trophies */}
      <div>
        <h4 className="insight-section-title">🏆 Honours</h4>
        {!match.trophies ? (
          <p className="md-text-muted">No trophy data.</p>
        ) : (
          <div className="trophies-wrap">
            {[
              { label: match.home.name, list: match.trophies.home ?? [] },
              { label: match.away.name, list: match.trophies.away ?? [] },
            ].map(({ label, list }) => (
              <div key={label} className="trophies-col">
                <div className="trophies-team-label">{label}</div>
                {list.length === 0 ? (
                  <p className="md-text-muted" style={{ fontSize: 12 }}>No data</p>
                ) : (
                  list.filter((t) => t.place === "Winner").slice(0, 8).map((t, i) => (
                    <div key={i} className="trophy-item">
                      <span className="trophy-icon">🏆</span>
                      <div className="trophy-info">
                        <div className="trophy-league">{t.league}</div>
                        <div className="trophy-season">{t.country} · {t.season}</div>
                      </div>
                      <span className={cn("trophy-place", t.place === "Winner" ? "trophy-place--winner" : "trophy-place--runner")}>
                        {t.place}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidelined */}
      {match.sidelined && (match.sidelined.home?.length || match.sidelined.away?.length) ? (
        <div>
          <h4 className="insight-section-title">🚑 Long-term Absent</h4>
          <div className="sidelined-wrap">
            {[
              { label: match.home.name, list: match.sidelined.home ?? [] },
              { label: match.away.name, list: match.sidelined.away ?? [] },
            ].map(({ label, list }) => list.length > 0 && (
              <div key={label}>
                <div className="sidelined-team-label">{label}</div>
                {list.map((s, i) => (
                  <div key={i} className="sidelined-item">
                    {s.playerPhoto
                      ? <Image src={s.playerPhoto} alt={s.playerName} width={32} height={32} className="sidelined-photo" />
                      : <div className="sidelined-photo" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
                    }
                    <div className="sidelined-info">
                      <div className="sidelined-name">{s.playerName}</div>
                      <div className="sidelined-type">{s.type}</div>
                    </div>
                    <div className="sidelined-dates">
                      {s.start.slice(0, 10)}{s.end ? ` → ${s.end.slice(0, 10)}` : " → ongoing"}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Transfers */}
      {match.transfers && (match.transfers.home?.length || match.transfers.away?.length) ? (
        <div>
          <h4 className="insight-section-title">🔄 Recent Transfers</h4>
          <div className="transfers-wrap">
            {[
              { label: match.home.name, list: match.transfers.home ?? [] },
              { label: match.away.name, list: match.transfers.away ?? [] },
            ].map(({ label, list }) => list.length > 0 && (
              <div key={label}>
                <div className="transfers-team-label">{label}</div>
                {list.map((t, i) => (
                  <div key={i} className="transfer-item">
                    <span className="transfer-player">{t.playerName}</span>
                    <div className="transfer-teams">
                      <span>{t.teamOut}</span>
                      <span className="transfer-arrow">→</span>
                      <span>{t.teamIn}</span>
                    </div>
                    <span className="transfer-type">{t.type}</span>
                    <span className="transfer-date">{t.date.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  )
}
