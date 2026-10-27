"use client"

import * as React from "react"
import { CaretDown, CaretUp, CaretUpDown } from "@phosphor-icons/react"

import { Checkbox } from "@/components/ui/checkbox"
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SortState } from "@/lib/sort"
import { cn } from "@/lib/utils"

type DataTableColumn<T> = {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  align?: "left" | "right"
  className?: string
  /** Shows a sort control in the header; needs `sort` and `onSortChange` on the table. */
  sortable?: boolean
}

type DataTableSelection = {
  selected: ReadonlySet<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  /** Rows that can't be selected render a disabled checkbox. */
  isSelectable?: (id: string) => boolean
  /** Ids on the current page that can be selected, used for the header checkbox. */
  selectableIds: string[]
}

/**
 * Shared Brandsync table used by every list page: grey header, two-line cells,
 * optional row click + selection. Compose cells with `CellStack` / `CellIcon`.
 */
function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  getRowLabel,
  onRowClick,
  selection,
  emptyMessage,
  sort,
  onSortChange,
}: {
  caption: string
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  /** Accessible name for a row; used for row-click and selection checkboxes. */
  getRowLabel?: (row: T) => string
  onRowClick?: (row: T) => void
  selection?: DataTableSelection
  emptyMessage: string
  sort?: SortState
  onSortChange?: (key: string) => void
}) {
  const selectedOnPage = selection
    ? selection.selectableIds.filter((id) => selection.selected.has(id))
    : []
  const allSelected =
    !!selection &&
    selection.selectableIds.length > 0 &&
    selectedOnPage.length === selection.selectableIds.length
  const someSelected = selectedOnPage.length > 0 && !allSelected
  const columnCount = columns.length + (selection ? 1 : 0)

  return (
    <Table caption={caption}>
      <TableHead>
        <tr>
          {selection && (
            <TableHeader className="w-12">
              <Checkbox
                aria-label="Select all rows on this page"
                checked={allSelected}
                disabled={selection.selectableIds.length === 0}
                onChange={selection.onToggleAll}
                ref={(el: HTMLInputElement | null) => {
                  if (el) el.indeterminate = someSelected
                }}
              />
            </TableHeader>
          )}
          {columns.map((column) => (
            <TableHeader
              key={column.key}
              className={cn(column.align === "right" && "bs-cell-right", column.className)}
              aria-sort={
                column.sortable && sort?.key === column.key
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              {column.sortable && onSortChange ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 hover:text-[var(--bs-text-default)]",
                    column.align === "right" && "flex-row-reverse"
                  )}
                  onClick={() => onSortChange(column.key)}
                >
                  {column.header}
                  {sort?.key === column.key ? (
                    sort.direction === "asc" ? (
                      <CaretUp size={14} aria-hidden="true" />
                    ) : (
                      <CaretDown size={14} aria-hidden="true" />
                    )
                  ) : (
                    <CaretUpDown size={14} aria-hidden="true" className="text-[var(--bs-icon-muted)]" />
                  )}
                </button>
              ) : (
                column.header
              )}
            </TableHeader>
          ))}
        </tr>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columnCount}>
              <EmptyState>{emptyMessage}</EmptyState>
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const id = getRowId(row)
            const isSelected = selection?.selected.has(id) ?? false
            const label = getRowLabel?.(row) ?? id
            return (
              <TableRow
                key={id}
                interactive={!!onRowClick}
                data-selected={isSelected ? "" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? `Open ${label}` : undefined}
                onClick={
                  onRowClick
                    ? (event) => {
                        if ((event.target as HTMLElement).closest("a,button,bs-button,input,label,[role=menu]")) return
                        onRowClick(row)
                      }
                    : undefined
                }
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" && event.target === event.currentTarget) {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
              >
                {selection && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${label}`}
                      checked={isSelected}
                      disabled={selection.isSelectable ? !selection.isSelectable(id) : false}
                      onChange={() => selection.onToggle(id)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    right={column.align === "right"}
                    className={column.className}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

/** Primary value with a smaller secondary line underneath. */
function CellStack({
  primary,
  secondary,
  strong,
  nowrap,
}: {
  primary: React.ReactNode
  secondary?: React.ReactNode
  strong?: boolean
  nowrap?: boolean
}) {
  return (
    <span className={cn("bs-cell-stack", nowrap && "whitespace-nowrap")}>
      <span className={cn("bs-cell-primary", strong && "bs-cell-primary--strong")}>{primary}</span>
      {secondary != null && <span className="bs-cell-secondary">{secondary}</span>}
    </span>
  )
}

/** Leading icon tile + two-line label, e.g. batch / invoice identity cell. */
function CellIcon({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode
  primary: React.ReactNode
  secondary?: React.ReactNode
}) {
  return (
    <span className="bs-cell-identity">
      <span className="bs-cell-icon">{icon}</span>
      <CellStack primary={primary} secondary={secondary} strong />
    </span>
  )
}

/** Row of actions that must not trigger row click; right-aligned unless `align="start"`. */
function CellActions({
  children,
  align = "end",
}: {
  children: React.ReactNode
  align?: "start" | "end"
}) {
  return (
    <div className={cn("bs-cell-actions", align === "start" && "justify-start")}>{children}</div>
  )
}

export { DataTable, CellStack, CellIcon, CellActions }
export type { DataTableColumn, DataTableSelection }
