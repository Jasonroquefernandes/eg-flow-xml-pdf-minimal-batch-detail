import * as React from "react"
import { Check, Minus } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { children?: React.ReactNode }) {
  return (
    <label className={cn("bs-checkbox", className)}>
      <input type="checkbox" {...props} />
      <span className="bs-checkbox__box">
        <Check
          className="bs-icon-check"
          color="var(--bs-color-primary-default)"
          weight="bold"
          aria-hidden="true"
        />
        <Minus
          className="bs-icon-indeterminate"
          color="var(--bs-color-primary-default)"
          weight="bold"
          aria-hidden="true"
          style={{ opacity: 0 }}
        />
      </span>
      {children}
    </label>
  )
}

function Switch({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "role"> & { children?: React.ReactNode }) {
  return (
    <label className={cn("bs-switch", className)}>
      <input type="checkbox" role="switch" {...props} />
      <span className="bs-switch__track">
        <span className="bs-switch__thumb" />
      </span>
      {children}
    </label>
  )
}

export { Checkbox, Switch }
