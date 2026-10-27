"use client"

import type * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  X,
  CheckCircle as CircleCheckIcon,
  Info as InfoIcon,
  Warning as TriangleAlertIcon,
  XCircle as OctagonXIcon,
  SpinnerGap as Loader2Icon,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"

/** Toasts are rendered as Brandsync snackbars (bs-snackbar classes, unstyled Sonner). */
const Toaster = (props: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="top-center"
      style={{ "--width": "480px" } as React.CSSProperties}
      duration={6000}
      closeButton
      icons={{
        success: <CircleCheckIcon weight="regular" />,
        info: <InfoIcon weight="regular" />,
        warning: <TriangleAlertIcon weight="regular" />,
        error: <OctagonXIcon weight="regular" />,
        loading: <Loader2Icon className="bs-spinner" />,
        close: <X />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "bs-toast",
          icon: "bs-toast__icon",
          content: "bs-toast__content",
          title: "bs-toast__title",
          description: "bs-toast__message",
          actionButton: "bs-toast__action",
          cancelButton: "bs-toast__action",
          closeButton: "bs-toast__close",
          success: "bs-toast--success",
          error: "bs-toast--error",
          warning: "bs-toast--warning",
          info: "bs-toast--info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
