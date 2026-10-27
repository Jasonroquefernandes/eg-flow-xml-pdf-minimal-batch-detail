"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, Warning } from "@phosphor-icons/react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CellActions, CellStack, DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { confirmResolutions, getResolutionCandidates, SOURCE_LABELS, type ResolutionCandidate } from "@/lib/store";
import { useAllBatches, useResolutions } from "@/lib/use-store";
import type { Batch, Resolution } from "@/lib/types";

const CONFIRMED_BY = "jfern";

function Block({ title, description, action, children }: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="bs-h3">{title}</h2>
          <p className="bs-body-sm bs-text-secondary">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BatchLink({ id }: { id: string }) {
  return (
    <Link href={`/batches/${id}`} className="bs-link">
      {id}
    </Link>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Fixes received for a failed batch, the record of confirmed fixes, and a pointer on the batch that sent them. */
export function ResolutionPanel({ batch }: { batch: Batch }) {
  const batches = useAllBatches();
  const resolutions = useResolutions();

  const candidates = getResolutionCandidates(batch);
  const record = resolutions.filter((r) => r.failedBatchId === batch.id);
  const fixesFor = batches
    .filter((b) => (b.state === "failed" || b.state === "partial") && b.organizationId === batch.organizationId && b.id !== batch.id)
    .flatMap((failed) => getResolutionCandidates(failed).map((c) => ({ failed, candidate: c })))
    .filter(({ candidate }) => candidate.replacementBatchId === batch.id);

  const confirm = (list: ResolutionCandidate[]) => {
    const confirmable = list.filter((candidate) => candidate.safeToConfirm);
    if (confirmable.length === 0) {
      toast.error("No safe matches to confirm", { description: "Invoice number and organisation must match." });
      return;
    }
    confirmResolutions(batch, confirmable, CONFIRMED_BY);
    toast.success(confirmable.length === 1 ? "Fix confirmed" : `${confirmable.length} fixes confirmed`, {
      description: "The comparison and confirmation were saved to the resolution record.",
    });
  };

  const candidateColumns: DataTableColumn<ResolutionCandidate>[] = [
    { key: "ocr", header: "OCR number", cell: (c) => <CellStack primary={c.ocr} /> },
    {
      key: "failed",
      header: "Failed invoice",
      cell: (c) => <CellStack primary={c.failed.number} secondary={c.failed.reason} />,
    },
    {
      key: "fixed",
      header: "Replacement received",
      cell: (c) => (
        <CellStack primary={c.replacement.number} secondary={`${SOURCE_LABELS[c.replacementSource]} · ${c.replacementBatchId}`} />
      ),
    },
    {
      key: "validation",
      header: "Validation",
      cell: (c) => {
        const differences = c.checks.filter((check) => !check.matches);
        return (
          <CellStack
            primary={c.safeToConfirm ? "Identity verified" : "Identity mismatch"}
            secondary={differences.length ? differences.map((check) => `${check.field}: ${check.expected} → ${check.actual}`).join(" · ") : "All fields match"}
          />
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (c) => (
        <CellActions align="start">
          <Button variant="outline" size="sm" labelWidth={120} disabled={!c.safeToConfirm} onClick={() => confirm([c])}>
            {c.safeToConfirm ? <CheckCircle aria-hidden="true" /> : <Warning aria-hidden="true" />}
            {c.safeToConfirm ? "Confirm" : "Review mismatch"}
          </Button>
        </CellActions>
      ),
    },
  ];

  const recordColumns: DataTableColumn<Resolution>[] = [
    { key: "ocr", header: "OCR number", cell: (r) => <CellStack primary={r.ocr} /> },
    {
      key: "failed",
      header: "Failed invoice",
      cell: (r) => <CellStack primary={r.failedInvoice} secondary={r.failureReason} />,
    },
    {
      key: "fixed",
      header: "Fixed by",
      cell: (r) => <CellStack primary={r.replacementInvoice} secondary={`${r.replacementSource ? `${SOURCE_LABELS[r.replacementSource]} · ` : ""}${r.replacementBatchId}`} />,
    },
    {
      key: "confirmed",
      header: "Confirmed",
      cell: (r) => <CellStack nowrap primary={r.confirmedBy} secondary={formatDate(r.confirmedAt)} />,
    },
  ];

  return (
    <>
      {fixesFor.length > 0 && (
        <Alert
          variant="info"
          title={`This batch re-sends ${fixesFor.length} failed ${fixesFor.length === 1 ? "invoice" : "invoices"}`}
        >
          <ul className="mt-1 list-disc pl-5">
            {fixesFor.map(({ failed, candidate }) => (
              <li key={`${failed.id}-${candidate.ocr}`} className="bs-body-sm">
                {candidate.replacement.number} matches {candidate.failed.number} (OCR {candidate.ocr}) in{" "}
                <BatchLink id={failed.id} />. Confirm the fix there.
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {candidates.length > 0 && (
        <Block
          title="Replacement candidates"
          description={`${candidates.length} candidate ${candidates.length === 1 ? "has" : "have"} arrived through configured ingestion channels. OCR number and organisation must match; any customer, recipient, amount or currency differences are shown for review.`}
          action={
            candidates.filter((candidate) => candidate.safeToConfirm).length > 1 ? (
              <Button variant="primary" size="sm" labelWidth={120} onClick={() => confirm(candidates)}>
                <CheckCircle aria-hidden="true" />
                Confirm all
              </Button>
            ) : undefined
          }
        >
          <DataTable
            caption="Replacement candidates"
            columns={candidateColumns}
            rows={candidates}
            getRowId={(c) => c.ocr}
            emptyMessage="No fixes received."
          />
        </Block>
      )}

      {record.length > 0 && (
        <Block
          title="Resolution record"
          description={
            batch.state === "resolved"
              ? "Every failed invoice in this batch was fixed and confirmed."
              : "Failed invoices that were fixed and confirmed. This record is kept permanently."
          }
        >
          <DataTable
            caption="Resolution record"
            columns={recordColumns}
            rows={record}
            getRowId={(r) => r.id}
            emptyMessage="No resolutions yet."
          />
        </Block>
      )}
    </>
  );
}
