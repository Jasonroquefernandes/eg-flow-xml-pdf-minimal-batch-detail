import { cn } from "@/lib/utils"

function Progress({
  value,
  label,
  size = "lg",
  className,
}: {
  /** 0–100; omit for an indeterminate bar. */
  value?: number
  label: string
  size?: "sm" | "lg"
  className?: string
}) {
  const indeterminate = value === undefined
  const complete = value === 100
  return (
    <div className={cn("bs-progress-wrap", className)}>
      <div className="bs-progress-label">
        <span>{label}</span>
        {!indeterminate && <span className="bs-mono">{value}%</span>}
      </div>
      <div
        className={cn("bs-progress-track", size === "sm" && "bs-progress-track--sm")}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : value}
      >
        <div
          className={cn(
            "bs-progress-fill",
            complete && "bs-progress-fill--success",
            indeterminate && "bs-progress-fill--indeterminate"
          )}
          style={indeterminate ? undefined : { width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export { Progress }
