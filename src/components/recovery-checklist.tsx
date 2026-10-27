"use client";

import { ArrowClockwise, CheckCircle, CloudArrowUp, PaperPlaneTilt, PencilSimple, Warning } from "@phosphor-icons/react";

import { Chip } from "@/components/ui/chip";
import { getBatchInvoices } from "@/lib/invoices";
import { getFailureItems, getInvoiceFailure } from "@/lib/store";
import { useResolutions } from "@/lib/use-store";
import type { Batch, FailureCategory } from "@/lib/types";

type Action = {
  id: string;
  icon: typeof ArrowClockwise;
  title: string;
  detail: string;
  state: "ready" | "waiting" | "done";
};

const categoryCopy: Record<FailureCategory, { title: string; detail: string; icon: typeof ArrowClockwise }> = {
  transient: {
    title: "Retry temporary failures",
    detail: "These are service or connection issues. The invoice data is unchanged, so retrying is safe.",
    icon: ArrowClockwise,
  },
  delivery: {
    title: "Correct delivery details",
    detail: "Check the recipient address or delivery channel, then send the corrected invoice again with the same OCR number.",
    icon: PencilSimple,
  },
  data: {
    title: "Correct source invoice data",
    detail: "Fix the source invoice and upload it again with the same OCR number. We will identify the new invoice for you to verify.",
    icon: CloudArrowUp,
  },
};

/** The first screen in recovery: makes the next safe decision unmistakable. */
export function RecoveryChecklist({ batch }: { batch: Batch }) {
  const resolutions = useResolutions();
  const invoices = getBatchInvoices(batch);
  const failureItems = getFailureItems(batch);
  const resolved = new Set(resolutions.filter((record) => record.failedBatchId === batch.id).map((record) => record.failedInvoice));
  const failedInvoices = invoices.filter((invoice) => invoice.status === "failed" && !resolved.has(invoice.number));
  const readyInvoices = invoices.filter((invoice) => invoice.status === "rendered");
  // Ignore invoices already confirmed as fixed, while keeping batch-wide issues visible.
  const actionableFailureItems = failureItems.filter((item) =>
    item.level === "batch" || failedInvoices.some((invoice) => getInvoiceFailure(batch, invoice.number)?.id === item.id),
  );
  const categories = new Set(actionableFailureItems.map((item) => item.category));
  const actions: Action[] = [];

  if (readyInvoices.length > 0) {
    actions.push({
      id: "dispatch",
      icon: PaperPlaneTilt,
      title: `Send ${readyInvoices.length} invoice${readyInvoices.length === 1 ? "" : "s"} that passed`,
      detail: batch.partiallyDispatched
        ? "These invoices have already been sent. The failed invoices remain excluded."
        : batch.reviewRequired && !batch.remainingApproved
          ? "Approve the successful invoices first. Failed invoices are excluded from approval and dispatch."
          : "Use “Dispatch rendered invoices” above. Failed invoices are excluded, so there is no risk of sending them twice.",
      state: batch.partiallyDispatched ? "done" : "ready",
    });
  }

  (["transient", "delivery", "data"] as FailureCategory[]).forEach((category) => {
    if (!categories.has(category)) return;
    const count = actionableFailureItems.filter((item) => item.category === category && item.level === "invoice").length;
    const batchWide = actionableFailureItems.some((item) => item.category === category && item.level === "batch");
    const copy = categoryCopy[category];
    actions.push({
      id: category,
      icon: copy.icon,
      title: `${copy.title}${count ? ` (${count})` : ""}`,
      detail: `${copy.detail}${batchWide ? " A batch-wide issue is also recorded; resolve that before treating this batch as closed." : ""}`,
      state: "waiting",
    });
  });

  const label = readyInvoices.length > 0 && !batch.partiallyDispatched
    ? "Start by sending what is safe"
    : "Resolve the remaining invoices";

  return (
    <section className="overflow-hidden rounded-[var(--bs-border-radius-150)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-raised)]" aria-labelledby="recovery-checklist-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--bs-border-default)] px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2"><Warning size={18} className="text-[var(--bs-text-warning)]" aria-hidden="true" /><h2 id="recovery-checklist-title" className="bs-h3">Recovery plan</h2></div>
          <p className="mt-1 bs-body-sm bs-text-secondary">{label}. Each action is isolated so a correction or retry cannot affect invoices that already passed.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Batch recovery summary">
          <Chip variant="error">{failedInvoices.length} need attention</Chip>
          {readyInvoices.length > 0 && <Chip variant={batch.partiallyDispatched ? "success" : "info"}>{readyInvoices.length} {batch.partiallyDispatched ? "sent" : "safe to send"}</Chip>}
        </div>
      </div>
      <ol className="divide-y divide-[var(--bs-border-default)]">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return <li key={action.id} className="flex gap-4 px-5 py-4 sm:px-6">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bs-caption font-semibold ${action.state === "done" ? "bg-[var(--bs-color-success-container)] text-[var(--bs-text-success)]" : "bg-[var(--bs-surface-selected)] text-[var(--bs-text-default)]"}`}>{action.state === "done" ? <CheckCircle size={16} aria-hidden="true" /> : index + 1}</span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 bs-body-sm font-semibold"><Icon size={16} aria-hidden="true" /> {action.title} {action.state === "done" && <span className="bs-caption font-normal text-[var(--bs-text-success)]">Complete</span>}</p>
              <p className="mt-1 bs-body-sm bs-text-secondary">{action.detail}</p>
            </div>
          </li>;
        })}
      </ol>
      <div className="border-t border-[var(--bs-border-default)] bg-[var(--bs-surface-selected)] px-5 py-3 sm:px-6">
        <p className="bs-caption text-[var(--bs-text-secondary)]"><strong className="text-[var(--bs-text-default)]">Final check:</strong> after a corrected upload arrives, compare it with the failed invoice and confirm the match. Nothing is closed automatically.</p>
      </div>
    </section>
  );
}
