"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Match } from "@/types/match"
import type { SearchEntity } from "@/app/api/search/route"

interface UseSearchKeyboardOptions {
  results: Match[]
  entities: SearchEntity[]
  query: string
  onNavigate: (matchId: number) => void
  onSelectEntity: (entity: SearchEntity) => void
  onClose: () => void
  listRef: React.RefObject<HTMLUListElement | null>
  hasEntities: boolean
}

export function useSearchKeyboard({
  results,
  entities,
  query,
  onNavigate,
  onSelectEntity,
  onClose,
  listRef,
  hasEntities,
}: UseSearchKeyboardOptions) {
  const router = useRouter()
  const [activeIdx, setActiveIdx] = useState(-1)

  // Reset active index when results change
  useEffect(() => { setActiveIdx(-1) }, [query])

  const scrollItemIntoView = useCallback((idx: number) => {
    const list = listRef.current
    if (!list) return
    const item = list.children[hasEntities ? idx + 1 : idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [listRef, hasEntities])

  const navigateToActive = useCallback((idx: number) => {
    if (idx < 0 || idx >= results.length) return
    onNavigate(results[idx].id)
  }, [results, onNavigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { onClose(); return }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => {
        const next = Math.min(i + 1, results.length - 1)
        scrollItemIntoView(next)
        return next
      })
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => {
        const prev = Math.max(i - 1, 0)
        scrollItemIntoView(prev)
        return prev
      })
      return
    }
    if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < results.length) {
        navigateToActive(activeIdx)
      } else if (entities.length > 0) {
        onSelectEntity(entities[0])
      } else if (results[0]) {
        navigateToActive(0)
      }
    }
  }, [onClose, results, entities, activeIdx, navigateToActive, onSelectEntity, scrollItemIntoView, router])

  return { activeIdx, setActiveIdx, handleKeyDown }
}
