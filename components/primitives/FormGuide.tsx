import { cn } from "@/lib/utils/cn"

interface FormGuideProps {
  form: string
  className?: string
}

export function FormGuide({ form, className }: FormGuideProps) {
  const chars = form.toUpperCase().split("").slice(-5)
  return (
    <div className={cn("md-form", className)} aria-label={`Form: ${form}`}>
      {chars.map((c, i) => {
        const tone = c === "W" ? "w" : c === "L" ? "l" : "d"
        return (
          <span key={i} className={cn("md-form-pip", `md-form-pip--${tone}`)}>
            {c}
          </span>
        )
      })}
    </div>
  )
}
