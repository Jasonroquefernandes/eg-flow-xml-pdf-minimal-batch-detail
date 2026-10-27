"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Folder, MagnifyingGlass, X } from "@phosphor-icons/react";

import { getBatchInvoices } from "@/lib/invoices";
import { BATCH_STATE_LABELS } from "@/lib/store";
import { useAllBatches, useCurrentOrgId, useRole } from "@/lib/use-store";

const MAX_RESULTS = 8;

/** Header search that finds batches by ID and invoices by number, OCR number or customer. */
export function GlobalSearch() {
  const router = useRouter();
  const role = useRole();
  const currentOrgId = useCurrentOrgId();
  const allBatches = useAllBatches();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const resultsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const { batches, invoices } = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return { batches: [], invoices: [] };
    const scope = role === "super_admin" ? allBatches : allBatches.filter((b) => b.organizationId === currentOrgId);
    const batchMatches = scope.filter((b) => b.id.toLowerCase().includes(term));
    const invoiceMatches = scope.flatMap((batch) =>
      getBatchInvoices(batch)
        .filter((i) => [i.number, i.ocr, i.customer].some((v) => v.toLowerCase().includes(term)))
        .map((invoice) => ({ batch, invoice })),
    );
    return { batches: batchMatches.slice(0, MAX_RESULTS), invoices: invoiceMatches.slice(0, MAX_RESULTS) };
  }, [query, allBatches, role, currentOrgId]);

  /** The field stays visible; closing only hides the results and clears the query. */
  const close = () => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };
  const go = (batchId: string) => {
    close();
    router.push(`/batches/${batchId}`);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div ref={rootRef} className="global-search" data-open="">
      <div className="global-search__field">
        <span className="nav-notifications-trigger pointer-events-none" aria-hidden="true">
          <MagnifyingGlass size={20} />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search batches and invoices (⌘K)"
          aria-expanded={open && hasQuery}
          aria-controls={resultsId}
          autoComplete="off"
          className="global-search__input"
          placeholder="Search batches and invoices"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => { if (event.key === "Escape") close(); }}
        />
        {hasQuery && (
          <button type="button" aria-label="Clear search" className="nav-notifications-trigger" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && hasQuery && (
        <div id={resultsId} className="global-search__results">
          {batches.length === 0 && invoices.length === 0 && (
            <p className="bs-body-sm bs-text-secondary p-3">No results for “{query.trim()}”.</p>
          )}
          {batches.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="bs-body-sm font-semibold px-2">Batches</h3>
              {batches.map((batch) => (
                <button key={batch.id} type="button" className="global-search-result" onClick={() => go(batch.id)}>
                  <Folder size={20} aria-hidden="true" />
                  <span className="font-semibold">{batch.id}</span>
                  <span className="bs-text-secondary">{BATCH_STATE_LABELS[batch.state]}</span>
                </button>
              ))}
            </section>
          )}
          {invoices.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="bs-body-sm font-semibold px-2">Invoices</h3>
              {invoices.map(({ batch, invoice }) => (
                <button key={`${batch.id}-${invoice.id}`} type="button" className="global-search-result" onClick={() => go(batch.id)}>
                  <FileText size={20} aria-hidden="true" />
                  <span className="font-semibold">{invoice.number}</span>
                  <span className="bs-text-secondary">{invoice.customer} · {batch.id}</span>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
