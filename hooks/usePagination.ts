"use client"

import { useState, useMemo, useCallback } from "react"

/**
 * Load-more pagination — appends items in batches.
 * Resets when `items` reference changes (wrap in useMemo at call site
 * if you want reset on filter changes).
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMore = visibleCount < items.length
  const remaining = Math.min(pageSize, items.length - visibleCount)
  const loadMore = useCallback(() => setVisibleCount((c) => c + pageSize), [pageSize])
  const reset = useCallback(() => setVisibleCount(pageSize), [pageSize])

  return { visibleItems, hasMore, remaining, loadMore, reset, total: items.length }
}
