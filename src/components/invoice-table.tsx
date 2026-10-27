"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChatText,
  CheckCircle,
  Copy,
  DownloadSimple,
  Envelope,
  Eye,
  FilePdf,
  FileText,
  Mailbox,
  PaperPlaneTilt,
  SpinnerGap,
  Warning,
  type Icon,
} from "@phosphor-icons/react";

import { BsInput } from "@brandsync/react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { Chip, type ChipVariant } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { CellActions, CellIcon, CellStack, DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { buildPlaceholderPdf } from "@/lib/fake-pdf";
import { compareValues, nextSort, type SortState } from "@/lib/sort";
import { getBatchInvoices, type DeliveryChannel, type Invoice, type InvoiceStatus } from "@/lib/invoices";
import { useResolutions } from "@/lib/use-store";
import type { Batch } from "@/lib/types";

const DELIVERY: Record<DeliveryChannel, { label: string; icon: Icon; variant: ChipVariant }> = {
  email: { label: "Email", icon: Envelope, variant: "neutral" },
  postal: { label: "Postal", icon: Mailbox, variant: "neutral" },
  sms: { label: "SMS", icon: ChatText, variant: "neutral" },
};

const STATUS: Record<InvoiceStatus, { label: string; variant: ChipVariant; icon: Icon }> = {
  rendering: { label: "Rendering", variant: "info", icon: SpinnerGap },
  rendered: { label: "Rendered", variant: "success", icon: CheckCircle },
  failed: { label: "Failed", variant: "error", icon: Warning },
};

const PAGE_SIZES = [10, 20, 50];

function InvoiceStatusChip({
  status,
  dispatched,
  approved,
  inReview,
  resolved,
}: {
  status: InvoiceStatus;
  dispatched?: boolean;
  approved?: boolean;
  inReview?: boolean;
  resolved?: boolean;
}) {
  const sent = dispatched && status === "rendered";
  const ready = approved && !sent && status === "rendered";
  const { label, variant, icon: StatusIcon } = resolved
    ? { label: "Resolved", variant: "success" as ChipVariant, icon: CheckCircle }
    : sent
      ? { label: "Dispatched", variant: "success" as ChipVariant, icon: PaperPlaneTilt }
      : ready
        ? { label: "Approved", variant: "success" as ChipVariant, icon: CheckCircle }
        : inReview && status === "rendered"
          ? { label: "Review pending", variant: "warning" as ChipVariant, icon: Eye }
          : STATUS[status];
  return (
    <Chip variant={variant} className="inline-flex items-center gap-1.5">
      <StatusIcon
        size={14}
        aria-hidden="true"
        className={status === "rendering" ? "bs-spinner" : undefined}
      />
      {label}
    </Chip>
  );
}

export function InvoiceTable({ batch, hideFailed = false }: { batch: Batch; hideFailed?: boolean }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [sort, setSort] = useState<SortState>({ key: "", direction: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [preview, setPreview] = useState<{ name: string; url: string; description: string } | null>(null);

  const invoices = useMemo(() => getBatchInvoices(batch), [batch]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredRows = invoices.filter(
      (invoice) =>
        (!hideFailed || invoice.status !== "failed") &&
        (!query ||
          invoice.number.toLowerCase().includes(query) ||
          invoice.customer.toLowerCase().includes(query)) &&
        (deliveryFilter === "all" || invoice.delivery === deliveryFilter) &&
        (statusFilter === "all" || invoice.status === statusFilter)
    );
    if (!sort.key) return filteredRows;
    const value = (invoice: Invoice): string => {
      switch (sort.key) {
        case "customer": return invoice.customer;
        case "ocr": return invoice.ocr;
        case "delivery": return DELIVERY[invoice.delivery].label;
        case "status": return STATUS[invoice.status].label;
        default: return invoice.number;
      }
    };
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => direction * compareValues(value(a), value(b)));
  }, [invoices, search, deliveryFilter, statusFilter, hideFailed, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const resolutions = useResolutions();
  const resolvedNumbers = useMemo(
    () => new Set(resolutions.filter((r) => r.failedBatchId === batch.id).map((r) => r.failedInvoice)),
    [resolutions, batch.id],
  );
  const renderedInvoices = invoices.filter((invoice) => invoice.status !== "rendering");

  const openPdfs = useCallback(
    (list: Invoice[]) => {
      if (list.length === 0) return;
      let name: string;
      let mockXml: string;
      let description: string;
      if (list.length === 1) {
        const invoice = list[0];
        name = `${invoice.number}.pdf`;
        mockXml = `<invoice number="${invoice.number}">\n  <batch>${batch.id}</batch>\n  <customer>${invoice.customer}</customer>\n</invoice>`;
        description = "Rendered invoice output.";
      } else {
        name = list.length === renderedInvoices.length ? `${batch.id}-all-invoices.pdf` : `${batch.id}-selected-invoices.pdf`;
        const content = list
          .map((invoice) => `  <invoice number="${invoice.number}" status="${invoice.status}">\n    <batch>${batch.id}</batch>\n    <customer>${invoice.customer}</customer>\n  </invoice>`)
          .join("\n");
        mockXml = `<invoiceBatch id="${batch.id}">\n${content}\n</invoiceBatch>`;
        description = `Combined preview of ${list.length} invoice PDFs.`;
      }
      setPreview({ name, url: URL.createObjectURL(buildPlaceholderPdf(name, mockXml)), description });
    },
    [batch.id, renderedInvoices.length]
  );

  const downloadPdf = useCallback(
    (invoice: Invoice) => {
      const name = `${invoice.number}.pdf`;
      const mockXml = `<invoice number="${invoice.number}">\n  <batch>${batch.id}</batch>\n  <customer>${invoice.customer}</customer>\n</invoice>`;
      const url = URL.createObjectURL(buildPlaceholderPdf(name, mockXml));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    },
    [batch.id]
  );

  // PDFs only exist once an invoice has finished rendering.
  const selectableIds = pageRows.filter((invoice) => invoice.status !== "rendering").map((invoice) => invoice.id);
  const selectedInvoices = rows.filter((invoice) => selected.has(invoice.id));
  const allOnPageSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAllOnPage = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of selectableIds) {
        if (allOnPageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const downloadSelected = () => {
    for (const invoice of selectedInvoices) downloadPdf(invoice);
    toast.success(`Downloading ${selectedInvoices.length} ${selectedInvoices.length === 1 ? "PDF" : "PDFs"}`);
  };

  const copySelected = async () => {
    try {
      await navigator.clipboard.writeText(selectedInvoices.map((invoice) => invoice.number).join("\n"));
      toast.success(`Copied ${selectedInvoices.length} invoice ${selectedInvoices.length === 1 ? "number" : "numbers"}`);
    } catch {
      toast.error("Could not copy the invoice numbers");
    }
  };

  const closePdf = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "number",
      sortable: true,
      header: "Invoice",
      cell: (invoice) => (
        <CellIcon icon={<FileText size={20} aria-hidden="true" />} primary={invoice.number} />
      ),
    },
    { key: "customer", sortable: true, header: "Customer", cell: (invoice) => <CellStack nowrap primary={invoice.customer} /> },
    { key: "ocr", sortable: true, header: "OCR number", cell: (invoice) => <CellStack nowrap primary={invoice.ocr} /> },
    { key: "status", sortable: true, header: "Status", cell: (invoice) => <InvoiceStatusChip status={invoice.status} dispatched={batch.partiallyDispatched || batch.state === "completed"} inReview={batch.state === "review"} approved={batch.state === "approved" || Boolean(batch.remainingApproved)} resolved={resolvedNumbers.has(invoice.number)} /> },
    {
      key: "delivery",
      sortable: true,
      header: "Dispatch type",
      cell: (invoice) => {
        const { label, icon: DeliveryIcon } = DELIVERY[invoice.delivery];
        return (
          <span className="inline-flex items-center gap-2">
            <DeliveryIcon size={16} aria-hidden="true" className="text-[var(--bs-text-secondary)]" />
            {label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (invoice) => (
        <CellActions align="start">
          {invoice.status !== "rendering" && (
            <Tooltip label="View PDF">
              <button
                type="button"
                aria-label={`View PDF for invoice ${invoice.number}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                onClick={() => openPdfs([invoice])}
              >
                <FilePdf size={20} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {invoice.status !== "rendering" && (
            <Tooltip label="Download PDF">
              <button
                type="button"
                aria-label={`Download PDF for invoice ${invoice.number}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                onClick={() => downloadPdf(invoice)}
              >
                <DownloadSimple size={20} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </CellActions>
      ),
    },
  ];

  return (
    <section aria-label="Invoices in this batch" className="flex flex-col gap-4">
      <div className="batch-filters flex flex-wrap items-end gap-3">
        <BsInput
          type="search"
          aria-label="Search"
          value={search}
          placeholder="Search invoices"
          onBsInput={(event) => {
            setSearch(event.detail);
            setPage(0);
          }}
        />
        <FilterMenu
          label="Dispatch type"
          value={deliveryFilter}
          options={[{ label: "All", value: "all" as const }, ...(Object.keys(DELIVERY) as DeliveryChannel[]).map((channel) => ({ label: DELIVERY[channel].label, value: channel, icon: DELIVERY[channel].icon }))]}
          onChange={(next) => {
            setDeliveryFilter(next);
            setPage(0);
          }}
        />
        {!hideFailed && (
          <FilterMenu
            label="Status"
            value={statusFilter}
            options={[{ label: "All", value: "all" as const }, ...(Object.keys(STATUS) as InvoiceStatus[]).map((status) => ({ label: STATUS[status].label, value: status }))]}
            onChange={(next) => {
              setStatusFilter(next);
              setPage(0);
            }}
          />
        )}
      </div>

      {selectedInvoices.length > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-selected)] px-4 py-2"
        >
          <p className="bs-body-sm font-semibold" aria-live="polite">
            {selectedInvoices.length} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" labelWidth={120} onClick={() => openPdfs(selectedInvoices)}>
              <FilePdf aria-hidden="true" />
              View PDFs
            </Button>
            <Button variant="outline" size="sm" labelWidth={140} onClick={downloadSelected}>
              <DownloadSimple aria-hidden="true" />
              Download PDFs
            </Button>
            <Button variant="outline" size="sm" labelWidth={140} onClick={copySelected}>
              <Copy aria-hidden="true" />
              Copy numbers
            </Button>
          </div>
          <button type="button" className="bs-link bs-body-sm ml-auto" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <DataTable
        caption={`Invoices in ${batch.id}`}
        rows={pageRows}
        columns={columns}
        getRowId={(invoice) => invoice.id}
        getRowLabel={(invoice) => invoice.number}
        onRowClick={(invoice) => {
          if (invoice.status !== "rendering") openPdfs([invoice]);
        }}
        sort={sort}
        onSortChange={(key) => {
          setSort((current) => nextSort(current, key));
          setPage(0);
        }}
        selection={{
          selected,
          onToggle: toggleOne,
          onToggleAll: toggleAllOnPage,
          isSelectable: (id) => selectableIds.includes(id),
          selectableIds,
        }}
        emptyMessage="No invoices match your search or filter."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="invoice-page-size" className="bs-body-sm text-[var(--bs-text-muted)]">
              Rows per page
            </label>
            <Select
              id="invoice-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
          <p className="bs-caption" aria-live="polite">
            {rows.length === 0 ? 0 : start + 1}–{start + pageRows.length} of {rows.length}{" "}
            {rows.length === 1 ? "invoice" : "invoices"}
          </p>
        </div>
        {pageCount > 1 && <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />}
      </div>

      <Dialog
        open={preview !== null}
        onClose={closePdf}
        size="lg"
        title={preview?.name ?? "Invoice PDF"}
        description={preview?.description ?? "Rendered invoice output."}
        actions={
          preview && (
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = preview.url;
                link.download = preview.name;
                link.click();
              }}
            >
              <FileText aria-hidden="true" />
              Download
            </Button>
          )
        }
      >
        {preview && (
          <iframe
            src={preview.url}
            title={`Preview of ${preview.name}`}
            className="h-[60vh] w-full rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] bg-white"
          />
        )}
      </Dialog>
    </section>
  );
}
