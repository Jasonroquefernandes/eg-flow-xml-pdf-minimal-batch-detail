"use client";

import { DesignEditor } from "@/components/settings/design-editor";
import { Section } from "@/components/settings/settings-pages";
import type { AppSettings, DesignSettings, InvoiceType } from "@/lib/types";

export const INVOICE_TYPES: {
  id: InvoiceType;
  label: string;
  description: string;
}[] = [
  {
    id: "consumption",
    label: "Consumption",
    description: "Invoices for what a customer used.",
  },
  {
    id: "production",
    label: "Production",
    description: "Invoices for what a customer produced.",
  },
  {
    id: "group",
    label: "Group",
    description: "Combined invoices covering several accounts.",
  },
];

export function PdfPage({
  settings,
  errors,
  onChange,
  onAnnounce,
}: {
  settings: AppSettings;
  errors: Record<string, string | undefined>;
  onChange: (update: (settings: AppSettings) => AppSettings) => void;
  onAnnounce: (message: string) => void;
}) {
  const { pdf } = settings;

  const updateDesign = (
    type: InvoiceType,
    update: (design: DesignSettings) => DesignSettings,
  ) =>
    onChange((s) => ({
      ...s,
      pdf: {
        ...s.pdf,
        [type]: { ...s.pdf[type], design: update(s.pdf[type].design) },
      },
    }));

  return (
    <Section>
      <div className="flex flex-col divide-y divide-[var(--bs-border-default)] [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {INVOICE_TYPES.map((type) => (
          <DesignEditor
            key={type.id}
            idPrefix={`pdf-${type.id}`}
            typeLabel={type.label}
            design={pdf[type.id].design}
            errors={errors}
            onChange={(update) => updateDesign(type.id, update)}
            onAnnounce={onAnnounce}
            standardPreview={{
              href: `/preview/invoice?type=${type.id}`,
              fileName: `standard-${type.id}-invoice.html`,
              downloadHref: "/samples/custom-invoice.html",
            }}
          />
        ))}
      </div>
    </Section>
  );
}
