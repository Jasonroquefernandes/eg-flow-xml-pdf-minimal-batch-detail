import * as React from "react"
import {
  Warning as AlertTriangle,
  CheckCircle as CheckCircle2,
  Info,
  XCircle as OctagonX,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

type AlertVariant = "info" | "success" | "warning" | "error"

const ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: OctagonX,
} as const

/** Inline message built on the Brandsync Snackbar spec. */
function Alert({
  variant = "info",
  title,
  icon,
  action,
  className,
  children,
}: {
  variant?: AlertVariant
  title: string
  icon?: React.ElementType
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  const Icon = icon ?? ICON[variant]
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("bs-snackbar bs-snackbar--inline", `bs-snackbar--${variant}`, className)}
    >
      <span className="bs-snackbar__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="bs-snackbar__content">
        <div className="bs-snackbar__title">{title}</div>
        {children && <div className="bs-snackbar__message">{children}</div>}
      </div>
      {action && <div className="ml-auto shrink-0 self-center">{action}</div>}
    </div>
  )
}

export { Alert }
export type { AlertVariant }
