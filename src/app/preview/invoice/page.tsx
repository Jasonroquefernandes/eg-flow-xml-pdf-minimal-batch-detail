"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { DesignPreview } from "@/components/settings/design-preview";
import { useCurrentOrgId, useSettings } from "@/lib/use-store";
import type { InvoiceType } from "@/lib/types";

const TYPES: InvoiceType[] = ["consumption", "production", "group"];

function StandardInvoice() {
  const settings = useSettings(useCurrentOrgId());
  const raw = useSearchParams().get("type");
  const type = TYPES.find((t) => t === raw) ?? "consumption";

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width-narrow)] flex-col gap-4">
        <h1 className="bs-h2">Standard {type} invoice</h1>
        <DesignPreview
          design={{ ...settings.pdf[type].design, mode: "standard" }}
          vendor={settings.company.vendor}
          label={`${type} invoice`}
          company={settings.company}
          type={type}
        />
      </div>
    </main>
  );
}

export default function StandardInvoicePage() {
  return (
    <Suspense>
      <StandardInvoice />
    </Suspense>
  );
}
