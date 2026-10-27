import * as React from "react"
import { BsButton } from "@brandsync/react"

import { cn } from "@/lib/utils"

type ButtonVariant =
  | "primary"
  | "neutral"
  | "outline"
  | "ghost"
  | "destructive"
  | "destructive-outline"
  | "link"
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm" | "icon-lg"

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "bs-btn--sm",
  md: "",
  lg: "bs-btn--lg",
  icon: "bs-btn--icon",
  "icon-sm": "bs-btn--icon bs-btn--sm",
  "icon-lg": "bs-btn--icon bs-btn--lg",
}

function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn("bs-btn", `bs-btn--${variant}`, SIZE_CLASS[size], className)
}

const BS_VARIANT = {
  primary: "primary",
  neutral: "neutral",
  outline: "outlined",
  ghost: "subtle",
  destructive: "error",
  "destructive-outline": "error",
  link: "subtle",
} as const

/** Brandsync Button, backed by the `bs-button` web component. Icon children go in its icon slot. */
function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  children,
  "aria-label": ariaLabel,
  labelWidth,
}: Omit<React.ComponentProps<"button">, "ref"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Fixed label width in px, so a column of buttons with different labels lines up. */
  labelWidth?: number
}) {
  return (
    <BsButton
      variant={BS_VARIANT[variant]}
      className={variant === "outline" ? "app-outlined-button" : undefined}
      size="sm"
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick as React.MouseEventHandler<unknown> | undefined}
    >
      {labelWidth ? (
        <span
          style={{ display: "inline-flex", width: labelWidth, alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {React.Children.map(children, (child) =>
            React.isValidElement<{ size?: number }>(child) ? React.cloneElement(child, { size: 16 }) : child
          )}
        </span>
      ) : (
        React.Children.map(children, (child) =>
          React.isValidElement<{ slot?: string; size?: number }>(child)
            ? React.cloneElement(child, { slot: "icon", size: 16 })
            : child
        )
      )}
    </BsButton>
  )
}

export { Button, buttonVariants }
export type { ButtonVariant, ButtonSize }
