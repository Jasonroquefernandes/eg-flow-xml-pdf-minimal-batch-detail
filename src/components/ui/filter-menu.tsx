"use client"

import { CaretDown, type Icon } from "@phosphor-icons/react"

import { Menu, MenuAction, MenuButton, MenuSurface } from "@/components/ui/menu"

/**
 * Filter dropdown whose trigger reads "Label: Value". The label never changes and the menu lists only the
 * option names; a native select cannot do this because it shows the same text in the trigger and the list.
 */
function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { label: string; value: T; icon?: Icon }[]
  onChange: (value: T) => void
}) {
  const current = options.find((option) => option.value === value)
  return (
    <Menu className="bs-select-wrapper">
      <MenuButton aria-label={`Filter by ${label.toLowerCase()}: ${current?.label ?? ""}`} className="bs-input flex items-center gap-2 pr-3 text-left whitespace-nowrap">
        <span>
          {label}: <span className="font-medium text-[var(--bs-text-default)]">{current?.label}</span>
        </span>
        <CaretDown size={14} aria-hidden="true" className="ml-auto text-[var(--bs-icon-muted)]" />
      </MenuButton>
      <MenuSurface align="left" className="z-50 w-56 [&_.bs-menu-item]:border-b-0 [&_.bs-menu-item_svg]:size-4 [&_.bs-menu-item_svg]:text-[var(--bs-text-secondary)]">
        {options.map((option) => (
          <MenuAction key={option.value} icon={option.icon} selected={option.value === value} onClick={() => onChange(option.value)}>
            {option.label}
          </MenuAction>
        ))}
      </MenuSurface>
    </Menu>
  )
}

export { FilterMenu }
