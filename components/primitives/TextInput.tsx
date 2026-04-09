import type { InputHTMLAttributes } from "react"

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function TextInput({ label, id, ...rest }: TextInputProps) {
  return (
    <div className="md-field">
      {label && <label className="md-field-label" htmlFor={id}>{label}</label>}
      <input className="md-input" id={id} {...rest} />
    </div>
  )
}
