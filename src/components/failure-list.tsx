"use client";

import { Alert } from "@/components/ui/alert";
import { FAILURE_CATEGORY_LABELS, getFailureItems } from "@/lib/store";
import type { Batch, FailureCategory } from "@/lib/types";

/** Failures on a failed batch grouped by type, so the advice for each kind of fix appears once. */
export function FailureList({ batch }: { batch: Batch }) {
  if (batch.state !== "failed" && batch.state !== "partial") return null;
  const items = getFailureItems(batch);
  const groups = (Object.keys(FAILURE_CATEGORY_LABELS) as FailureCategory[])
    .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <Alert variant="error" title="How to fix this batch">
      <ul className="mt-1 list-disc pl-5">
        {groups.map(({ category, items }) => {
          const batchLevel = items.filter((item) => item.level === "batch").map((item) => item.message);
          return (
            <li key={category} className="bs-body-sm">
              <strong>
                {FAILURE_CATEGORY_LABELS[category].label} ({items.length})
              </strong>
              : {FAILURE_CATEGORY_LABELS[category].hint}
              {batchLevel.length > 0 && ` Batch-level: ${batchLevel.join("; ")}.`}
            </li>
          );
        })}
      </ul>
    </Alert>
  );
}
