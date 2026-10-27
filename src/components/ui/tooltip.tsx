"use client"

import * as React from "react"
import { BsTooltip } from "@brandsync/react"

/** Shows a Brandsync tooltip under its child on hover or keyboard focus; `bs-tooltip` itself only draws the bubble. */
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const triggerRef = React.useRef<HTMLSpanElement>(null)
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)
  const id = React.useId()

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setPosition({ top: rect.bottom + 10, left: rect.left + rect.width / 2 })
  }
  const hide = () => setPosition(null)

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      aria-describedby={position ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {position && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none fixed z-[500] whitespace-nowrap"
          style={{ top: position.top, left: position.left, transform: "translateX(-50%)" }}
        >
          <BsTooltip>{label}</BsTooltip>
        </span>
      )}
    </span>
  )
}

export { Tooltip }
