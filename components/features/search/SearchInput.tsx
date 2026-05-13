"use client"

import type { RefObject } from "react"

interface SearchInputProps {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  loading: boolean
  onQueryChange: (q: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onClear: () => void
  onClose: () => void
  activeIdx: number
}

export function SearchInput({
  inputRef,
  query,
  loading,
  onQueryChange,
  onKeyDown,
  onClear,
  onClose,
  activeIdx,
}: SearchInputProps) {
  return (
    <div className="gs-input-row">
      {loading ? (
        <span className="gs-spinner" aria-hidden />
      ) : (
        <svg className="gs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      )}
      <input
        ref={inputRef}
        id="gs-search-input"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        className="gs-input"
        placeholder="Search any team, player, league…"
        aria-label="Search teams, players, leagues, coaches and venues"
        aria-busy={loading}
        aria-controls="gs-results-list"
        aria-activedescendant={activeIdx >= 0 ? `gs-result-${activeIdx}` : undefined}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button type="button" className="gs-clear-btn" onClick={onClear} aria-label="Clear search">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <button type="button" className="gs-close-btn" onClick={onClose} aria-label="Close search">Esc</button>
    </div>
  )
}
