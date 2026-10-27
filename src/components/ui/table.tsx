import * as React from "react"

import { cn } from "@/lib/utils"

/** Brandsync Table: bordered wrapper with semantic <table>, container header, hover rows. */
function Table({
  caption,
  className,
  children,
}: {
  /** Accessible name; the Table spec requires a caption. */
  caption: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="bs-table-wrapper" role="region" aria-label={caption}>
      <table className={cn("bs-table", className)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

function TableRow({
  interactive,
  className,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      data-interactive={interactive ? "" : undefined}
      className={className}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"th">) {
  return <th scope="col" className={className} {...props} />
}

function TableCell({
  numeric,
  right,
  className,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean; right?: boolean }) {
  return (
    <td
      className={cn(numeric && "bs-cell-num", right && "bs-cell-right", className)}
      {...props}
    />
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="bs-empty">{children}</p>
}

export { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, EmptyState }
