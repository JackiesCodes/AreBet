"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils/cn"
import { useFilters } from "@/contexts/FilterContext"
import { SidebarContent } from "@/components/layout/LeftSidebar"

interface MobileFilterSheetProps {
  open: boolean
  onClose: () => void
}

export function MobileFilterSheet({ open, onClose }: MobileFilterSheetProps) {
  const { activeFilterCount } = useFilters()

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Escape key close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop — only mount when open to avoid constant blur overlay */}
      {open && (
        <div
          className="nav-drawer-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <div
        className={cn("filter-sheet", open && "filter-sheet--open")}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label="Filters"
      >
        <div className="filter-sheet-handle" />
        <div className="filter-sheet-header">
          <span className="filter-sheet-title">Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-sheet-count">{activeFilterCount}</span>
          )}
          <button
            type="button"
            className="filter-sheet-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>
        <div className="filter-sheet-body">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}
