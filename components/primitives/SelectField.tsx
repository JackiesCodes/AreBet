import type { SelectHTMLAttributes } from "react"

interface SelectOption {
  label: string
  value: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
}

export function SelectField({ label, options, id, ...rest }: SelectFieldProps) {
  return (
    <div className="md-field">
      {label && <label className="md-field-label" htmlFor={id}>{label}</label>}
      <select className="md-select" id={id} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
