import { Paperclip } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { AppSettings, EmailAttachments, TemplateStyle } from "@/lib/types";

const DKK = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function EmailFrame({
  fromName,
  fromEmail,
  subject,
  attachments,
  primary,
  children,
}: {
  fromName: string;
  fromEmail: string;
  subject: string;
  attachments: EmailAttachments;
  primary: string;
  children: ReactNode;
}) {
  const sender = fromName.trim() || fromEmail.trim() || "Afsender";
  const files: { name: string; size: string }[] = [];
  if (attachments.enabled) {
    if (attachments.invoicePdf)
      files.push({ name: "Faktura-2026-10001.pdf", size: "84 KB" });
    if (attachments.originalXml)
      files.push({ name: "Faktura-2026-10001.xml", size: "12 KB" });
    if (attachments.additional)
      for (const file of attachments.files)
        files.push({ name: file.name, size: "" });
  }

  return (
    <div className="text-[9px] leading-snug">
      <div className="flex flex-col gap-2 border-b border-[var(--bs-border-default)] bg-[var(--bs-surface-subtle,#f7f8fc)] px-4 py-3">
        <p className="text-[12px] font-semibold">{subject || "(Intet emne)"}</p>
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: primary }}
          >
            {sender.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate">
              <span className="font-semibold">{sender}</span>
              {fromEmail.trim() && (
                <span className="text-[var(--bs-text-secondary)]">
                  {" "}
                  &lt;{fromEmail.trim()}&gt;
                </span>
              )}
            </p>
            <p className="truncate text-[var(--bs-text-secondary)]">
              Til: billing@nordiskenergi.dk
            </p>
          </div>
          <p className="shrink-0 text-[var(--bs-text-secondary)]">
            1. okt. 2026 08.15
          </p>
        </div>
      </div>

      {children}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--bs-border-default)] px-4 py-3">
          {files.map((file) => (
            <span
              key={file.name}
              className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-[var(--bs-border-default)] px-2 py-1"
            >
              <Paperclip size={10} aria-hidden="true" />
              <span className="truncate">{file.name}</span>
              {file.size && (
                <span className="text-[var(--bs-text-secondary)]">
                  {file.size}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmailBody({
  vendor,
  company,
  style,
  primary,
  accent,
  header,
  footer,
}: {
  vendor: string;
  company: AppSettings["company"];
  style: TemplateStyle;
  primary: string;
  accent: string;
  header: ReactNode;
  footer: ReactNode;
}) {
  const name = vendor || "Dit firma ApS";
  const cvr = company.registrationNumber.trim() || "12 34 56 78";
  const street = company.street.trim() || "Eksempelvej 1";
  const postal = company.postalCode.trim() || "2100";
  const city = company.city.trim() || "København Ø";
  const portal =
    company.portalAddress.trim().replace(/^https?:\/\//, "") ||
    "portal.dit-firma.dk";
  const rows = [
    ["Fakturanr.", "2026-10001"],
    ["Fakturadato", "01-10-2026"],
    ["Forfaldsdato", "15-10-2026"],
  ];

  return (
    <div>
      {style === "modern" && (
        <div className="h-1.5" style={{ background: primary }} />
      )}
      <div className="flex flex-col gap-3 p-4">
        {header}
        <p className="font-semibold">Hej Nordisk Energi A/S,</p>
        <p>
          Tak fordi du er kunde hos {name}. Din faktura for september 2026 er nu
          klar, og du kan se og betale den på vores kundeportal.
        </p>

        <div
          className="rounded-sm p-3"
          style={{
            background: style === "minimal" ? "transparent" : `${accent}66`,
            border: `1px solid ${accent}`,
          }}
        >
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
            {rows.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-[var(--bs-text-secondary)]">{term}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
            <dt
              className="mt-1 border-t pt-1 text-[11px] font-bold"
              style={{ borderColor: accent, color: primary }}
            >
              At betale
            </dt>
            <dd
              className="mt-1 border-t pt-1 text-right text-[11px] font-bold"
              style={{ borderColor: accent, color: primary }}
            >
              {DKK.format(2680.5)} DKK
            </dd>
          </dl>
        </div>

        <p>
          <span
            className={cn(
              "inline-block rounded-sm px-4 py-2 font-semibold text-white",
            )}
            style={{ background: primary }}
          >
            Se og betal faktura
          </span>
        </p>
        <p className="text-[var(--bs-text-secondary)]">
          Eller åbn {portal} og log ind med dit kundenummer.
        </p>

        <p>
          Har du spørgsmål til fakturaen, er du velkommen til at svare på denne
          mail.
          <br />
          <br />
          Med venlig hilsen
          <br />
          <span className="font-semibold">{name}</span>
        </p>

        {footer}

        <p className="border-t border-[var(--bs-border-default)] pt-2 text-center text-[8px] text-[var(--bs-text-secondary)]">
          {name} · CVR {cvr} · {street}, {postal} {city}
          <br />
          Du modtager denne mail, fordi du er kunde hos {name}.
        </p>
      </div>
    </div>
  );
}
