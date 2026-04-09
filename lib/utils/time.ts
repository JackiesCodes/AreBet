/** Format an ISO time as a localized HH:mm string. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "--:--"
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

/** Format a relative time bucket label. */
export function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = d.getTime() - Date.now()
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 1) return "now"
  if (Math.abs(mins) < 60) return `${mins > 0 ? "in " : ""}${Math.abs(mins)}m${mins < 0 ? " ago" : ""}`
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return `${hours > 0 ? "in " : ""}${Math.abs(hours)}h${hours < 0 ? " ago" : ""}`
  const days = Math.round(hours / 24)
  return `${days > 0 ? "in " : ""}${Math.abs(days)}d${days < 0 ? " ago" : ""}`
}

/** Format short date (e.g. "Apr 7"). */
export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export type TimeBucket = "live" | "in1h" | "today" | "tomorrow" | "upcoming" | "finished"

export function bucketFor(match: { status: string; kickoffISO: string }): TimeBucket {
  if (match.status === "LIVE") return "live"
  if (match.status === "FINISHED") return "finished"
  const t = new Date(match.kickoffISO).getTime()
  if (Number.isNaN(t)) return "upcoming"
  const now = Date.now()
  const diff = t - now
  if (diff <= 60 * 60 * 1000 && diff >= 0) return "in1h"
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(today.getDate() + 2)
  if (t < tomorrow.setHours(0, 0, 0, 0)) return "today"
  if (t < dayAfter.setHours(0, 0, 0, 0)) return "tomorrow"
  return "upcoming"
}

export const BUCKET_LABELS: Record<TimeBucket, string> = {
  live: "Live Now",
  in1h: "Within 1 Hour",
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
  finished: "Finished",
}

export const BUCKET_ORDER: TimeBucket[] = ["live", "in1h", "today", "tomorrow", "upcoming", "finished"]
