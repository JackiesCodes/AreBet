import { cn } from "@/lib/utils/cn"

interface AvatarProps {
  label: string
  size?: "md" | "lg"
  className?: string
}

export function Avatar({ label, size = "md", className }: AvatarProps) {
  const initials = label
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <div className={cn("md-avatar", size === "lg" && "md-avatar--lg", className)} aria-label={label}>
      {initials}
    </div>
  )
}
