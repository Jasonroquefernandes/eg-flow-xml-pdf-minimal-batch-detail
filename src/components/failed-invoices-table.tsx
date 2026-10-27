"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowClockwise, CheckCircle, Eye, FileMagnifyingGlass, FileText, Prohibit, Question, UploadSimple, Warning, X } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { BsInput } from "@brandsync/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { CellActions, CellIcon, CellStack, DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getBatchInvoices, type Invoice } from "@/lib/invoices";
import { getInvoiceFailure, retryInvoice } from "@/lib/store";
import { useAllBatches, useResolutions } from "@/lib/use-store";
import type { Batch, Resolution } from "@/lib/types";

const STAGE_FAILED = { rendering: "Render failed", approved: "Approval failed", dispatching: "Dispatch failed" };
const STAGE_RETRY = { rendering: "Re-render", approved: "Retry", dispatching: "Re-dispatch" };

/** Stage the invoice failed at, and the retry action when the cause is temporary (no fix needed). */
function failureOf(batch: Batch, invoice: Invoice) {
  const item = getInvoiceFailure(batch, invoice.number);
  const raw = item?.stage ?? batch.failedStage;
  const stage = raw === "approved" || raw === "dispatching" ? raw : "rendering";
  return { label: STAGE_FAILED[stage], retryLabel: item?.category === "transient" ? STAGE_RETRY[stage] : undefined };
}

function retry(batch: Batch, invoice: Invoice, label: string) {
  retryInvoice(batch.id, invoice.number);
  toast.success(`${label} succeeded`, { description: `${invoice.number} was processed again and is no longer failed.` });
}

function MatchPanel({ batch, invoice, record, onClose }: { batch: Batch; invoice: Invoice; record?: Resolution; onClose: () => void }) {
  const dismissed = batch.dismissedInvoices?.[invoice.number];
  const { retryLabel } = failureOf(batch, invoice);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Plain rows: what to fix, then what to send.
  const category = getInvoiceFailure(batch, invoice.number)?.category;
  const steps: { label: string; content: ReactNode }[] = dismissed
    ? [{ label: "Dismissed", content: dismissed }]
    : retryLabel
      ? [
          { label: "Fix", content: "This was a temporary problem. The invoice is fine, so no changes are needed." },
          { label: "Then", content: `${retryLabel} the invoice.` },
        ]
      : [
          {
            label: "Fix",
            content: category === "delivery"
              ? "Confirm the delivery details with the customer, or switch this invoice to Postal."
              : "Correct the invoice data that caused the failure.",
          },
          {
            label: "Then send",
            content: (
              <>
                A corrected invoice with OCR <code className="bs-mono rounded-[var(--bs-border-radius-100)] bg-white px-1.5 py-0.5">{invoice.ocr}</code> by upload, SFTP, or zip
              </>
            ),
          },
        ];

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-[var(--bs-overlay)]" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Details for ${invoice.number}`} onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-[var(--bs-surface-raised)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--bs-border-default)] px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="bs-h3">{invoice.number}</h2>
              {record && <Chip variant="success" className="inline-flex items-center gap-1.5"><CheckCircle size={14} aria-hidden="true" />Resolved automatically</Chip>}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="nav-notifications-trigger"><X size={20} aria-hidden="true" /></button>
        </header>

        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
          <section className="flex flex-col gap-3">
            <h3 className="bs-body font-semibold">Failure reason</h3>
            <p className="flex items-start gap-3 rounded-[var(--bs-border-radius-150)] bg-[var(--bs-surface-error)] p-4 bs-body-sm text-[var(--bs-text-error)]"><Warning size={18} aria-hidden="true" className="mt-0.5 shrink-0" />{invoice.reason ?? "Rendering failed"}</p>
          </section>

          {!record && <section className="flex flex-col gap-3">
            <h3 className="bs-body font-semibold">What to do</h3>
            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-[var(--bs-border-radius-150)] bg-[#f3f3f3] p-4 bs-body-sm">
              {steps.map((step) => (
                <Fragment key={step.label}>
                  <dt className="text-[var(--bs-text-secondary)]">{step.label}</dt>
                  <dd>{step.content}</dd>
                </Fragment>
              ))}
            </dl>
          </section>}

          {record && (
            <section className="flex flex-col gap-3">
              <h3 className="bs-body font-semibold">Replacement invoice</h3>
              <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-[var(--bs-border-radius-150)] bg-[#f3f3f3] p-4 bs-body-sm">
                <dt className="text-[var(--bs-text-secondary)]">Invoice</dt>
                <dd className="font-semibold">{record.replacementInvoice}</dd>
                <dt className="text-[var(--bs-text-secondary)]">Batch</dt>
                <dd><Link className="bs-link" href={`/batches/${record.replacementBatchId}`}>{record.replacementBatchId}</Link></dd>
                <dt className="text-[var(--bs-text-secondary)]">OCR</dt>
                <dd><code className="bs-mono rounded-[var(--bs-border-radius-100)] bg-white px-1.5 py-0.5">{record.ocr}</code></dd>
                <dt className="text-[var(--bs-text-secondary)]">Matched</dt>
                <dd>Automatically on {new Date(record.confirmedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>
              </dl>
            </section>
          )}
        </div>

        {!record && retryLabel && !dismissed && (
          <footer className="flex items-center justify-between gap-3 border-t border-[var(--bs-border-default)] px-6 py-4">
            <span />
            <Button onClick={() => { retry(batch, invoice, retryLabel); onClose(); }}><ArrowClockwise aria-hidden="true" /> {retryLabel}</Button>
          </footer>
        )}
      </aside>
    </div>
  );
}

/** Open failed invoices: not retried, not confirmed against a replacement and not dismissed. */
function useOpenFailures(batch: Batch) {
  const resolutions = useResolutions();
  const resolved = new Set(resolutions.filter((record) => record.failedBatchId === batch.id).map((record) => record.failedInvoice));
  const all = getBatchInvoices(batch).filter((invoice) => invoice.status === "failed");
  const open = all.filter((invoice) => !resolved.has(invoice.number) && !(invoice.number in (batch.dismissedInvoices ?? {})));
  return { all, open };
}

/** Tells the user, on landing, what has to be fixed first. It stays until closed; the Failed tab keeps the list. */
export function RecoveryGuide({ batch }: { batch: Batch }) {
  const { all, open } = useOpenFailures(batch);
  const [visible, setVisible] = useState(true);
  if (!visible || all.length === 0 || open.length === 0) return null;
  return (
    <Alert
      variant="error"
      icon={Warning}
      className="border-transparent"
      title={`${open.length} ${open.length === 1 ? "invoice needs" : "invoices need"} attention`}
      action={
        <button type="button" aria-label="Close banner" className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--bs-border-radius-100)] text-[var(--bs-text-error)] hover:bg-[color-mix(in_srgb,var(--bs-text-error)_12%,transparent)]" onClick={() => setVisible(false)}>
          <X size={16} aria-hidden="true" />
        </button>
      }
    >
      {open.length === 1 ? "This invoice failed" : "These invoices failed"} to process and {open.length === 1 ? "requires" : "require"} a replacement file.
    </Alert>
  );
}

/** Button that opens the step-by-step guide for fixing the failed invoices. */
export function ResolutionGuideButton({ batch }: { batch: Batch }) {
  const { open } = useOpenFailures(batch);
  const [helpOpen, setHelpOpen] = useState(false);
  if (open.length === 0) return null;
  const hasTransient = open.some((invoice) => failureOf(batch, invoice).retryLabel);
  const steps = [
    ...(hasTransient ? [{ icon: ArrowClockwise, title: "Retry temporary failures", text: "For timeouts or temporary service errors, retry the invoice if the action is available. No new upload is needed." }] : []),
    { icon: FileMagnifyingGlass, title: "Review the failure reason", text: "Open the invoice to see the detailed failure message and understand what needs to be corrected." },
    { icon: UploadSimple, title: "Upload a replacement", text: "Correct the invoice and upload a new file with the same OCR number, by upload, SFTP or zip." },
    { icon: CheckCircle, title: "Let the system update the status", text: "The replacement is matched to the original invoice and the status updates automatically once the new batch is dispatched. No manual review is needed." },
  ];
  return (
    <>
      <span className="guide-btn"><Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}><Question aria-hidden="true" /> How to fix</Button></span>
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="How to fix failed items" description="Steps to get the failed items out of this batch." actions={<Button onClick={() => setHelpOpen(false)}>Got it</Button>}>
        <ol className="flex flex-col gap-6">
          {steps.map(({ icon: StepIcon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--bs-border-radius-150)] bg-[var(--bs-neutral-50)] text-[#1d5fd1]">
                <StepIcon size={22} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="bs-body font-semibold">{title}</h3>
                <p className="bs-body-sm text-[var(--bs-text-secondary)]">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Dialog>
    </>
  );
}

export function FailedInvoicesTable({ batch, view = "open" }: { batch: Batch; view?: "open" | "resolved" }) {
  useAllBatches(); // re-render when a new batch is uploaded
  const dismissedMap = batch.dismissedInvoices ?? {};
  const resolutions = useResolutions();
  const records = resolutions.filter((record) => record.failedBatchId === batch.id);
  const recordByInvoice = new Map(records.map((record) => [record.failedInvoice, record]));
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isOpen = (invoice: Invoice) => !recordByInvoice.has(invoice.number) && !(invoice.number in dismissedMap);
  // Open tab: still needs a fix. Resolved tab: confirmed against a replacement, or dismissed.
  const failed = getBatchInvoices(batch).filter((invoice) => invoice.status === "failed" && (view === "open") === isOpen(invoice));
  if (failed.length === 0) return null;
  const open = failed.find((invoice) => invoice.id === openId);
  const query = search.trim().toLowerCase();
  const rows = query
    ? failed.filter((invoice) => [invoice.number, invoice.customer, invoice.ocr].some((value) => value.toLowerCase().includes(query)))
    : failed;

  const columns: DataTableColumn<Invoice>[] = [
    { key: "invoice", header: "Invoice", cell: (invoice) => <CellIcon icon={<FileText size={20} aria-hidden="true" />} primary={invoice.number} /> },
    { key: "customer", header: "Customer", cell: (invoice) => <CellStack nowrap primary={invoice.customer} /> },
    { key: "ocr", header: "OCR number", cell: (invoice) => <CellStack nowrap primary={invoice.ocr} /> },
    {
      key: "status",
      header: "Status",
      cell: (invoice) => {
        const chip = (variant: "success" | "info" | "error" | "neutral", Icon: typeof CheckCircle, label: string) => <Chip variant={variant} className="inline-flex items-center gap-1.5"><Icon size={14} aria-hidden="true" />{label}</Chip>;
        if (recordByInvoice.has(invoice.number)) return chip("success", CheckCircle, "Resolved");
        if (invoice.number in dismissedMap) return chip("neutral", Prohibit, "Dismissed");
        return chip("error", Warning, "Failed");
      },
    },
    { key: "reason", header: "Failure reason", cell: (invoice) => <span className="block max-w-[22rem] truncate" title={invoice.reason ?? "Rendering failed"}>{invoice.reason ?? "Rendering failed"}</span> },
    {
      key: "replacement",
      header: "Replacement",
      cell: (invoice) => {
        const record = recordByInvoice.get(invoice.number);
        if (record) return <CellStack nowrap primary={record.replacementInvoice} secondary={`Matched automatically · ${record.replacementBatchId}`} />;
        if (invoice.number in dismissedMap) return <CellStack nowrap primary="Dismissed" secondary={dismissedMap[invoice.number]} />;
        if (failureOf(batch, invoice).retryLabel) return <span className="text-[var(--bs-text-muted)]">-</span>;
        return <span className="whitespace-nowrap text-[var(--bs-text-muted)]">Waiting for file</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (invoice) => {
        const retryLabel = failureOf(batch, invoice).retryLabel;
        return (
          <CellActions>
            {retryLabel && retryLabel !== "Re-dispatch" && isOpen(invoice)
              ? <Button variant="primary" size="sm" labelWidth={104} onClick={() => retry(batch, invoice, retryLabel)}><ArrowClockwise aria-hidden="true" /> {retryLabel}</Button>
              : null}
            <Tooltip label="View details">
              <button
                type="button"
                aria-label={`View details for invoice ${invoice.number}`}
                className={buttonVariants({ variant: "outline", size: "icon-sm", className: "border-[var(--bs-border-default)] text-[var(--bs-icon-default)]" })}
                onClick={() => setOpenId(invoice.id)}
              >
                <Eye size={20} aria-hidden="true" />
              </button>
            </Tooltip>
          </CellActions>
        );
      },
    },
  ];

  return (
    <>
    <section className="flex flex-col gap-3" aria-label="Failed invoices">
      <div className="batch-filters">
        <BsInput
          type="search"
          aria-label="Search"
          value={search}
          placeholder="Search invoices"
          onBsInput={(event) => setSearch(event.detail)}
        />
      </div>
      <DataTable
        caption={`Failed invoices in ${batch.id}`}
        columns={columns}
        rows={rows}
        getRowId={(invoice) => invoice.id}
        getRowLabel={(invoice) => `${invoice.number} match details`}
        onRowClick={(invoice) => setOpenId(invoice.id)}
        emptyMessage="No failed invoices."
      />
      {open && <MatchPanel batch={batch} invoice={open} record={recordByInvoice.get(open.number)} onClose={() => setOpenId(null)} />}
    </section>
    </>
  );
}
