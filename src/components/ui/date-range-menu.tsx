"use client"

import { useState } from "react"
import { CalendarBlank, CaretDown, Check } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Menu, MenuAction, MenuButton, MenuSurface } from "@/components/ui/menu"
import { PRESET_RANGES, rangeLabel, type DateRange } from "@/lib/dashboard"

const toInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

function Row({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <MenuAction selected={active} onClick={onClick}>
      <span className="flex w-full items-center justify-between gap-2">
        {label}
        {active && <Check size={14} aria-hidden="true" />}
      </span>
    </MenuAction>
  )
}

/** Time range picker for the dashboards: preset ranges, "All time", or a custom from/to range. */
function DateRangeMenu({ range, onChange }: { range: DateRange; onChange: (range: DateRange) => void }) {
  const [customOpen, setCustomOpen] = useState(false)
  const today = toInput(new Date())
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const valid = from !== "" && to !== "" && from <= to

  // One wrapper keeps the dialog host from becoming its own flex item in the parent row.
  return (
    <div className="inline-flex">
      <Menu className="bs-select-wrapper">
        <MenuButton aria-label={`Time range: ${rangeLabel(range)}`} className="bs-input flex items-center gap-2 pr-3 text-left whitespace-nowrap">
          <CalendarBlank size={16} aria-hidden="true" className="text-[var(--bs-text-secondary)]" />
          <span className="font-medium text-[var(--bs-text-default)]">{rangeLabel(range)}</span>
          <CaretDown size={14} aria-hidden="true" className="ml-2 text-[var(--bs-icon-muted)]" />
        </MenuButton>
        <MenuSurface align="right" className="z-50 w-52 [&_.bs-menu-item]:border-b-0">
          {PRESET_RANGES.map((preset) => (
            <Row key={preset.days} label={preset.label} active={range.kind === "days" && range.days === preset.days} onClick={() => onChange({ kind: "days", days: preset.days })} />
          ))}
          <Row label="All time" active={range.kind === "all"} onClick={() => onChange({ kind: "all" })} />
          <Row
            label="Custom range…"
            active={range.kind === "custom"}
            onClick={() => {
              if (range.kind === "custom") {
                setFrom(range.from)
                setTo(range.to)
              }
              setCustomOpen(true)
            }}
          />
        </MenuSurface>
      </Menu>

      <Dialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom range"
        description="Show batches created between these dates, both included."
        actions={
          <>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button
              disabled={!valid}
              onClick={() => {
                onChange({ kind: "custom", from, to })
                setCustomOpen(false)
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 bs-body-sm">
            From
            <input type="date" className="bs-input" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 bs-body-sm">
            To
            <input type="date" className="bs-input" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        {!valid && <p className="bs-caption text-[var(--bs-text-error)]">Pick a start date that is on or before the end date.</p>}
      </Dialog>
    </div>
  )
}

export { DateRangeMenu }
