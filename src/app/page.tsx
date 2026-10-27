"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Warning as AlertTriangle,
  CheckCircle as CheckCircle2,
  Eye,
  PaperPlaneTilt as Send,
  type Icon,
} from "@phosphor-icons/react";

import { InvoiceStageChip } from "@/components/batch-badges";
import {
  ActivityChart,
  Legend,
  RankedBars,
  Sparkline,
} from "@/components/dashboard-charts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeMenu } from "@/components/ui/date-range-menu";
import { List } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/table";
import { UploadBatchDialog } from "@/components/upload-batch-dialog";
import {
  DEFAULT_RANGE,
  OUTCOME_COLOR,
  bucketInvoicesByDay,
  chartWindow,
  createdWithin,
  invoiceRows,
  rangePhrase,
  relativeTime,
  topInvoiceFailureReasons,
  type DateRange,
  type InvoiceRow,
  type InvoiceStage,
  type Outcome,
} from "@/lib/dashboard";
import { useCurrentOrgId, useOrgBatches, useOrganizations, useResolutions, useRole } from "@/lib/use-store";
import { SuperAdminDashboard } from "@/components/super-admin-dashboard";

type Stat = {
  label: string;
  stage: InvoiceStage;
  /** Batch list tab this tile links to. */
  href: string;
  icon: Icon;
  tone: string;
  color: string;
};

const STATS: Stat[] = [
  { label: "Ready for dispatch", stage: "ready", href: "/batches?state=approved", icon: Send, tone: "", color: "var(--bs-color-primary-default)" },
  { label: "Awaiting review", stage: "review", href: "/batches?state=review", icon: Eye, tone: "bs-stat-icon--warning", color: OUTCOME_COLOR.review },
  { label: "Failed", stage: "failed", href: "/batches?state=failed", icon: AlertTriangle, tone: "bs-stat-icon--error", color: OUTCOME_COLOR.failed },
  { label: "Dispatched", stage: "dispatched", href: "/batches?state=completed", icon: CheckCircle2, tone: "bs-stat-icon--success", color: OUTCOME_COLOR.completed },
];

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${n === 1 ? word : word === "batch" ? "batches" : `${word}s`}`;
}

/** Detail line for a summary tile, derived from the invoices at that stage. */
function statDetail(stage: InvoiceStage, inStage: InvoiceRow[], successRate: number | null, now: Date): string {
  if (inStage.length === 0) {
    return stage === "dispatched" ? "Nothing delivered yet" : stage === "ready" ? "Nothing waiting" : "All clear";
  }
  const batches = new Set(inStage.map((row) => row.batch.id)).size;
  if (stage === "review") {
    const oldest = inStage.reduce((min, row) => (row.batch.updatedAt < min ? row.batch.updatedAt : min), inStage[0].batch.updatedAt);
    return `${plural(batches, "batch")} · oldest ${relativeTime(oldest, now)}`;
  }
  if (stage === "dispatched" && successRate !== null) return `${plural(batches, "batch")} · ${successRate}% success`;
  return `In ${plural(batches, "batch")}`;
}

function ChartCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ViewAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="bs-link bs-body-sm inline-flex items-center gap-1">
      {children}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

function attentionSummary(row: InvoiceRow): string {
  return row.stage === "failed" ? (row.invoice.reason ?? "Rendering failed") : "Waiting for approval before dispatch";
}

export default function DashboardPage() {
  const role = useRole();
  return role === "super_admin" ? <SuperAdminDashboard /> : <OrgDashboard />;
}

function OrgDashboard() {
  const currentOrgId = useCurrentOrgId();
  const organizations = useOrganizations();
  const allBatches = useOrgBatches(currentOrgId);
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const orgName = organizations.find((o) => o.id === currentOrgId)?.name;

  const now = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const resolutions = useResolutions();
  const batches = useMemo(() => createdWithin(allBatches, range, now), [allBatches, range, now]);
  const rows = useMemo(() => invoiceRows(batches, resolutions), [batches, resolutions]);

  const view = useMemo(() => {
    const window = chartWindow(range, batches, now);
    const buckets = bucketInvoicesByDay(rows, window.days, window.end);
    const last7 = bucketInvoicesByDay(rows, 7, now);

    const inStage = (stage: InvoiceStage) => rows.filter((row) => row.stage === stage);
    const counts: Record<Outcome, number> = { completed: 0, failed: 0, review: 0, inProgress: 0 };
    for (const row of rows) counts[row.outcome] += 1;

    // 7-day trend of invoices *created* per day that are currently at the given stage.
    const trendFor = (stage: InvoiceStage) => last7.map((day) => day.stages[stage]);

    // Failed invoices first, then the ones waiting on approval; newest batch activity first within each.
    const attention = rows
      .filter((row) => row.stage === "failed" || row.stage === "review")
      .sort((a, b) => (a.stage === b.stage ? b.batch.updatedAt.localeCompare(a.batch.updatedAt) : a.stage === "failed" ? -1 : 1));

    const recent = [...rows].sort((a, b) => b.batch.updatedAt.localeCompare(a.batch.updatedAt)).slice(0, 6);
    const finished = counts.completed + counts.failed;
    const successRate = finished ? Math.round((counts.completed / finished) * 100) : null;

    return {
      buckets,
      counts,
      attention,
      recent,
      successRate,
      reasons: topInvoiceFailureReasons(rows, 5),
      inStage,
      trendFor,
    };
  }, [rows, batches, range, now]);

  const hasData = allBatches.length > 0;

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width)] flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="bs-h1" suppressHydrationWarning>
              {greeting}, jfern
            </h1>
            <p className="bs-body-sm bs-text-secondary">Your files at a glance.</p>
          </div>
          {hasData && <DateRangeMenu range={range} onChange={setRange} />}
        </div>

        {!hasData ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="bs-stat-icon" aria-hidden="true">
                <Send />
              </span>
              <h2 className="bs-h3">No batches yet</h2>
              <p className="bs-body-sm max-w-md text-[var(--bs-text-muted)]">
                Upload an XML batch to start rendering invoices. Progress, failures and delivery
                trends will show up here.
              </p>
              <UploadBatchDialog organizationId={currentOrgId} />
            </CardContent>
          </Card>
        ) : (
          <>
            <section aria-label="Invoice summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map(({ label, stage, href, icon: Icon, tone, color }) => {
                const value = view.inStage(stage).length;
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-label={`${label}: ${value}`}
                    className="bs-card bs-card--sm"
                  >
                    <div className="bs-card-body flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`bs-stat-icon shrink-0 ${tone}`}
                          style={{ width: 28, height: 28, borderRadius: 6 }}
                          aria-hidden="true"
                        >
                          <Icon size={14} style={{ width: 14, height: 14 }} />
                        </span>
                        <p className="bs-caption">{label}</p>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <p className="bs-stat-value">{value}</p>
                        <Sparkline values={view.trendFor(stage)} color={color} />
                      </div>
                      <p className="bs-caption">{statDetail(stage, view.inStage(stage), view.successRate, now)}</p>
                    </div>
                  </Link>
                );
              })}
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard
                className="lg:col-span-3"
                title="File activity"
                description={`Files created per day · ${rows.length.toLocaleString()} ${rangePhrase(range)}`}
              >
                <div className="flex flex-col gap-3">
                  <ActivityChart buckets={view.buckets} />
                  <Legend />
                </div>
              </ChartCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card flush className="lg:col-span-2">
                <CardHeader bordered>
                  <CardTitle>Needs attention</CardTitle>
                  <CardDescription>
                    {view.attention.length
                      ? `${view.attention.length.toLocaleString()} ${view.attention.length === 1 ? "invoice needs" : "invoices need"} action, failures first`
                      : "Nothing is waiting on you"}
                  </CardDescription>
                  {view.attention.length > 0 && (
                    <CardAction>
                      <ViewAll href="/batches?state=failed">View failed batches</ViewAll>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent flush>
                  {view.attention.length === 0 ? (
                    <div className="flex items-center gap-3 px-[var(--bs-spacing-300)] py-6">
                      <CheckCircle2 size={24} className="text-[var(--bs-icon-success)]" aria-hidden="true" />
                      <p className="bs-body-sm">No failed or pending-review invoices. You&apos;re all caught up.</p>
                    </div>
                  ) : (
                    <List>
                      {view.attention.slice(0, 5).map((row) => (
                        <li key={`${row.batch.id}-${row.invoice.id}`}>
                          <Link href={`/batches/${row.batch.id}`} className="bs-list-item">
                            <InvoiceStageChip stage={row.stage} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="bs-body-sm font-semibold">{row.invoice.number}</span>
                              <span className="bs-caption truncate">{attentionSummary(row)} · {row.batch.id}</span>
                            </span>
                            <span className="bs-caption hidden shrink-0 sm:inline">
                              {relativeTime(row.batch.updatedAt, now)}
                            </span>
                            <ArrowRight size={16} className="shrink-0 text-[var(--bs-icon-muted)]" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>

              <ChartCard title="Top failure reasons" description="Across all failed invoices">
                {view.reasons.length ? (
                  <RankedBars rows={view.reasons} color={OUTCOME_COLOR.failed} />
                ) : (
                  <EmptyState>No failures recorded.</EmptyState>
                )}
              </ChartCard>
            </div>

            <Card flush>
              <CardHeader bordered>
                <CardTitle>Recent files</CardTitle>
                <CardAction>
                  <ViewAll href="/batches">View all</ViewAll>
                </CardAction>
              </CardHeader>
              <CardContent flush>
                <List>
                  {view.recent.map((row) => (
                    <li key={`${row.batch.id}-${row.invoice.id}`}>
                      <Link href={`/batches/${row.batch.id}`} className="bs-list-item">
                        <span className="bs-body-sm min-w-0 flex-1 truncate font-semibold">{row.invoice.number}</span>
                        <span className="bs-caption hidden w-40 truncate sm:inline">{row.invoice.customer}</span>
                        <span className="bs-caption bs-mono hidden w-24 md:inline">{row.batch.id}</span>
                        <span className="flex w-36 shrink-0 justify-start"><InvoiceStageChip stage={row.stage} /></span>
                        <span className="bs-caption w-24 shrink-0 text-right">
                          {relativeTime(row.batch.updatedAt, now)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </List>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
