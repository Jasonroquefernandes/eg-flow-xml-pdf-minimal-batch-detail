"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Buildings,
  ChatText,
  Envelope,
  Files,
  Mailbox,
  Warning,
  CheckCircle,
  type Icon,
} from "@phosphor-icons/react";

import { BsInput } from "@brandsync/react";

import { ActivityChart, Legend, RankedBars } from "@/components/dashboard-charts";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CellActions, CellStack, DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/table";
import { DateRangeMenu } from "@/components/ui/date-range-menu";
import { DEFAULT_RANGE, OUTCOME_COLOR, bucketInvoicesByDay, chartWindow, createdWithin, invoiceRows, rangePhrase, relativeTime, topInvoiceFailureReasons, type Outcome } from "@/lib/dashboard";
import { compareValues, nextSort, type SortState } from "@/lib/sort";
import { setCurrentOrgId } from "@/lib/store";
import { useAllBatches, useOrganizations, useResolutions } from "@/lib/use-store";
import type { DateRange } from "@/lib/dashboard";
import type { Organization } from "@/lib/types";

const DISPATCH: Record<NonNullable<Organization["mainDispatch"]>, { label: string; icon: Icon }> = {
  email: { label: "Email", icon: Envelope },
  postal: { label: "Postal", icon: Mailbox },
  sms: { label: "SMS", icon: ChatText },
};

type OrgRow = {
  org: Organization;
  active: boolean;
  invoices: number;
  failed: number;
  review: number;
  successRate: number | null;
  lastActivity: string | null;
};

function KpiTile({
  label,
  value,
  detail,
  icon: TileIcon,
  tone = "",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: Icon;
  tone?: string;
}) {
  return (
    <div className="bs-card bs-card--sm">
      <div className="bs-card-body flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`bs-stat-icon shrink-0 ${tone}`}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            aria-hidden="true"
          >
            <TileIcon size={14} style={{ width: 14, height: 14 }} />
          </span>
          <p className="bs-caption">{label}</p>
        </div>
        <p className="bs-stat-value">{value}</p>
        <p className="bs-caption">{detail}</p>
      </div>
    </div>
  );
}

export function SuperAdminDashboard() {
  const router = useRouter();
  const allOrgs = useOrganizations();
  const allBatches = useAllBatches();
  const resolutions = useResolutions();
  // The overview covers every organization until one is picked from the dropdown.
  const [orgFilter, setOrgFilter] = useState("all");
  const orgs = useMemo(() => (orgFilter === "all" ? allOrgs : allOrgs.filter((o) => o.id === orgFilter)), [allOrgs, orgFilter]);
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const now = useMemo(() => new Date(), []);
  const batches = useMemo(
    () => createdWithin(orgFilter === "all" ? allBatches : allBatches.filter((b) => b.organizationId === orgFilter), range, now),
    [allBatches, orgFilter, range, now],
  );
  const orgOptions = [{ label: "All organizations", value: "all" }, ...allOrgs.map((o) => ({ label: o.name, value: o.id }))];
  // No sort key means the default order: most failures first.
  const [sort, setSort] = useState<SortState>({ key: "", direction: "asc" });

  const invoices = useMemo(() => invoiceRows(batches, resolutions), [batches, resolutions]);

  const view = useMemo(() => {
    const rows: OrgRow[] = orgs.map((org) => {
      const own = invoices.filter((row) => row.batch.organizationId === org.id);
      const completed = own.filter((row) => row.outcome === "completed").length;
      const failed = own.filter((row) => row.stage === "failed").length;
      const finished = completed + failed;
      return {
        org,
        active: org.active !== false,
        invoices: own.length,
        failed,
        review: own.filter((row) => row.stage === "review").length,
        successRate: finished ? Math.round((completed / finished) * 100) : null,
        lastActivity: own.reduce<string | null>((max, row) => (max === null || row.batch.updatedAt > max ? row.batch.updatedAt : max), null),
      };
    });
    // Orgs with the most failures first, so problems surface at the top.
    rows.sort((a, b) => b.failed - a.failed || b.review - a.review || a.org.name.localeCompare(b.org.name));

    const counts: Record<Outcome, number> = { completed: 0, failed: 0, review: 0, inProgress: 0 };
    for (const row of invoices) counts[row.outcome] += 1;
    const finished = counts.completed + counts.failed;

    const nameOf = new Map(orgs.map((o) => [o.id, o.name]));
    const invoiceShare = [...rows]
      .filter((r) => r.invoices > 0)
      .sort((a, b) => b.invoices - a.invoices)
      .map((r) => ({ label: r.org.name, count: r.invoices }));

    return {
      rows,
      counts,
      activeOrgs: rows.filter((r) => r.active).length,
      invoices: rows.reduce((sum, r) => sum + r.invoices, 0),
      successRate: finished ? Math.round((counts.completed / finished) * 100) : null,
      attention: counts.failed + counts.review,
      buckets: (() => { const window = chartWindow(range, batches, now); return bucketInvoicesByDay(invoices, window.days, window.end); })(),
      invoiceShare,
      reasons: topInvoiceFailureReasons(invoices, 5),
      nameOf,
    };
  }, [orgs, invoices, batches, now, range]);

  const open = (org: Organization) => {
    setCurrentOrgId(org.id);
    router.push("/batches");
  };

  const sortedRows = useMemo(() => {
    if (!sort.key) return view.rows;
    const value = (r: OrgRow): string | number => {
      switch (sort.key) {
        case "status": return r.active ? 0 : 1;
        case "dispatch": return r.org.mainDispatch ?? "email";
        case "invoices": return r.invoices;
        case "success": return r.successRate ?? -1;
        case "last": return r.lastActivity ?? "";
        default: return r.org.name;
      }
    };
    return [...view.rows].sort((a, b) => (sort.direction === "asc" ? 1 : -1) * compareValues(value(a), value(b)));
  }, [view.rows, sort]);

  const columns: DataTableColumn<OrgRow>[] = [
    {
      key: "org",
      sortable: true,
      header: "Organization",
      cell: ({ org }) => <CellStack primary={org.name} secondary={org.id} strong />,
    },
    {
      key: "status",
      sortable: true,
      header: "Status",
      cell: ({ active }) =>
        active ? <Chip variant="success">Active</Chip> : <Chip variant="neutral">Deactive</Chip>,
    },
    {
      key: "dispatch",
      sortable: true,
      header: "Main dispatch",
      cell: ({ org }) => {
        const { label, icon: DispatchIcon } = DISPATCH[org.mainDispatch ?? "email"];
        return (
          <span className="inline-flex items-center gap-2">
            <DispatchIcon size={16} aria-hidden="true" className="text-[var(--bs-text-secondary)]" />
            {label}
          </span>
        );
      },
    },
    { key: "invoices", sortable: true, header: "Files", cell: (r) => <CellStack primary={r.invoices.toLocaleString()} /> },
    {
      key: "success",
      sortable: true,
      header: "Success rate",
      cell: (r) => <CellStack primary={r.successRate === null ? "–" : `${r.successRate}%`} />,
    },
    {
      key: "attention",
      header: "Needs attention",
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          {r.failed > 0 && <Chip variant="error">{r.failed} failed</Chip>}
          {r.review > 0 && <Chip variant="warning">{r.review} review</Chip>}
          {r.failed === 0 && r.review === 0 && <span className="bs-caption">All clear</span>}
        </span>
      ),
    },
    {
      key: "last",
      sortable: true,
      header: "Last activity",
      cell: (r) => <CellStack nowrap primary={r.lastActivity ? relativeTime(r.lastActivity, now) : "–"} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: ({ org }) => (
        <CellActions>
          <Tooltip label="Open batches">
            <button
              type="button"
              aria-label={`Open batches for ${org.name}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
              onClick={() => open(org)}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </Tooltip>
        </CellActions>
      ),
    },
  ];

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width)] flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="bs-h1">Platform overview</h1>
            <p className="bs-body-sm bs-text-secondary">
              {orgFilter === "all" ? "Health and activity across every organization." : `Health and activity for ${orgs[0]?.name ?? "this organization"}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BsInput
              type="select"
              aria-label="Organization"
              value={orgFilter}
              options={orgOptions}
              style={{
                width: `calc(${(orgOptions.find((o) => o.value === orgFilter)?.label.length ?? 0) * 0.46}em + 3.5rem)`,
                "--bs-input-height": "var(--bs-spacing-500)",
                fontSize: "var(--bs-font-size-sm)",
              } as React.CSSProperties}
              onBsChange={(event) => setOrgFilter(event.detail as string)}
            />
            <DateRangeMenu range={range} onChange={setRange} />
          </div>
        </div>

        <section aria-label="Platform summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            label="Organizations"
            value={orgs.length}
            detail={`${view.activeOrgs} active, ${orgs.length - view.activeOrgs} deactive`}
            icon={Buildings}
          />
          <KpiTile
            label="Total files"
            value={view.invoices.toLocaleString()}
            detail={`In ${batches.length.toLocaleString()} ${batches.length === 1 ? "batch" : "batches"}`}
            icon={Files}
          />
          <KpiTile
            label="Dispatched"
            value={view.successRate === null ? "–" : `${view.successRate}%`}
            detail={`${view.counts.completed} dispatched, ${view.counts.failed} failed (finished files only)`}
            icon={CheckCircle}
            tone="bs-stat-icon--success"
          />
          <KpiTile
            label="Needs attention"
            value={view.attention}
            detail={`${view.counts.failed} failed, ${view.counts.review} awaiting review`}
            icon={Warning}
            tone={view.attention ? "bs-stat-icon--error" : ""}
          />
        </section>

        <section aria-label="Organization health" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="bs-h3">Organizations</h2>
              <p className="bs-body-sm text-[var(--bs-text-muted)]">Sorted by failures, so the ones that need help come first</p>
            </div>
            <Link href="/organizations" className="bs-link bs-body-sm inline-flex items-center gap-1">
              Manage organizations
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        <DataTable
          caption="Organization health"
          columns={columns}
          rows={sortedRows}
          sort={sort}
          onSortChange={(key) => setSort((current) => nextSort(current, key))}
          getRowId={(r) => r.org.id}
          getRowLabel={(r) => r.org.name}
          emptyMessage="No organizations yet."
        />
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>File activity</CardTitle>
              <CardDescription>{`Files created per day across ${orgFilter === "all" ? "all organizations" : "this organization"} · ${rangePhrase(range)}`}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <ActivityChart buckets={view.buckets} />
                <Legend />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>File volume by organization</CardTitle>
              <CardDescription>Who sends the most files</CardDescription>
            </CardHeader>
            <CardContent>
              {view.invoiceShare.length ? (
                <RankedBars rows={view.invoiceShare} color="var(--bs-color-primary-default)" />
              ) : (
                <EmptyState>No files yet.</EmptyState>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top failure reasons</CardTitle>
              <CardDescription>Across all organizations</CardDescription>
            </CardHeader>
            <CardContent>
              {view.reasons.length ? (
                <RankedBars rows={view.reasons} color={OUTCOME_COLOR.failed} />
              ) : (
                <EmptyState>No failures recorded.</EmptyState>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
