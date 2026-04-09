"use client"

import { useCallback, useEffect, useState } from "react"

export type PushPermission = "default" | "granted" | "denied" | "unsupported"

export function usePushNotifications(): {
  permission: PushPermission
  request: () => Promise<PushPermission>
  notify: (title: string, options?: NotificationOptions) => void
} {
  const [permission, setPermission] = useState<PushPermission>("default")

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PushPermission)
  }, [])

  const request = useCallback(async (): Promise<PushPermission> => {
    if (typeof Notification === "undefined") return "unsupported"
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermission)
      return result as PushPermission
    } catch {
      return "denied"
    }
  }, [])

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined") return
      if (Notification.permission !== "granted") return
      try {
        new Notification(title, options)
      } catch {
        /* ignore */
      }
    },
    [],
  )

  return { permission, request, notify }
}
