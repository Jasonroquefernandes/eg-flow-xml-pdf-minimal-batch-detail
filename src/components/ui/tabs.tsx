"use client"

import * as React from "react"
import { BsTab, BsTabs } from "@brandsync/react"

/**
 * Brandsync in-page tabs (`bs-tabs` with `bs-tab`). Pass `idPrefix` to give each
 * tab an id (`{idPrefix}-tab-{id}`) and link it to a panel with id `{idPrefix}-panel-{id}`.
 */
function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode; badge?: React.ReactNode }[]
  value: T
  onChange: (id: T) => void
  label: string
  idPrefix?: string
}) {
  return (
    <BsTabs type="bs-tab" aria-label={label}>
      {tabs.map((tab) => (
        <BsTab
          key={tab.id}
          id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
          aria-controls={idPrefix ? `${idPrefix}-panel-${tab.id}` : undefined}
          selected={tab.id === value}
          onBsSelect={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
          {tab.badge != null && (
            <span slot="badge" className="bs-badge bs-badge--tab">
              {tab.badge}
            </span>
          )}
        </BsTab>
      ))}
    </BsTabs>
  )
}

export { Tabs }
