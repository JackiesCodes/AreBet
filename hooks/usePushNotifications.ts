"use client"

import { useCallback, useEffect, useState } from "react"

export type PushPermission = "default" | "granted" | "denied" | "unsupported"

export function usePushNotifications(): {
  permission: PushPermission
  subscribed: boolean
  request: () => Promise<PushPermission>
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<void>
  notify: (title: string, options?: NotificationOptions) => void
} {
  const [permission, setPermission] = useState<PushPermission>("default")
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PushPermission)

    // Check existing push subscription
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub)
        })
      }).catch(() => undefined)
    }
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

  /** Request permission + subscribe to Web Push. Stores subscription server-side. */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false

    const perm = await request()
    if (perm !== "granted") return false

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      // Fallback: no server push — browser Notification API only
      setSubscribed(true)
      return true
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) { setSubscribed(true); return true }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Store subscription server-side
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      setSubscribed(true)
      return true
    } catch (err) {
      console.warn("Push subscribe failed:", err)
      return false
    }
  }, [request])

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!("serviceWorker" in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setSubscribed(false)
    } catch { /* ignore */ }
  }, [])

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined") return
      if (Notification.permission !== "granted") return
      try { new Notification(title, options) } catch { /* ignore */ }
    },
    [],
  )

  return { permission, subscribed, request, subscribe, unsubscribe, notify }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}
