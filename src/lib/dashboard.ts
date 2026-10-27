import { getFailureItems } from "@/lib/store";
import { getBatchInvoices, type Invoice } from "@/lib/invoices";
import type { Batch, BatchState, Resolution } from "@/lib/types";

/** Outcome groups used by every dashboard chart so one colour always means one thing. */
export type Outcome = "completed" | "failed" | "review" | "inProgress";

export const OUTCOMES: Outcome[] = [
  "completed",
  "review",
  "failed",
];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  completed: "Dispatched",
  inProgress: "In progress",
  review: "Awaiting review",
  failed: "Failed",
};

export const OUTCOME_COLOR: Record<Outcome, string> = {
  completed: "var(--bs-color-success-default)",
  inProgress: "var(--bs-color-info-default)",
  review: "var(--bs-color-warning-default)",
  failed: "var(--bs-color-error-default)",
};

export function outcomeOf(state: BatchState): Outcome {
  if (state === "completed" || state === "resolved") return "completed";
  if (state === "failed" || state === "partial") return "failed";
  if (state === "review") return "review";
  return "inProgress";
}

/** Months are keyed "YYYY-MM" in local time. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });
}

/** Last day of the given month, as a Date. */
export function monthEnd(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0);
}

export type DayBucket = {
  key: string;
  label: string;
  counts: Record<Outcome, number>;
  states: Partial<Record<BatchState, number>>;
  total: number;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Batches created per day (local time) for the last `days` days, oldest first. */
export function bucketByDay(
  batches: Batch[],
  days: number,
  now: Date,
): DayBucket[] {
  const buckets: DayBucket[] = [];
  const index = new Map<string, DayBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const bucket: DayBucket = {
      key: dayKey(d),
      label: d.toLocaleDateString([], { day: "numeric", month: "short" }),
      counts: { completed: 0, failed: 0, review: 0, inProgress: 0 },
      states: {},
      total: 0,
    };
    buckets.push(bucket);
    index.set(bucket.key, bucket);
  }
  for (const b of batches) {
    const bucket = index.get(dayKey(new Date(b.createdAt)));
    if (!bucket) continue;
    bucket.counts[outcomeOf(b.state)] += 1;
    bucket.states[b.state] = (bucket.states[b.state] ?? 0) + 1;
    bucket.total += 1;
  }
  return buckets;
}

export type CountRow = { label: string; count: number };

/** Most common failure messages across failed batches. */
export function topFailureReasons(batches: Batch[], limit: number): CountRow[] {
  const counts = new Map<string, number>();
  for (const b of batches) {
    if (b.state !== "failed" && b.state !== "partial") continue;
    for (const item of getFailureItems(b)) {
      counts.set(item.message, (counts.get(item.message) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function relativeTime(iso: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Time range shown on a dashboard: a trailing number of days (today counts as 1), everything, or explicit dates. */
export type DateRange =
  | { kind: "days"; days: number }
  | { kind: "all" }
  | { kind: "custom"; from: string; to: string }; // inclusive, "YYYY-MM-DD"

export const PRESET_RANGES = [
  { days: 1, label: "Today" },
  { days: 3, label: "Last 3 days" },
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
] as const;

export const DEFAULT_RANGE: DateRange = { kind: "days", days: 30 };

/** The chart never shows more than this many days, even for "All time" or a long custom range. */
const MAX_CHART_DAYS = 90;

function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDay(value: string): string {
  return parseDay(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function rangeLabel(range: DateRange): string {
  if (range.kind === "all") return "All time";
  if (range.kind === "custom") return `${formatDay(range.from)} – ${formatDay(range.to)}`;
  return PRESET_RANGES.find((preset) => preset.days === range.days)?.label ?? `Last ${range.days} days`;
}

/** Wording for chart descriptions, e.g. "in the last 7 days". */
export function rangePhrase(range: DateRange): string {
  if (range.kind === "all") return "across all time";
  if (range.kind === "custom") return `from ${formatDay(range.from)} to ${formatDay(range.to)}`;
  return range.days === 1 ? "today" : `in the last ${range.days} days`;
}

/** Batches created inside the range, by local calendar day. */
export function createdWithin(batches: Batch[], range: DateRange, now: Date): Batch[] {
  if (range.kind === "all") return batches;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = range.kind === "days" ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - (range.days - 1)) : parseDay(range.from);
  const end = range.kind === "days" ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) : new Date(parseDay(range.to).getTime() + 86_400_000);
  return batches.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

/** Last day and day count for the activity chart. "All time" starts at the oldest batch. */
export function chartWindow(range: DateRange, batches: Batch[], now: Date): { end: Date; days: number } {
  const dayMs = 86_400_000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range.kind === "days") return { end: today, days: range.days };
  if (range.kind === "custom") {
    const from = parseDay(range.from);
    const to = parseDay(range.to);
    return { end: to, days: Math.min(MAX_CHART_DAYS, Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1)) };
  }
  const oldest = batches.reduce((min, b) => Math.min(min, new Date(b.createdAt).getTime()), today.getTime());
  const oldestDay = new Date(new Date(oldest).getFullYear(), new Date(oldest).getMonth(), new Date(oldest).getDate());
  return { end: today, days: Math.min(MAX_CHART_DAYS, Math.max(1, Math.round((today.getTime() - oldestDay.getTime()) / dayMs) + 1)) };
}

// --- invoice level -------------------------------------------------------
// The dashboards count invoices, not batches. An invoice's stage comes from its own status plus where its batch is.

export type InvoiceStage = "ready" | "review" | "failed" | "dispatched" | "inProgress";

export type InvoiceRow = { invoice: Invoice; batch: Batch; stage: InvoiceStage; outcome: Outcome };

const STAGE_OUTCOME: Record<InvoiceStage, Outcome> = {
  dispatched: "completed",
  failed: "failed",
  review: "review",
  ready: "inProgress",
  inProgress: "inProgress",
};

function stageOf(batch: Batch, invoice: Invoice, handled: Set<string>): InvoiceStage {
  if (invoice.status === "failed") {
    // A resolved or dismissed failure is finished, so it no longer counts as failed.
    const done = handled.has(`${batch.id}|${invoice.number}`) || invoice.number in (batch.dismissedInvoices ?? {});
    return done ? "dispatched" : "failed";
  }
  if (invoice.status === "rendering") return "inProgress";
  if (batch.state === "completed" || batch.state === "resolved" || batch.partiallyDispatched) return "dispatched";
  if (batch.state === "review") return "review";
  if (batch.state === "approved") return "ready";
  if (batch.state === "failed" || batch.state === "partial") {
    // Rendered files in a failed batch wait for approval, or for dispatch once they have been approved.
    return batch.remainingApproved || !batch.reviewRequired ? "ready" : "review";
  }
  return "inProgress";
}

/** Every invoice in the given batches, with the stage it is at. */
export function invoiceRows(batches: Batch[], resolutions: Resolution[]): InvoiceRow[] {
  const handled = new Set(resolutions.map((r) => `${r.failedBatchId}|${r.failedInvoice}`));
  return batches.flatMap((batch) =>
    getBatchInvoices(batch).map((invoice) => {
      const stage = stageOf(batch, invoice, handled);
      return { invoice, batch, stage, outcome: STAGE_OUTCOME[stage] };
    }),
  );
}

export type InvoiceDayBucket = DayBucket & { stages: Record<InvoiceStage, number> };

/** Invoices created per day (local time, by the day their batch arrived) for `days` days ending on `end`, oldest first. */
export function bucketInvoicesByDay(rows: InvoiceRow[], days: number, end: Date): InvoiceDayBucket[] {
  const buckets: InvoiceDayBucket[] = [];
  const index = new Map<string, InvoiceDayBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const bucket: InvoiceDayBucket = {
      key: dayKey(d),
      label: d.toLocaleDateString([], { day: "numeric", month: "short" }),
      counts: { completed: 0, failed: 0, review: 0, inProgress: 0 },
      states: {},
      stages: { ready: 0, review: 0, failed: 0, dispatched: 0, inProgress: 0 },
      total: 0,
    };
    buckets.push(bucket);
    index.set(bucket.key, bucket);
  }
  for (const row of rows) {
    const bucket = index.get(dayKey(new Date(row.batch.createdAt)));
    if (!bucket) continue;
    bucket.counts[row.outcome] += 1;
    bucket.stages[row.stage] += 1;
    bucket.total += 1;
  }
  return buckets;
}

/** Most common reasons among invoices that are still failed. */
export function topInvoiceFailureReasons(rows: InvoiceRow[], limit: number): CountRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.stage !== "failed") continue;
    const reason = row.invoice.reason ?? "Rendering failed";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
