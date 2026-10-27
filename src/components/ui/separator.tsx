import { cn } from "@/lib/utils"

function Separator({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical"
  className?: string
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn("bs-divider", orientation === "vertical" && "bs-divider--vertical", className)}
    />
  )
}

export { Separator }
