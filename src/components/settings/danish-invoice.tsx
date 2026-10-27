import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { AppSettings, InvoiceType, TemplateStyle } from "@/lib/types";

const DKK = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const QTY = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });

type Line = { text: string; qty: number; unit: string; price: number };

const LINES: Record<InvoiceType, Line[]> = {
  consumption: [
    { text: "Elforbrug, september 2026", qty: 1240, unit: "kWh", price: 0.89 },
    { text: "Elafgift", qty: 1240, unit: "kWh", price: 0.72 },
    { text: "Nettarif og abonnement", qty: 1, unit: "md.", price: 148 },
  ],
  production: [
    {
      text: "Overskudsproduktion solceller, september 2026",
      qty: 860,
      unit: "kWh",
      price: 0.62,
    },
    { text: "Administrationsgebyr", qty: 1, unit: "stk.", price: 39 },
  ],
  group: [
    {
      text: "Samlet elforbrug, 3 målepunkter",
      qty: 3420,
      unit: "kWh",
      price: 0.89,
    },
    { text: "Gruppeabonnement", qty: 3, unit: "stk.", price: 148 },
  ],
};

const TITLE: Record<InvoiceType, string> = {
  consumption: "Faktura",
  production: "Faktura, egenproduktion",
  group: "Samlefaktura",
};

export function DanishInvoice({
  type,
  company,
  vendor,
  style,
  primary,
  accent,
  header,
  footer,
}: {
  type: InvoiceType;
  company: AppSettings["company"];
  vendor: string;
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
  const country =
    company.country === "Denmark" || !company.country
      ? "Danmark"
      : company.country;

  const lines = LINES[type];
  const net = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const vat = net * 0.25;
  const label =
    "text-[7px] uppercase tracking-wide text-[var(--bs-text-secondary)]";

  return (
    <div className="text-[8px] leading-snug">
      {style === "modern" && (
        <div className="h-1.5" style={{ background: primary }} />
      )}
      <div className="flex flex-col gap-3 p-4">
        {header}

        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-[11px]",
                style === "minimal" ? "font-normal" : "font-bold",
              )}
              style={{ color: primary }}
            >
              {name}
            </p>
            <p>{street}</p>
            <p>
              {postal} {city}
            </p>
            <p>{country}</p>
            <p>CVR-nr. {cvr}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold" style={{ color: primary }}>
              {TITLE[type]}
            </p>
            <dl className="mt-1 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5 text-right">
              <dt className="text-[var(--bs-text-secondary)]">Fakturanr.</dt>
              <dd className="font-semibold">2026-10001</dd>
              <dt className="text-[var(--bs-text-secondary)]">Fakturadato</dt>
              <dd>01-10-2026</dd>
              <dt className="text-[var(--bs-text-secondary)]">Forfaldsdato</dt>
              <dd>15-10-2026</dd>
              <dt className="text-[var(--bs-text-secondary)]">Kundenr.</dt>
              <dd>240118</dd>
            </dl>
          </div>
        </div>

        <div>
          <p className={label}>Faktureres til</p>
          <p className="font-semibold">Nordisk Energi A/S</p>
          <p>Vesterbrogade 12</p>
          <p>1620 København V</p>
          <p>Danmark</p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr
              className={cn(
                "text-left",
                style === "modern" ? "font-semibold" : "border-b font-semibold",
              )}
              style={
                style === "modern"
                  ? { background: accent }
                  : { borderColor: accent }
              }
            >
              <th className="px-1 py-1 font-semibold">Beskrivelse</th>
              <th className="px-1 py-1 text-right font-semibold">Antal</th>
              <th className="px-1 py-1 text-right font-semibold">Pris</th>
              <th className="px-1 py-1 text-right font-semibold">Beløb</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.text}
                className={cn(
                  style !== "minimal" &&
                    "border-b border-[var(--bs-border-default)]",
                )}
              >
                <td className="px-1 py-1">{line.text}</td>
                <td className="px-1 py-1 text-right whitespace-nowrap">
                  {QTY.format(line.qty)} {line.unit}
                </td>
                <td className="px-1 py-1 text-right whitespace-nowrap">
                  {DKK.format(line.price)}
                </td>
                <td className="px-1 py-1 text-right whitespace-nowrap">
                  {DKK.format(line.qty * line.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto grid w-3/5 grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
          <dt>Subtotal ekskl. moms</dt>
          <dd className="text-right">{DKK.format(net)}</dd>
          <dt>Moms 25 %</dt>
          <dd className="text-right">{DKK.format(vat)}</dd>
          <dt
            className="mt-0.5 border-t pt-1 text-[10px] font-bold"
            style={{ borderColor: accent, color: primary }}
          >
            At betale i alt
          </dt>
          <dd
            className="mt-0.5 border-t pt-1 text-right text-[10px] font-bold"
            style={{ borderColor: accent, color: primary }}
          >
            {DKK.format(net + vat)} DKK
          </dd>
        </dl>

        <div
          className="rounded-sm p-2"
          style={{
            background: style === "minimal" ? "transparent" : `${accent}66`,
          }}
        >
          <p className="mb-0.5 font-semibold">Betalingsoplysninger</p>
          <p>Betalingsbetingelser: netto 14 dage</p>
          <p>Bank: Danske Bank · Reg.nr. 4004 · Kontonr. 1162 4300 12</p>
          <p>
            IBAN: DK50 0040 0440 1162 43 · Betalings-ID: +71&lt;
            000123456789012+88607048&lt;
          </p>
        </div>

        {footer}

        <p className="border-t border-[var(--bs-border-default)] pt-2 text-center text-[7px] text-[var(--bs-text-secondary)]">
          {name} · CVR {cvr} · {street}, {postal} {city}
        </p>
      </div>
    </div>
  );
}
