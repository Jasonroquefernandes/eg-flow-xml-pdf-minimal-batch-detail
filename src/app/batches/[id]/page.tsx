"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarBlank, CheckCircle, Files, FileArchive, HardDrives, UploadSimple, Folder, PaperPlaneTilt as Send, Play, Warning } from "@phosphor-icons/react";

import { Alert } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Stepper, type StepState } from "@/components/ui/stepper";
import { Tabs } from "@/components/ui/tabs";
import { StateBadge, batchStatus, isPartiallyApproved } from "@/components/batch-badges";
import { FailedInvoicesTable } from "@/components/failed-invoices-table";
import { Separator } from "@/components/ui/separator";
import { InvoiceTable } from "@/components/invoice-table";
import { getBatchInvoices } from "@/lib/invoices";
import { approveBatch, approveRemaining, BATCH_STATE_LABELS, dispatchBatch, startRendering } from "@/lib/store";
import { useAllBatches, useHydrated, useResolutions } from "@/lib/use-store";
import type { BatchState } from "@/lib/types";

const PROCESSED_VIA = { manual: "upload", zenith: "zip file", smtp: "SFTP" } as const;
const SOURCE_ICON = { manual: UploadSimple, zenith: FileArchive, smtp: HardDrives } as const;

const LIFECYCLE: BatchState[] = ["pending", "rendering", "review", "approved", "dispatching", "completed"];

const FROM_TABS: Record<string, { label: string; href: string }> = {
  active: { label: "Active batches", href: "/batches" },
  failed: { label: "Failed batches", href: "/batches?state=failed" },
  history: { label: "Dispatched batches", href: "/batches?state=completed" },
};

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const from = useSearchParams().get("from");
  const batch = useAllBatches().find((item) => item.id === params.id);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [picked, setSection] = useState<"rendered" | "failed" | "resolved" | null>(null);
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);
  const hydrated = useHydrated();
  const resolutions = useResolutions();

  if (!batch && !hydrated) return <main className="bs-page flex flex-1" />;

  if (!batch) return <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-8"><Alert variant="error" title="Batch not found"><Link className="bs-link" href="/batches">Back to batches</Link></Alert></main>;

  const invoices = getBatchInvoices(batch);
  const failed = invoices.filter((invoice) => invoice.status === "failed").length;
  // A resolved batch finished its recovery, so everything that rendered was sent; the failed invoices were replaced in other batches.
  const dispatched = batch.state === "completed" ? invoices.length : batch.partiallyDispatched || batch.state === "resolved" ? invoices.length - failed : 0;
  const handledNumbers = new Set([...resolutions.filter((record) => record.failedBatchId === batch.id).map((record) => record.failedInvoice), ...Object.keys(batch.dismissedInvoices ?? {})]);
  const openFailed = invoices.filter((invoice) => invoice.status === "failed" && !handledNumbers.has(invoice.number)).length;
  const showTabs = batch.state === "failed" || batch.state === "partial" || batch.state === "resolved";
  const needsAttention = batch.state === "failed" || batch.state === "partial";
  // The list tabs are driven by ?state=, so return to the tab this batch belongs to.
  const listTabHref = FROM_TABS[from ?? ""]?.href ?? (needsAttention ? "/batches?state=failed" : batch.state === "completed" || batch.state === "resolved" ? `/batches?state=${batch.state}` : "/batches");
  const listTabLabel = FROM_TABS[from ?? ""]?.label ?? "Batches";
  const needsRemainingApproval = needsAttention && batch.reviewRequired && !batch.remainingApproved;
  const dispatchable = invoices.length - failed;
  // A batch with nothing rendered has no invoices tab worth showing first.
  const resolvedCount = invoices.filter((invoice) => invoice.status === "failed" && handledNumbers.has(invoice.number)).length;
  // Open on the first tab: Failed while something still needs fixing, Resolved once it has been fixed.
  const visibleSection = picked ?? (needsAttention ? "failed" : batch.state === "resolved" ? "resolved" : "rendered");
  const renderedCount = invoices.filter((invoice) => invoice.status === "rendered").length;
  const visibleLifecycle = LIFECYCLE.filter((state) => !(state === "pending" && batch.source !== "manual") && !((state === "review" || state === "approved") && !batch.reviewRequired));
  const failureIndex = Math.max(0, visibleLifecycle.indexOf(batch.failedStage ?? visibleLifecycle[0]));
  const currentIndex = needsAttention ? failureIndex : visibleLifecycle.indexOf(batch.state);
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const lastIndex = visibleLifecycle.length - 1;
  // After a partial dispatch the good invoices have moved through every stage, even past the failed one.
  const reachedIndex = batch.partiallyDispatched ? lastIndex : currentIndex;
  const steps = visibleLifecycle.map((step, index) => {
    const isFailure = needsAttention && index === failureIndex;
    const afterFailure = needsAttention && index > failureIndex;
    let state: StepState = index < reachedIndex || batch.state === "completed" ? "completed" : index === reachedIndex ? "active" : "upcoming";
    if (needsAttention && index === lastIndex && batch.partiallyDispatched) state = "completed";
    if (isFailure) state = "error";
    // Per-step timestamps are not stored: first step uses created, the current step updated, the last dispatched.
    const date = index === lastIndex && batch.dispatchedAt ? fmt(batch.dispatchedAt) : index === 0 && index < reachedIndex ? fmt(batch.createdAt) : index <= reachedIndex ? fmt(batch.updatedAt) : "";
    const lines: string[] = [];
    if (isFailure) lines.push(`${failed} failed`);
    if (index === lastIndex && dispatched > 0) lines.push(`${dispatched} of ${invoices.length} sent`);
    else if (isFailure) lines.push(`${dispatchable} passed`);
    else if (afterFailure && state !== "upcoming") lines.push(`${dispatchable} passed`);
    else if (state === "completed") lines.push(`${invoices.length} passed`);
    else if (state === "active") lines.push(`${invoices.length} in progress`);
    const note = [date, ...lines].filter(Boolean).join("\n") || undefined;
    const partial = index === lastIndex && dispatched > 0 && dispatched < invoices.length;
    return { label: BATCH_STATE_LABELS[step], state, note, partial, passed: isFailure && Boolean(batch.partiallyDispatched) && index < lastIndex };
  });

  const closeDispatch = () => { setDispatchOpen(false); setDispatchConfirmed(false); };
  const handleDispatch = () => {
    if (!dispatchConfirmed) return;
    dispatchBatch(batch.id);
    closeDispatch();
    toast.success(needsAttention ? "Partial dispatch started" : "Dispatch started", { description: needsAttention ? `${dispatchable} successful invoices will be sent; ${failed} are excluded.` : `${batch.id} is being sent to the customer.` });
  };
  const actions = <div className="flex flex-wrap gap-2">
    {batch.state === "pending" && <Button size="sm" onClick={() => { startRendering(batch.id); toast.success("Rendering started"); }}><Play aria-hidden="true" /> Start rendering</Button>}
    {batch.state === "review" && <Button size="sm" onClick={() => { approveBatch(batch.id); toast.success("Batch approved"); }}><CheckCircle aria-hidden="true" /> {failed === 0 ? "Approve all" : `Approve rendered files (${dispatchable})`}</Button>}
    {batch.state === "approved" && <Button size="sm" onClick={() => setDispatchOpen(true)}><Send aria-hidden="true" /> {failed === 0 ? "Dispatch all" : `Dispatch approved files (${dispatchable})`}</Button>}
    {needsAttention && dispatchable > 0 && needsRemainingApproval && !batch.partiallyDispatched && <Button size="sm" onClick={() => { approveRemaining(batch.id); toast.success("Successful invoices approved"); }}><CheckCircle aria-hidden="true" /> Approve rendered files ({dispatchable})</Button>}
    {needsAttention && dispatchable > 0 && !needsRemainingApproval && !batch.partiallyDispatched && <Button size="sm" onClick={() => setDispatchOpen(true)}><Send aria-hidden="true" /> Dispatch approved files ({dispatchable})</Button>}
  </div>;

  return <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
    <div className="flex w-full max-w-[var(--app-max-width)] flex-col gap-6">
      <Breadcrumb items={[{ label: listTabLabel, href: listTabHref }, { label: batch.id }]} />

      <section className="overflow-hidden rounded-[var(--bs-border-radius-150)] border border-[var(--bs-border-default)]">
        <div className="bg-white px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 xl:flex-nowrap">
            <div className="flex min-w-0 items-center gap-4">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--bs-border-radius-150)] bg-[#f3f3f3] text-[var(--bs-icon-default)]`}><Folder size={28} aria-hidden="true" /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="bs-h1">{batch.id}</h1>
                  {isPartiallyApproved(batch) || batch.state === "partial"
                    ? <Chip variant="warning" className="batch-header-chip inline-flex items-center gap-1.5 font-medium">{isPartiallyApproved(batch) ? <CheckCircle size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}{batchStatus(batch).label}</Chip>
                    : batch.state === "failed"
                      ? <Chip variant="error" className="batch-header-chip inline-flex items-center gap-1.5 font-medium"><Warning size={14} aria-hidden="true" />Failed</Chip>
                      : <StateBadge state={batch.state} />}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 bs-caption text-[var(--bs-text-muted)]">
                  <span className="inline-flex items-center gap-1.5"><Files size={14} aria-hidden="true" /> {invoices.length.toLocaleString()} {invoices.length === 1 ? "invoice" : "invoices"}</span>
                  <span aria-hidden="true" className="h-4 w-px bg-[var(--bs-border-default)]" />
                  <span className="inline-flex items-center gap-1.5">{(() => { const SourceIcon = SOURCE_ICON[batch.source]; return <SourceIcon size={14} aria-hidden="true" />; })()} Processed via {PROCESSED_VIA[batch.source]}</span>
                  {batch.dispatchedAt && <>
                    <span aria-hidden="true" className="h-4 w-px bg-[var(--bs-border-default)]" />
                    <span className="inline-flex items-center gap-1.5"><Send size={14} aria-hidden="true" /> Dispatched {new Date(batch.dispatchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </>}
                </div>
              </div>
            </div>
            {actions}
          </div>
        </div>
        {batch.state !== "completed" && batch.state !== "resolved" && <div className="hidden border-t border-[var(--bs-border-default)] px-5"><Stepper label="Batch lifecycle" steps={steps} /></div>}
      </section>

      {(batch.state === "rendering" || batch.state === "dispatching") && <Progress label={batch.state === "rendering" ? "Rendering invoices" : "Sending invoices"} value={batch.state === "rendering" ? batch.progress : undefined} />}
      {showTabs && <section aria-label="Batch views"><Tabs label="Batch invoices" idPrefix="batch" value={visibleSection} onChange={setSection} tabs={[{ id: "rendered", label: dispatched > 0 ? "Dispatched" : "Rendered invoices", badge: renderedCount }, { id: "failed", label: "Failed", badge: openFailed }, { id: "resolved", label: "Resolved", badge: resolvedCount }]} /><Separator /></section>}


      {showTabs && visibleSection === "resolved" && resolvedCount === 0 && <p className="bs-body-sm text-[var(--bs-text-muted)]">No invoices resolved yet. Retried, replaced and dismissed invoices appear here.</p>}
      {showTabs && visibleSection === "failed" && openFailed === 0 && <p className="bs-body-sm text-[var(--bs-text-muted)]">No failed invoices left.</p>}
      {showTabs && (visibleSection === "failed" || visibleSection === "resolved") && <FailedInvoicesTable batch={batch} view={visibleSection === "resolved" ? "resolved" : "open"} />}

      {batch.state !== "pending" && !(showTabs && (visibleSection === "failed" || visibleSection === "resolved")) && <section className="flex flex-col gap-3"><InvoiceTable batch={batch} hideFailed={showTabs} /></section>}
    </div>

    <Dialog open={dispatchOpen} onClose={closeDispatch} title={needsAttention ? "Dispatch rendered invoices" : `Dispatch ${batch.id}`} description={needsAttention ? `${dispatchable} invoices will be sent. The ${failed} failed ${failed === 1 ? "invoice stays" : "invoices stay"} in this batch: you fix them here and send corrected invoices separately.` : "This will send the batch to the customer."} actions={<><Button variant="outline" onClick={closeDispatch}>Cancel</Button><Button disabled={!dispatchConfirmed} onClick={handleDispatch}><Send aria-hidden="true" /> Dispatch</Button></>}>
      <Checkbox checked={dispatchConfirmed} onChange={(event) => setDispatchConfirmed(event.target.checked)}>I confirm I want to dispatch.</Checkbox>
    </Dialog>
  </main>;
}
