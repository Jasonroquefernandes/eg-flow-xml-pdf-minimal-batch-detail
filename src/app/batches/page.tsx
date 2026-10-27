"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BsInput, BsTab, BsTabs } from "@brandsync/react";
import {
  ArrowClockwise,
  Trash,
  CheckCircle,
  Eye,
  FolderSimple as Folder,
  PaperPlaneTilt as Send,
  Play,
  SpinnerGap as Loader2,
  Warning as TriangleAlert,
  type Icon,
} from "@phosphor-icons/react";

import { SOURCE_ICON, STATE_BADGE_VARIANT, STATE_ICON, batchStatus } from "@/components/batch-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/checkbox";
import { CellActions, CellIcon, CellStack, DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Tooltip } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { UploadBatchDialog } from "@/components/upload-batch-dialog";
import { BATCH_STATE_LABELS, SOURCE_LABELS, deleteBatch, dispatchBatch, getResolutionCandidates, setCurrentOrgId, startRendering } from "@/lib/store";
import { getBatchInvoices } from "@/lib/invoices";
import { relativeTime } from "@/lib/dashboard";
import { compareValues, nextSort, type SortState } from "@/lib/sort";
import { useAllBatches, useCurrentOrgId, useHydrated, useOrgBatches, useOrganizations, useResolutions, useRole } from "@/lib/use-store";
import type { Batch, BatchSource, BatchState } from "@/lib/types";

const ACTIVE_STATE_FILTERS: (BatchState | "all")[] = [
  "all",
  "pending",
  "rendering",
  "review",
  "approved",
  "dispatching",
];

const SOURCE_FILTERS: (BatchSource | "all")[] = ["all", "manual", "zenith", "smtp"];
const STATE_OPTIONS = ACTIVE_STATE_FILTERS.map((state) => ({
  label: state === "all" ? "All" : BATCH_STATE_LABELS[state],
  value: state,
}));
const ALL_TAB_STATE_OPTIONS = [...STATE_OPTIONS, { label: BATCH_STATE_LABELS.failed, value: "failed" }];
const SOURCE_OPTIONS = SOURCE_FILTERS.map((source) => ({
  label: source === "all" ? "All" : SOURCE_LABELS[source],
  value: source,
  icon: source === "all" ? undefined : SOURCE_ICON[source],
}));
const PAGE_SIZE = 20;

const NO_ORG = "__none__";

/** Native selects size to their longest option; fit the width to the selected label instead. */
function fitToSelected(options: { label: string; value: string }[], value: string) {
  const label = options.find((option) => option.value === value)?.label ?? "";
  return { width: `calc(${label.length * 0.46}em + 3.5rem)` };
}
type Tab = "all" | "active" | "failed" | "history";

/** Only ready batches can be sent from the table; failed ones are handled on their own page. */
function canDispatch(batch: Batch): boolean {
  return batch.state === "approved";
}

const STATE_ACTION_LABELS: Record<Exclude<BatchState, "rendering">, string> = {
  pending: "Start render",
  review: "Review",
  approved: "Dispatch",
  dispatching: "View progress",
  completed: "View batch",
  partial: "Resolve invoices",
  failed: "Review errors",
  resolved: "View record",
};
const STATE_ACTION_ICONS: Record<Exclude<BatchState, "rendering">, Icon> = {
  pending: Play,
  review: Eye,
  approved: Send,
  dispatching: ArrowClockwise,
  completed: CheckCircle,
  partial: TriangleAlert,
  failed: Eye,
  resolved: CheckCircle,
};

function BatchesPageInner() {
  const router = useRouter();
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const currentOrgId = useCurrentOrgId();
  const role = useRole();
  const orgs = useOrganizations();
  const org = orgs.find((o) => o.id === currentOrgId);
  const [noOrg, setNoOrg] = useState(false);
  const orgBatches = useOrgBatches(currentOrgId);
  const everyBatch = useAllBatches();
  const resolutions = useResolutions();
  const failedInvoicesOf = useCallback((b: Batch) => {
    const handled = new Set([
      ...resolutions.filter((r) => r.failedBatchId === b.id).map((r) => r.failedInvoice),
      ...Object.keys(b.dismissedInvoices ?? {}),
    ]);
    const failed = getBatchInvoices(b).filter((invoice) => invoice.status === "failed");
    return { open: failed.filter((i) => !handled.has(i.number)).length, resolved: failed.filter((i) => handled.has(i.number)).length };
  }, [resolutions]);
  // Only super admins can clear the organization; everyone else stays scoped to theirs.
  const showAll = role === "super_admin" && noOrg;
  const allBatches = showAll ? everyBatch : orgBatches;

  const initialState = searchParams.get("state") as BatchState | null;
  const initialTab: Tab =
    initialState === "completed" || initialState === "resolved"
      ? "history"
      : initialState === "failed"
        ? "failed"
        : "active";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<BatchState | "all">(
    initialState && initialState !== "completed" && initialState !== "failed" && initialState !== "resolved"
      ? initialState
      : "all"
  );
  const [sourceFilter, setSourceFilter] = useState<BatchSource | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<Batch | null>(null);
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);

  const closeDispatch = () => {
    setDispatchTarget(null);
    setDispatchConfirmed(false);
  };

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulk, setBulk] = useState<"dispatch" | "delete" | null>(null);

  const filtered = useMemo(() => {
    return allBatches.filter((b) => {
      if (tab === "history" && b.state !== "completed" && b.state !== "resolved") return false;
      if (tab === "failed" && b.state !== "failed" && b.state !== "partial") return false;
      if (tab === "active" && ["completed", "resolved", "failed", "partial"].includes(b.state))
        return false;
      if ((tab === "active" || tab === "all") && stateFilter !== "all" && b.state !== stateFilter) return false;
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (dateFilter && new Date(b.createdAt).toLocaleDateString("en-CA") !== dateFilter) return false;
      if (search && !b.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allBatches, tab, stateFilter, sourceFilter, dateFilter, search]);

  const [sort, setSort] = useState<SortState>({ key: "uploaded", direction: "desc" });

  const sortedBatches = useMemo(() => {
    const value = (b: Batch): string | number => {
      switch (sort.key) {
        case "batchId": return b.id;
        case "source": return SOURCE_LABELS[b.source];
        case "invoices": return b.invoiceCount;
        case "failedInvoices": return failedInvoicesOf(b).open;
        case "state": return batchStatus(b).label;
        case "updated": return b.updatedAt;
        default: return b.createdAt;
      }
    };
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => direction * compareValues(value(a), value(b)) || b.createdAt.localeCompare(a.createdAt));
  }, [filtered, sort, failedInvoicesOf]);

  const failedCount = useMemo(
    () => allBatches.filter((b) => b.state === "failed" || b.state === "partial").length,
    [allBatches]
  );
  const activeCount = allBatches.filter((b) => !["completed", "resolved", "failed", "partial"].includes(b.state)).length;
  const dispatchedCount = allBatches.filter((b) => b.state === "completed" || b.state === "resolved").length;

  const pageCount = Math.max(1, Math.ceil(sortedBatches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = sortedBatches.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteBatch(deleteTarget.id);
    toast.success("Batch deleted", { description: `${deleteTarget.id} was removed.` });
    setDeleteTarget(null);
  };

  const confirmDispatch = () => {
    if (!dispatchTarget || !dispatchConfirmed) return;
    dispatchBatch(dispatchTarget.id);
    toast.success("Dispatch started", {
      description: `${dispatchTarget.id} is being sent to the customer.`,
    });
    closeDispatch();
  };

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    setStateFilter("all");
    setPage(0);
    setSelected(new Set());
  };

  // Only batches still matching the current filters count as selected.
  const selectedBatches = sortedBatches.filter((b) => selected.has(b.id));
  const bulkDispatchable = selectedBatches.filter(canDispatch);
  const bulkStartable = selectedBatches.filter((b) => b.state === "pending");
  const pageIds = pageItems.map((b) => b.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAllOnPage = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of pageIds) {
        if (allOnPageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const startSelected = () => {
    for (const b of bulkStartable) startRendering(b.id);
    toast.success("Rendering started", {
      description: `${bulkStartable.length} ${bulkStartable.length === 1 ? "batch is" : "batches are"} now rendering.`,
    });
    setSelected(new Set());
  };

  const confirmBulk = () => {
    if (bulk === "dispatch") {
      for (const b of bulkDispatchable) dispatchBatch(b.id);
      toast.success("Dispatch started", {
        description: `${bulkDispatchable.length} ${bulkDispatchable.length === 1 ? "batch is" : "batches are"} being sent.`,
      });
    } else if (bulk === "delete") {
      for (const b of selectedBatches) deleteBatch(b.id);
      toast.success("Batches deleted", {
        description: `${selectedBatches.length} ${selectedBatches.length === 1 ? "batch was" : "batches were"} removed.`,
      });
    }
    setBulk(null);
    setSelected(new Set());
  };

  const orgOptions = [
    { label: "All organizations", value: NO_ORG },
    ...orgs.map((o) => ({ label: o.name, value: o.id })),
  ];

  const columns: DataTableColumn<Batch>[] = [
    ...(showAll
      ? [
          {
            key: "organization",
            header: "Organization",
            cell: (batch: Batch) => (
              <CellStack primary={orgs.find((o) => o.id === batch.organizationId)?.name ?? batch.organizationId} />
            ),
          },
        ]
      : []),
    {
      key: "batchId",
      sortable: true,
      header: "Batch",
      cell: (batch) => (
        <CellIcon
          icon={<Folder size={20} aria-hidden="true" />}
          primary={batch.id}
        />
      ),
    },
    {
      key: "uploaded",
      sortable: true,
      header: "Uploaded",
      cell: (batch) => (
        <CellStack
          nowrap
          primary={new Date(batch.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        />
      ),
    },
    {
      key: "source",
      sortable: true,
      header: "Source",
      cell: (batch) => {
        const SourceIcon = SOURCE_ICON[batch.source];
        return <span className="inline-flex items-center gap-2"><SourceIcon size={16} aria-hidden="true" className="text-[var(--bs-text-secondary)]" />{SOURCE_LABELS[batch.source]}</span>;
      },
    },
    {
      key: "state",
      sortable: true,
      header: "Status",
      cell: (batch) => {
        const { label, variant, icon: StateIcon } = batchStatus(batch);
        return (
          <Chip variant={variant} className="inline-flex items-center gap-1.5">
            <StateIcon size={14} aria-hidden="true" />
            {label}
          </Chip>
        );
      },
    },
    {
      key: "invoices",
      sortable: true,
      header: "Items",
      cell: (batch) => (
        <CellStack primary={batch.invoiceCount} />
      ),
    },
    ...(tab === "active" || tab === "history"
      ? []
      : [
          {
            key: "failedInvoices",
            sortable: true,
            header: "Failed items",
            cell: (batch: Batch) => {
              return <CellStack primary={failedInvoicesOf(batch).open} />;
            },
          },
        ]),
    {
      key: "updated",
      sortable: true,
      header: "Last updated",
      cell: (batch) => (
        <CellStack
          nowrap
          primary={relativeTime(batch.updatedAt, new Date())}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "batch-actions-col",
      cell: (batch) => {
        const state = batch.state;
        return (
          <CellActions>
            <span className="inline-flex justify-end">
              {state === "pending" && (
                <Tooltip label="Start render">
                  <button
                    type="button"
                    aria-label={`Start rendering ${batch.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                    onClick={() => { startRendering(batch.id); toast.success("Rendering started", { description: `${batch.id} is now rendering.` }); }}
                  >
                    <Play size={20} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              {state === "rendering" && (
                <Tooltip label="View progress">
                  <button
                    type="button"
                    aria-label={`View progress of ${batch.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                    onClick={() => router.push(`/batches/${batch.id}?from=${tab}`)}
                  >
                    <Eye size={20} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              {state === "review" && (
                <Tooltip label="Review">
                  <button
                    type="button"
                    aria-label={`Review ${batch.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                    onClick={() => router.push(`/batches/${batch.id}?from=${tab}`)}
                  >
                    <Eye size={20} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              {(state === "failed" || state === "partial") && (
                <Tooltip label="View failed items">
                  <button
                    type="button"
                    aria-label={`View failed items in ${batch.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                    onClick={() => router.push(`/batches/${batch.id}?from=${tab}`)}
                  >
                    <Eye size={20} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              {(state === "completed" || state === "resolved") && (
                <Tooltip label="View details">
                  <button
                    type="button"
                    aria-label={`View details for ${batch.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                    onClick={() => router.push(`/batches/${batch.id}?from=${tab}`)}
                  >
                    <Eye size={20} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              {canDispatch(batch) && (
                <Tooltip label="Dispatch">
                  <button
                    type="button"
                    aria-label={`Dispatch ${batch.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                    onClick={() => setDispatchTarget(batch)}
                  >
                    <Send size={20} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
            </span>
            <Tooltip label="Delete">
              <button
                type="button"
                aria-label={`Delete ${batch.id}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                onClick={() => setDeleteTarget(batch)}
              >
                <Trash size={20} aria-hidden="true" />
              </button>
            </Tooltip>
          </CellActions>
        );
      },
    },
  ];

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width)] flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="bs-h1">Batches</h1>
          </div>
          <p className="bs-body-sm bs-text-secondary">Track every batch from upload to dispatch.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          {role === "super_admin" && (
            <BsInput
              type="select"
              aria-label="Organization"
              value={showAll ? NO_ORG : currentOrgId}
              options={orgOptions}
              style={{
                ...fitToSelected(orgOptions, showAll ? NO_ORG : currentOrgId),
                "--bs-input-height": "var(--bs-spacing-500)",
                fontSize: "var(--bs-font-size-sm)",
              } as React.CSSProperties}
              onBsChange={(event) => {
                const next = event.detail as string;
                if (next === NO_ORG) {
                  setNoOrg(true);
                } else {
                  setNoOrg(false);
                  setCurrentOrgId(next);
                }
                setPage(0);
              }}
            />
          )}
            {org && !showAll && <UploadBatchDialog organizationId={org.id} />}
          </div>
        </div>

        <section aria-label="Batch views">
          <BsTabs type="bs-tab">
            <BsTab selected={tab === "all"} onBsSelect={() => selectTab("all")}>
              All
              <span slot="badge" className="bs-badge bs-badge--tab">{allBatches.length}</span>
            </BsTab>
            <BsTab selected={tab === "active"} onBsSelect={() => selectTab("active")}>
              Active
              <span slot="badge" className="bs-badge bs-badge--tab">{activeCount}</span>
            </BsTab>
            <BsTab selected={tab === "failed"} onBsSelect={() => selectTab("failed")}>
              Failed
              <span slot="badge" className="bs-badge bs-badge--tab">{failedCount}</span>
            </BsTab>
            <BsTab selected={tab === "history"} onBsSelect={() => selectTab("history")}>
              Dispatched
              <span slot="badge" className="bs-badge bs-badge--tab">{dispatchedCount}</span>
            </BsTab>
          </BsTabs>
          <Separator />
        </section>

        <div className="flex flex-col gap-4">
        <div className="batch-filters">
          <BsInput
            type="search"
            aria-label="Search"
            value={search}
            placeholder="Search batch ID"
            onBsInput={(event) => {
              setSearch(event.detail);
              setPage(0);
            }}
          />

          <FilterMenu
            label="Source"
            value={sourceFilter}
            options={SOURCE_OPTIONS}
            onChange={(next) => {
              setSourceFilter(next);
              setPage(0);
            }}
          />


          {(tab === "active" || tab === "all") && (
            <FilterMenu
              label="State"
              value={stateFilter}
              options={(tab === "all" ? ALL_TAB_STATE_OPTIONS : STATE_OPTIONS) as { label: string; value: BatchState | "all" }[]}
              onChange={(next) => {
                setStateFilter(next);
                setPage(0);
              }}
            />
          )}

          <input
            type="date"
            aria-label="Uploaded date"
            className="bs-input batch-date-filter"
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value);
              setPage(0);
            }}
          />
        </div>

        <div role="tabpanel" aria-label="Batches" className="flex flex-col gap-4">
          {selectedBatches.length > 0 && (
            <div
              role="toolbar"
              aria-label="Bulk actions"
              className="flex flex-wrap items-center gap-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-selected)] px-4 py-2"
            >
              <p className="bs-body-sm font-semibold" aria-live="polite">
                {selectedBatches.length} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {bulkStartable.length > 0 && (
                  <Button variant="outline" size="sm" labelWidth={140} onClick={startSelected}>
                    <Play aria-hidden="true" />
                    Start render ({bulkStartable.length})
                  </Button>
                )}
                {bulkDispatchable.length > 0 && (
                  <Button variant="primary" size="sm" labelWidth={120} onClick={() => setBulk("dispatch")}>
                    <Send aria-hidden="true" />
                    Dispatch ({bulkDispatchable.length})
                  </Button>
                )}
                <Button variant="destructive-outline" size="sm" labelWidth={96} onClick={() => setBulk("delete")}>
                  <Trash aria-hidden="true" />
                  Delete
                </Button>
              </div>
              <button
                type="button"
                className="bs-link bs-body-sm ml-auto"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </button>
            </div>
          )}

          <DataTable
            caption="Batches"
            rows={pageItems}
            columns={columns}
            getRowId={(batch) => batch.id}
            getRowLabel={(batch) => `batch ${batch.id}`}
            sort={sort}
            onSortChange={(key) => {
              setSort((current) => nextSort(current, key));
              setPage(0);
            }}
            onRowClick={(batch) => router.push(`/batches/${batch.id}?from=${tab}`)}
            selection={{
              selected,
              onToggle: toggleOne,
              onToggleAll: toggleAllOnPage,
              selectableIds: pageIds,
            }}
            emptyMessage={hydrated ? "No batches match these filters." : ""}
          />

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="bs-caption" aria-live="polite">
                Page {currentPage + 1} of {pageCount}
              </p>
              <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          )}
        </div>
        </div>
      </div>

      <Dialog
        open={bulk !== null}
        onClose={() => setBulk(null)}
        title={bulk === "delete" ? `Delete ${selectedBatches.length} batches?` : `Dispatch ${bulkDispatchable.length} batches`}
        description={
          bulk === "delete"
            ? "This removes the selected batches from the current organization list. You cannot undo this action."
            : `Confirm that you want to send ${bulkDispatchable.length} approved ${bulkDispatchable.length === 1 ? "batch" : "batches"} to the customer.${bulkDispatchable.length < selectedBatches.length ? ` ${selectedBatches.length - bulkDispatchable.length} selected batches are not ready and will be skipped.` : ""}`
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setBulk(null)}>
              Cancel
            </Button>
            {bulk === "delete" ? (
              <Button variant="destructive" onClick={confirmBulk}>
                <Trash aria-hidden="true" />
                Delete
              </Button>
            ) : (
              <Button onClick={confirmBulk}>
                <Send aria-hidden="true" />
                Dispatch
              </Button>
            )}
          </>
        }
      />

      <Dialog
        open={dispatchTarget !== null}
        onClose={closeDispatch}
        title={`Dispatch ${dispatchTarget?.id ?? "batch"}`}
        description="Confirm that you want to send this batch to the customer."
        actions={
          <>
            <Button variant="outline" onClick={closeDispatch}>
              Cancel
            </Button>
            <Button disabled={!dispatchConfirmed} onClick={confirmDispatch}>
              <Send aria-hidden="true" />
              Dispatch
            </Button>
          </>
        }
      >
        <Checkbox checked={dispatchConfirmed} onChange={(e) => setDispatchConfirmed(e.target.checked)}>
          I confirm dispatch for this batch.
        </Checkbox>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.id ?? "batch"}?`}
        description="This removes it from the current organization list. You cannot undo this action."
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash aria-hidden="true" />
              Delete
            </Button>
          </>
        }
      />
    </main>
  );
}

export default function BatchesPage() {
  return (
    <Suspense fallback={null}>
      <BatchesPageInner />
    </Suspense>
  );
}
