"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export type ToastType = "goal" | "kickoff" | "finished" | "info"

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  push: (type: ToastType, message: string) => void
  remove: (id: number) => void
}

const ToastContext = createContext<ToastContextValue>({ push: () => undefined, remove: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div className="md-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={cn("md-toast", `md-toast--${t.type}`)} role="status">
            <span className="md-toast-message">{t.message}</span>
            <button
              type="button"
              className="md-toast-dismiss"
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
