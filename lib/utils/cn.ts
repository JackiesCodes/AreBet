/**
 * Lightweight class name merger. Filters falsy values.
 * Not Tailwind-aware — purely concatenates space-separated names.
 */
export type ClassValue = string | number | false | null | undefined | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  for (const v of inputs) {
    if (!v && v !== 0) continue
    if (Array.isArray(v)) {
      const inner = cn(...v)
      if (inner) out.push(inner)
    } else if (typeof v === "string" || typeof v === "number") {
      out.push(String(v))
    }
  }
  return out.join(" ")
}
