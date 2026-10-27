import * as React from "react"

import { cn } from "@/lib/utils"

/** Brandsync List (semantic ul/li). Use `ListItem` as a Link via `render` by passing className for interactive rows. */
function List({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul role="list" className={cn("bs-list", className)} {...props} />
}

function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("bs-list-item", className)} {...props} />
}

export { List, ListItem }
