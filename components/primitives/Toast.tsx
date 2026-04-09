"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export type ToastType = "goal" | "kickoff" | "finished" | "info"

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  push: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ push: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="md-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={cn("md-toast", `md-toast--${t.type}`)} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
