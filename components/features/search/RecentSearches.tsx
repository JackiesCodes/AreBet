"use client"

interface RecentSearchesProps {
  searches: string[]
  onSelect: (query: string) => void
  onRemove: (query: string) => void
  onClearAll: () => void
}

export function RecentSearches({ searches, onSelect, onRemove, onClearAll }: RecentSearchesProps) {
  if (searches.length === 0) return null
  return (
    <div className="gs-recent-wrap">
      <div className="gs-recent-header">
        <span className="gs-section-label">Recent searches</span>
        <button type="button" className="gs-recent-clear-all" onClick={onClearAll}>
          Clear all
        </button>
      </div>
      <div className="gs-recent-list">
        {searches.map((rs) => (
          <div key={rs} className="gs-recent-item">
            <button type="button" className="gs-recent-query" onClick={() => onSelect(rs)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ opacity: 0.5, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              {rs}
            </button>
            <button
              type="button"
              className="gs-recent-remove"
              aria-label={`Remove ${rs} from recent searches`}
              onClick={() => onRemove(rs)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
