"use client"

import * as React from "react"
import { BsDialog } from "@brandsync/react"

/**
 * Brandsync Dialog, backed by the `bs-dialog` web component. The component handles the backdrop,
 * Esc / outside-click dismissal, close button and focus; this wrapper maps the app's props onto it.
 */
function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  className,
  children,
  actions,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: "md" | "lg"
  className?: string
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <BsDialog open={open} heading={title} size={size} className={className} onBsClose={onClose}>
      <div className="flex flex-col gap-4">
        {description && <p className="bs-body-sm bs-text-secondary">{description}</p>}
        {children}
      </div>
      {actions && (
        <div slot="footer" className="flex w-full flex-wrap justify-end gap-3">
          {actions}
        </div>
      )}
    </BsDialog>
  )
}

export { Dialog }
