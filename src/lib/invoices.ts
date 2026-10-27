import type { Batch } from "@/lib/types";

export type InvoiceStatus = "rendering" | "rendered" | "failed";
export type DeliveryChannel = "email" | "postal" | "sms";

export type Invoice = {
  id: string;
  number: string;
  /** Unique per invoice within an organization; used to match a fix to the invoice that failed. */
  ocr: string;
  customer: string;
  recipient: string;
  grossAmount: number;
  currency: "DKK" | "EUR" | "SEK";
  delivery: DeliveryChannel;
  status: InvoiceStatus;
  reason?: string;
  uploadedAt: string;
  updatedAt: string;
};

const CUSTOMERS = [
  "Nordic Energy AB",
  "Green Power AS",
  "Havkraft Energi",
  "Fjord Energi",
  "Lumen Kraft AB",
  "Solvik Strøm",
  "Aurora Elnät",
  "Bergen Kraft AS",
];

const DELIVERY_CHANNELS: DeliveryChannel[] = ["email", "postal", "sms"];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++)
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

/** Demo OCR number for the invoice at `index` in a batch. */
export function ocrFor(batchId: string, index: number): string {
  return String(1000000000 + (hash(batchId) % 80000) * 10 + index);
}

/** The app has no invoice records, so the invoices in a batch are derived from the batch itself. */
export function getBatchInvoices(batch: Batch): Invoice[] {
  const base = 10000 + (hash(batch.id) % 80000);
  const failedRefs = new Set(
    (batch.failureItems ?? []).map((item) => item.invoiceRef).filter(Boolean),
  );
  const invoiceFailures = (batch.failureItems ?? []).filter(
    (item) => item.level === "invoice",
  );
  const batchFailed = batch.state === "failed" || batch.state === "partial";
  // Seeded failures don't reference derived invoice numbers, so map them onto the first invoices.
  // A batch-level failure means no invoice made it through, so every invoice is failed.
  const batchReason = batch.failureReason ?? batch.failureItems?.[0]?.message;

  return Array.from({ length: batch.invoiceCount }, (_, i) => {
    const number = `INV-${base + i}`;
    let status: InvoiceStatus = "rendered";
    let reason: string | undefined;
    if (batch.state === "rendering") status = "rendering";
    else if (invoiceFailures[i]?.retried) status = "rendered";
    else if (failedRefs.has(number) || i < invoiceFailures.length) {
      status = "failed";
      reason = invoiceFailures[i]?.message ?? batchReason;
    } else if (batchFailed && invoiceFailures.length === 0) {
      status = "failed";
      reason = batchReason;
    }
    const ocr = batch.reuploadOcr?.[i] ?? ocrFor(batch.id, i);
    const supplied = batch.reuploadFields?.[ocr];
    const customer = supplied?.customer ?? CUSTOMERS[(hash(batch.id) + i) % CUSTOMERS.length];
    const grossAmount = supplied?.grossAmount ?? 800 + (hash(`${batch.id}-${i}`) % 24000);
    const currency: Invoice["currency"] = (supplied?.currency ?? (["DKK", "EUR", "SEK"] as const)[hash(customer) % 3]) as Invoice["currency"];
    return {
      id: number,
      number,
      ocr,
      customer,
      recipient: supplied?.recipient ?? `${customer} Accounts Payable`,
      grossAmount,
      currency,
      // The channel each customer chose is not stored anywhere yet, so derive a stable one per customer.
      delivery: DELIVERY_CHANNELS[hash(customer) % DELIVERY_CHANNELS.length],
      status,
      reason,
      uploadedAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  });
}
