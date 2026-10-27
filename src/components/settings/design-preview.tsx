"use client";

import { useMemo } from "react";

import {
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  TEMPLATE_LABELS,
  buildCustomPreviewHtml,
  detectImageTags,
  isHexColor,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import { DanishInvoice } from "@/components/settings/danish-invoice";
import { EmailBody, EmailFrame } from "@/components/settings/email-preview";
import type {
  AppSettings,
  DesignSettings,
  EmailSettings,
  ImageSlot,
  InvoiceType,
} from "@/lib/types";

const JUSTIFY = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;
const HEIGHT = { small: "h-10", medium: "h-14", large: "h-20" } as const;

function Slot({ slot }: { slot: ImageSlot }) {
  if (!slot.image) return null;
  return (
    <div className={cn("flex", JUSTIFY[slot.alignment])}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slot.image.dataUrl}
        alt=""
        className={cn("max-w-full object-contain", HEIGHT[slot.size])}
      />
    </div>
  );
}

function describeSlot(name: string, slot: ImageSlot): string {
  return slot.image ? `${name} image is added.` : `${name} image is not added.`;
}

export function DesignPreview({
  design,
  vendor,
  label,
  subject,
  company,
  email,
  type = "consumption",
}: {
  design: DesignSettings;
  vendor: string;
  label: string;
  subject?: string;
  company?: AppSettings["company"];
  email?: EmailSettings;
  type?: InvoiceType;
}) {
  const customHtml = useMemo(
    () =>
      design.mode === "custom" ? buildCustomPreviewHtml(design, vendor) : null,
    [design, vendor],
  );

  const primary = isHexColor(design.primaryColor)
    ? design.primaryColor
    : DEFAULT_PRIMARY;
  const accent = isHexColor(design.accentColor)
    ? design.accentColor
    : DEFAULT_ACCENT;
  const { style } = design;

  let description = `Preview of a sample ${company ? "Danish " : ""}${label}.`;
  if (subject) description += ` Subject line: ${subject}.`;
  if (design.mode === "standard") {
    description += ` ${TEMPLATE_LABELS[design.style]} template.`;
    description += ` ${describeSlot("Header", design.header)} ${describeSlot("Footer", design.footer)}`;
  } else if (!customHtml) {
    description += " Upload an HTML template to see it here.";
  } else {
    const missing = detectImageTags(design.template).filter(
      (tag) => !design.assets.find((a) => a.tag === tag)?.image,
    ).length;
    description += ` Built from your template. ${missing === 0 ? "Every image is added." : `${missing} ${missing === 1 ? "image needs" : "images need"} an image.`}`;
  }

  const customBlock = customHtml ? (
    <iframe
      srcDoc={customHtml}
      sandbox=""
      aria-hidden="true"
      tabIndex={-1}
      inert
      title="Template preview"
      className="pointer-events-none h-96 w-full bg-[var(--bs-static-white)]"
    />
  ) : (
    <p className="p-4 text-xs">Upload an HTML template to see a preview.</p>
  );

  return (
    <figure className="flex flex-col gap-3 rounded-[var(--bs-border-radius-150)] bg-[var(--bs-color-neutral-container)] p-4">
      <figcaption className="bs-label">Preview</figcaption>
      <div
        role="img"
        aria-label={description}
        className="overflow-hidden rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] bg-[var(--bs-static-white)] text-[var(--bs-static-black)] shadow-sm"
      >
        {email && company ? (
          <EmailFrame
            fromName={email.fromName}
            fromEmail={email.fromEmail}
            subject={subject ?? email.subject}
            attachments={email.attachments}
            primary={primary}
          >
            {design.mode === "standard" ? (
              <EmailBody
                vendor={vendor}
                company={company}
                style={style}
                primary={primary}
                accent={accent}
                header={<Slot slot={design.header} />}
                footer={<Slot slot={design.footer} />}
              />
            ) : (
              customBlock
            )}
          </EmailFrame>
        ) : design.mode === "standard" && company ? (
          <DanishInvoice
            type={type}
            company={company}
            vendor={vendor}
            style={style}
            primary={primary}
            accent={accent}
            header={<Slot slot={design.header} />}
            footer={<Slot slot={design.footer} />}
          />
        ) : design.mode === "standard" ? (
          <div>
            {style === "modern" && (
              <div className="h-1.5" style={{ background: primary }} />
            )}
            <div
              className={cn(
                "flex flex-col gap-4 p-4",
                style === "minimal" ? "text-[11px]" : "text-xs",
              )}
            >
              <Slot slot={design.header} />
              <div className="flex flex-col gap-3">
                <div>
                  <p
                    className={cn(
                      "text-sm",
                      style === "minimal" ? "font-normal" : "font-semibold",
                    )}
                    style={{ color: primary }}
                  >
                    {vendor || "Your company"}
                  </p>
                  <p>Invoice INV-10001 · 1 Oct 2026</p>
                </div>
                <p>Bill to Nordic Energy AB</p>
                <div
                  className={cn(
                    "flex flex-col",
                    style !== "minimal" &&
                      "divide-y divide-[var(--bs-border-default)] border-y border-[var(--bs-border-default)]",
                  )}
                >
                  {style === "modern" && (
                    <div
                      className="flex justify-between px-1 py-1.5 font-semibold"
                      style={{ background: accent }}
                    >
                      <span>Item</span>
                      <span>Amount</span>
                    </div>
                  )}
                  {[
                    ["Electricity, September", "890,00"],
                    ["Grid fee", "360,00"],
                  ].map(([item, amount]) => (
                    <div key={item} className="flex justify-between py-1.5">
                      <span>{item}</span>
                      <span>{amount}</span>
                    </div>
                  ))}
                </div>
                <p
                  className={cn(
                    "text-right text-sm font-semibold",
                    style === "standard" && "border-t-2 pt-2",
                  )}
                  style={
                    style === "standard"
                      ? { borderColor: accent, color: primary }
                      : { color: primary }
                  }
                >
                  Total 1 250,00 NOK
                </p>
              </div>
              <Slot slot={design.footer} />
            </div>
          </div>
        ) : customHtml ? (
          <iframe
            srcDoc={customHtml}
            sandbox=""
            aria-hidden="true"
            tabIndex={-1}
            inert
            title="Template preview"
            className="pointer-events-none h-96 w-full bg-[var(--bs-static-white)]"
          />
        ) : (
          <p className="p-4 text-xs">
            Upload an HTML template to see a preview.
          </p>
        )}
      </div>
    </figure>
  );
}
