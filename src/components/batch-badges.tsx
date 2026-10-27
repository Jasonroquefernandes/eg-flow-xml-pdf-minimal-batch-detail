import type { CSSProperties } from "react";
import {
  Warning as AlertTriangle,
  CheckCircle,
  Eye,
  FileArchive,
  HardDrives,
  PaperPlaneTilt as Send,
  SpinnerGap as Loader2,
  UploadSimple,
  type Icon,
} from "@phosphor-icons/react";

import type { InvoiceStage } from "@/lib/dashboard";
import { BATCH_STATE_LABELS, SOURCE_LABELS } from "@/lib/store";
import type { Batch, BatchSource, BatchState } from "@/lib/types";
import { Chip, type ChipVariant } from "@/components/ui/chip";

export const STATE_BADGE_VARIANT: Record<BatchState, ChipVariant> = {
  pending: "neutral",
  rendering: "info",
  review: "warning",
  approved: "success",
  dispatching: "info",
  completed: "success",
  partial: "warning",
  failed: "error",
  resolved: "success",
};

export const STATE_ICON: Record<BatchState, Icon> = {
  pending: UploadSimple,
  rendering: Loader2,
  review: Eye,
  approved: CheckCircle,
  dispatching: Send,
  completed: Send,
  partial: AlertTriangle,
  failed: AlertTriangle,
  resolved: Send,
};

export const SOURCE_ICON: Record<BatchSource, Icon> = {
  manual: UploadSimple,
  zenith: FileArchive,
  smtp: HardDrives,
};

export const SOURCE_BADGE_VARIANT: Record<BatchSource, ChipVariant> = {
  manual: "neutral",
  zenith: "neutral",
  smtp: "neutral",
};

/** A failed batch whose rendered files were approved, but which has not been dispatched yet. */
export function isPartiallyApproved(batch: Batch): boolean {
  return (batch.state === "failed" || batch.state === "partial") && Boolean(batch.remainingApproved) && !batch.partiallyDispatched;
}

/** Label, colour and icon to show for a batch; adds "Partially approved" on top of the stored state. */
export function batchStatus(batch: Batch): { label: string; variant: ChipVariant; icon: Icon } {
  if (isPartiallyApproved(batch)) return { label: "Partially approved", variant: "warning", icon: CheckCircle };
  if (batch.state === "partial") return { label: "Partially dispatched", variant: "warning", icon: Send };
  return { label: BATCH_STATE_LABELS[batch.state], variant: STATE_BADGE_VARIANT[batch.state], icon: STATE_ICON[batch.state] };
}

const ICON_STYLE: CSSProperties = { flexShrink: 0 };

/** Status is always icon + text + colour (never colour alone). */
export function StateBadge({ state, detail }: { state: BatchState; detail?: string }) {
  const StateIcon = STATE_ICON[state];
  return (
    <Chip variant={STATE_BADGE_VARIANT[state]} className="batch-header-chip inline-flex items-center gap-1.5 font-medium">
      <StateIcon
        size={14}
        aria-hidden="true"
        style={ICON_STYLE}
        className={state === "rendering" ? "bs-spinner" : undefined}
      />
      {BATCH_STATE_LABELS[state]}
      {detail && ` · ${detail}`}
    </Chip>
  );
}

export function SourceBadge({ source }: { source: BatchSource }) {
  const SourceIcon = SOURCE_ICON[source];
  return (
    <Chip variant={SOURCE_BADGE_VARIANT[source]} className="batch-header-chip inline-flex items-center gap-1.5 font-medium">
      <SourceIcon size={14} aria-hidden="true" style={ICON_STYLE} />
      {SOURCE_LABELS[source]}
    </Chip>
  );
}

const STAGE_CHIP: Record<InvoiceStage, { label: string; variant: ChipVariant; icon: Icon }> = {
  failed: { label: "Failed", variant: "error", icon: AlertTriangle },
  review: { label: "Review pending", variant: "warning", icon: Eye },
  ready: { label: "Approved", variant: "success", icon: CheckCircle },
  dispatched: { label: "Dispatched", variant: "success", icon: Send },
  inProgress: { label: "In progress", variant: "info", icon: Loader2 },
};

/** Status chip for an invoice on the dashboards. */
export function InvoiceStageChip({ stage }: { stage: InvoiceStage }) {
  const { label, variant, icon: StageIcon } = STAGE_CHIP[stage];
  return (
    <Chip variant={variant} className="inline-flex items-center gap-1.5">
      <StageIcon size={14} aria-hidden="true" style={ICON_STYLE} />
      {label}
    </Chip>
  );
}
