"use client"

import * as React from "react"
import {
  Menu as HeadlessMenu,
  MenuButton,
  MenuHeading,
  MenuItem,
  MenuItems,
  MenuSection as HeadlessMenuSection,
  MenuSeparator,
} from "@headlessui/react"

import { cn } from "@/lib/utils"

/** Brandsync Menu (surface, header, items). Headless UI supplies roles, arrow-key nav and aria-expanded. */
function Menu({ className, ...props }: React.ComponentProps<typeof HeadlessMenu>) {
  return <HeadlessMenu as="div" className={cn("relative", className)} {...props} />
}

function MenuSurface({
  className,
  align = "left",
  anchor,
  ...props
}: React.ComponentProps<typeof MenuItems> & { align?: "left" | "right" }) {
  return (
    <MenuItems
      anchor={anchor}
      className={cn(
        "bs-menu-surface",
        // An anchored menu is portalled and positioned by Headless UI; otherwise position it under its trigger.
        !anchor && ["absolute mt-2", align === "right" ? "right-0" : "left-0"],
        className
      )}
      {...props}
    />
  )
}

function MenuHeader({ className, ...props }: React.ComponentProps<typeof MenuHeading>) {
  return <MenuHeading className={cn("bs-menu-header", className)} {...props} />
}

function MenuSection(props: React.ComponentProps<typeof HeadlessMenuSection>) {
  return <HeadlessMenuSection {...props} />
}

function MenuDivider() {
  return <MenuSeparator className="bs-divider" />
}

function MenuAction({
  className,
  selected,
  danger,
  icon: Icon,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  selected?: boolean
  danger?: boolean
  icon?: React.ComponentType<{ "aria-hidden"?: boolean }>
  children: React.ReactNode
}) {
  return (
    <MenuItem>
      <button
        type="button"
        className={cn(
          "bs-menu-item",
          selected && "bs-menu-item--selected",
          danger && "bs-menu-item--danger",
          className
        )}
        {...props}
      >
        {Icon && <Icon aria-hidden />}
        {children}
      </button>
    </MenuItem>
  )
}

export { Menu, MenuButton, MenuSurface, MenuSection, MenuHeader, MenuDivider, MenuAction }
