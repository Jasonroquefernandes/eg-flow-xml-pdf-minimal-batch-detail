"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, CaretDown, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { confirmResolutions, getResolutionCandidates, SOURCE_LABELS, type ResolutionCandidate } from "@/lib/store";
import { useResolutions } from "@/lib/use-store";
import type { Batch } from "@/lib/types";

const CONFIRMED_BY = "jfern";

function CandidateRow({ candidate, onConfirm }: { candidate: ResolutionCandidate; onConfirm: () => void }) {
  const differences = candidate.checks.filter((check) => !check.matches);
  const matched = candidate.checks.length - differences.length;
  return (
    <article className="my-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <div><p className="bs-caption">Failed</p><p className="bs-body-sm font-semibold">{candidate.failed.number}</p></div>
          <ArrowRight size={16} className="text-[var(--bs-text-muted)]" aria-hidden="true" />
          <div><p className="bs-caption">Replacement</p><p className="bs-body-sm font-semibold">{candidate.replacement.number}</p></div>
          <div><p className="bs-caption">Found in</p><p className="bs-body-sm">{SOURCE_LABELS[candidate.replacementSource]} · <Link className="bs-link" href={`/batches/${candidate.replacementBatchId}`}>{candidate.replacementBatchId}</Link></p></div>
          <div><p className="bs-caption">OCR</p><p className="bs-body-sm">{candidate.ocr}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <Chip variant={candidate.safeToConfirm ? "success" : "warning"}>{candidate.safeToConfirm ? "Ready" : "Review"}</Chip>
          <Button variant={candidate.safeToConfirm ? "primary" : "outline"} size="sm" labelWidth={138} disabled={!candidate.safeToConfirm} onClick={onConfirm}>
            <CheckCircle aria-hidden="true" /> Confirm match
          </Button>
        </div>
      </div>
      <details className="mt-3 group">
        <summary className="flex cursor-pointer list-none items-center gap-1 bs-link bs-caption"><CaretDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" /> {matched} of {candidate.checks.length} fields match{differences.length > 0 ? ` · ${differences.length} differ` : ""}</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead><tr className="text-[var(--bs-text-muted)]"><th className="py-1 font-medium">Field</th><th className="py-1 font-medium">Failed</th><th className="py-1 font-medium">Replacement</th></tr></thead>
          <tbody>{candidate.checks.map((check) => <tr key={check.field} className={`border-t border-[var(--bs-border-default)] ${check.matches ? "" : "text-[var(--bs-text-warning)]"}`}><td className="py-1.5 font-semibold">{check.field}</td><td className="py-1.5">{check.expected}</td><td className="py-1.5">{check.matches ? "Matches" : check.actual}</td></tr>)}</tbody>
        </table>
      </details>
      {!candidate.safeToConfirm && differences.length > 0 && <p className="mt-2 flex items-center gap-1 bs-caption text-[var(--bs-text-warning)]"><Warning size={13} aria-hidden="true" /> OCR number and organisation must match before confirmation.</p>}
    </article>
  );
}

/** Compact recovery panel: evidence is available on demand, not permanently expanded. */
export function FailedInvoiceWorkspace({ batch }: { batch: Batch }) {
  const resolutions = useResolutions();
  const candidates = getResolutionCandidates(batch);
  const records = resolutions.filter((record) => record.failedBatchId === batch.id);
  const confirm = (candidate: ResolutionCandidate) => {
    confirmResolutions(batch, [candidate], CONFIRMED_BY);
    toast.success("Replacement confirmed", { description: "The resolution was recorded." });
  };

  if (!candidates.length && !records.length) return null;

  return (
    <section className="rounded-[var(--bs-border-radius-150)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-raised)]" aria-label="Invoice recovery">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div><h2 className="bs-h3">Invoice recovery</h2><p className="bs-body-sm bs-text-secondary">Review a detected replacement, then confirm it. Nothing is resolved automatically.</p></div>
        {records.length > 0 && <Chip variant="success">{records.length} confirmed</Chip>}
      </div>
      <div className="border-t border-[var(--bs-border-default)] px-5 py-1">
        {candidates.length ? candidates.map((candidate) => <CandidateRow key={`${candidate.failed.number}-${candidate.replacementBatchId}-${candidate.replacement.number}`} candidate={candidate} onConfirm={() => confirm(candidate)} />) : <div className="py-7 text-center"><p className="bs-body-sm font-semibold">No replacement has arrived yet</p><p className="mt-1 bs-caption">We will check SFTP and zip file uploads when new invoices arrive.</p></div>}
      </div>
      {records.length > 0 && <details className="border-t border-[var(--bs-border-default)] px-5 py-3"><summary className="flex cursor-pointer list-none items-center gap-1 bs-link bs-caption"><CaretDown size={14} aria-hidden="true" /> View {records.length} confirmed resolution{records.length === 1 ? "" : "s"}</summary><ul className="mt-3 flex flex-col gap-2">{records.map((record) => <li key={record.id} className="bs-caption">{record.failedInvoice} fixed by {record.replacementInvoice} · confirmed by {record.confirmedBy}</li>)}</ul></details>}
    </section>
  );
}
