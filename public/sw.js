/* AreBet service worker — cache strategy + background push notifications */
const CACHE = "arebet-v1"
const PRECACHE = ["/", "/arebet-logo.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined)
          return response
        })
        .catch(() => caches.match(request).then((r) => r || new Response("offline", { status: 503 }))),
    )
    return
  }

  // Cache-first for same-origin statics
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined)
          }
          return response
        })
      }),
    )
  }
})

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { payload = { title: "AreBet", body: event.data.text() } }

  const title = payload.title ?? "AreBet"
  const options = {
    body: payload.body ?? "",
    icon: "/arebet-logo.svg",
    badge: "/arebet-logo.svg",
    tag: payload.tag ?? `arebet-${Date.now()}`,
    data: { url: payload.url ?? "/" },
    silent: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
