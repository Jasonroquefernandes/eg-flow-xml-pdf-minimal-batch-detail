"use client";

import { useRef, type RefObject } from "react";
import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PromoAttachment } from "@/lib/types";

function formatSize(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms?: number): string {
  return ms == null ? "—" : new Date(ms).toLocaleDateString();
}

export function AttachmentsPage({
  items,
  onChange,
  onAnnounce,
  inputRef,
}: {
  items: PromoAttachment[];
  onChange: (next: PromoAttachment[], previous: PromoAttachment[]) => void;
  onAnnounce: (message: string) => void;
  /** When the parent owns the "Add attachment" button, it passes the file input ref and this page hides its own button. */
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const ownInput = useRef<HTMLInputElement>(null);
  const fileInput = inputRef ?? ownInput;

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      lastModified: f.lastModified,
    }));
    onChange([...items, ...added], items);
    onAnnounce(
      `${added.length} ${added.length === 1 ? "file" : "files"} added.`,
    );
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeFile = (id: string, name: string) => {
    onChange(
      items.filter((f) => f.id !== id),
      items,
    );
    onAnnounce(`${name} removed.`);
  };

  const rows = items;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <input
        ref={fileInput}
        id="email-files-input"
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => addFiles(e.target.files)}
      />
      {!inputRef && (
        <div className="flex justify-end">
          <Button onClick={() => fileInput.current?.click()}>
            <Plus size={16} aria-hidden="true" />
            Add attachment
          </Button>
        </div>
      )}
      <section aria-label="Attachment list" className="flex flex-col gap-5">
        {rows.length === 0 ? (
          <EmptyState>No attachments are added to emails.</EmptyState>
        ) : (
          <Table caption="Email attachments">
            <TableHead>
              <tr>
                <TableHeader>Name</TableHeader>
                <TableHeader>File size</TableHeader>
                <TableHeader>Last modified</TableHeader>
                <TableHeader className="bs-cell-right">
                  <span className="sr-only">Actions</span>
                </TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{formatSize(row.size)}</TableCell>
                  <TableCell>{formatDate(row.lastModified)}</TableCell>
                  <TableCell right>
                    <Button
                      variant="ghost"
                      aria-label={`Delete ${row.name}`}
                      onClick={() => removeFile(row.id, row.name)}
                    >
                      <Trash size={16} aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
