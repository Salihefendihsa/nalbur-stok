import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gray-700">{label}</label>
      )}
      <input className={`input ${error ? 'border-red-300 ring-1 ring-red-300' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
