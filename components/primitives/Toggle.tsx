import { cn } from "@/lib/utils/cn"

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  id?: string
}

export function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps) {
  const inputId = id ?? `toggle-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <label
      htmlFor={inputId}
      className={cn("toggle-row", disabled && "toggle-row--disabled")}
    >
      <div className="toggle-text">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-description">{description}</span>}
      </div>
      <div className={cn("toggle-track", checked && "toggle-track--on")}>
        <input
          id={inputId}
          type="checkbox"
          className="toggle-input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-checked={checked}
        />
        <span className="toggle-thumb" aria-hidden />
      </div>
    </label>
  )
}
