import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; flush?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bs-card",
        size === "sm" && "bs-card--sm",
        flush && "bs-card--flush",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  bordered = false,
  ...props
}: React.ComponentProps<"div"> & { bordered?: boolean }) {
  return (
    <div
      data-slot="card-header"
      className={cn("bs-card-header", bordered && "bs-card-header--bordered", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("bs-card-title", className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("bs-card-description", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("bs-card-action", className)} {...props} />
}

function CardContent({
  className,
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      data-slot="card-content"
      className={cn("bs-card-body", flush && "bs-card-body--flush", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("bs-card-footer", className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
