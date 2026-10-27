import * as React from "react"

import { cn } from "@/lib/utils"

type AvatarSize = "xs" | "sm" | "md" | "lg"

/** Brandsync initials avatar. Pass `name` for the accessible label; children are the (max two) initials. */
function Avatar({
  className,
  size = "md",
  name,
  children,
  ...props
}: React.ComponentProps<"span"> & { size?: AvatarSize; name: string }) {
  return (
    <span
      role="img"
      aria-label={name}
      data-slot="avatar"
      className={cn("bs-avatar", `bs-avatar--${size}`, className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { Avatar }
