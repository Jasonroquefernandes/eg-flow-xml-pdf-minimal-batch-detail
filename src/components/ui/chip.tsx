"use client"

import * as React from "react"
import { BsChipInformative } from "@brandsync/react"

import { cn } from "@/lib/utils"

type ChipVariant =
  | "primary"
  | "neutral"
  | "outlined"
  | "success"
  | "warning"
  | "error"
  | "info"

const CHIP_COLOR = {
  primary: "info",
  neutral: "neutral",
  outlined: "neutral",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
} as const

/** Brandsync medium informative chip; a leading icon child is moved into the chip's icon slot. */
function Chip({
  className,
  variant = "neutral",
  children,
}: React.ComponentProps<"span"> & { variant?: ChipVariant }) {
  const [first, ...rest] = React.Children.toArray(children)
  const hasIcon = React.isValidElement(first)
  return (
    <BsChipInformative color={CHIP_COLOR[variant]} size="md" className={className}>
      {hasIcon
        ? React.cloneElement(first as React.ReactElement<{ slot?: string }>, { slot: "icon" })
        : first}
      {rest}
    </BsChipInformative>
  )
}

function Badge({
  className,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "neutral" | "primary" | "error" | "dot"
}) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "bs-badge",
        variant === "primary" && "bs-badge--primary",
        variant === "error" && "bs-badge--error",
        variant === "dot" && "bs-badge--dot",
        className
      )}
      {...props}
    />
  )
}

export { Chip, Badge }
export type { ChipVariant }
