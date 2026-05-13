"use client"

import type { Match } from "@/types/match"
import { usePagination } from "@/hooks/usePagination"
import { MatchTableRow } from "./MatchTableRow"
import { Skeleton } from "@/components/primitives/Skeleton"

const TABLE_PAGE_SIZE = 25

interface MatchTableViewProps {
  filtered: Match[]
}

export function MatchTableView({ filtered }: MatchTableViewProps) {
  const { visibleItems, hasMore, remaining, loadMore } = usePagination(filtered, TABLE_PAGE_SIZE)
  return (
    <>
      <table className="md-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>League</th>
            <th>Match</th>
            <th>Score</th>
            <th>Conf.</th>
            <th title="Home Win">1</th>
            <th title="Draw">X</th>
            <th title="Away Win">2</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((m) => (
            <MatchTableRow key={m.id} match={m} />
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="load-more-wrap">
          <button type="button" className="load-more-btn" onClick={loadMore}>
            Load {remaining} more rows
          </button>
        </div>
      )}
    </>
  )
}
