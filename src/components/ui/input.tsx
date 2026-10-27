import * as React from "react"
import { CaretDown as ChevronDown, MagnifyingGlass as Search } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("bs-input", className)} {...props} />
}

function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className={cn("bs-input-group", className)}>
      <Search aria-hidden="true" />
      <input type="search" data-slot="input" className="bs-input" {...props} />
    </div>
  )
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea data-slot="textarea" className={cn("bs-input bs-textarea", className)} {...props} />
  )
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("bs-label", className)} {...props} />
}

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="bs-select-wrapper">
      <select data-slot="select" className={cn("bs-input", className)} {...props}>
        {children}
      </select>
      <span className="bs-select-arrow" aria-hidden="true">
        <ChevronDown />
      </span>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
}: {
  label: string
  htmlFor: string
  helper?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="bs-field">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <span className="bs-error-msg" role="alert">
          {error}
        </span>
      ) : (
        helper && <span className="bs-helper">{helper}</span>
      )}
    </div>
  )
}

export { Input, SearchInput, Textarea, Label, Select, Field }
