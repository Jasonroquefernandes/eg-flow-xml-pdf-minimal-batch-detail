"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadSimple as UploadCloud } from "@phosphor-icons/react";

import { BsButton } from "@brandsync/react";
import { Dialog } from "@/components/ui/dialog";
import { Dropzone, FileItem } from "@/components/ui/file-upload";
import { createManualBatch } from "@/lib/store";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessInvoiceCount(xml: string): number {
  const matches = xml.match(/<invoice\b/gi);
  return matches ? matches.length : 1;
}

function guessEmail(xml: string): string {
  const match = xml.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0] : "customer@unknown.example";
}

export function UploadBatchDialog({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [invoiceCount, setInvoiceCount] = useState(1);

  const reset = useCallback(() => {
    setFile(null);
    setEmail("");
    setInvoiceCount(1);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const handleFile = useCallback(async (candidate: File | undefined | null) => {
    if (!candidate) return;
    const isXml =
      candidate.type === "text/xml" ||
      candidate.type === "application/xml" ||
      candidate.name.toLowerCase().endsWith(".xml");

    if (!isXml) {
      toast.error("Unsupported file type", {
        description: "Only .xml files can be uploaded.",
      });
      return;
    }

    const text = await candidate.text();
    setFile(candidate);
    setInvoiceCount(guessInvoiceCount(text));
    setEmail(guessEmail(text));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!file) return;

    const batch = createManualBatch({
      organizationId,
      invoiceCount,
      customerEmail: email,
    });
    toast.success("Batch uploaded", {
      description: `${batch.id} is ready to render — start rendering when ready.`,
    });
    closeDialog();
    router.push(`/batches/${batch.id}`);
  }, [file, email, invoiceCount, organizationId, closeDialog, router]);

  return (
    <div className="shrink-0">
      <BsButton variant="primary" size="sm" onClick={() => setOpen(true)}>
        <UploadCloud slot="icon" size={16} aria-hidden="true" />
        Upload file
      </BsButton>

      <Dialog
        open={open}
        onClose={closeDialog}
        title="Upload file"
        description="Upload an XML file containing the invoices you want to process."
        actions={
          <button
            type="button"
            className="bs-btn bs-btn--primary w-full"
            disabled={!file}
            onClick={handleSubmit}
          >
            <UploadCloud size={16} aria-hidden="true" />
            Upload batch
          </button>
        }
      >
        {file ? (
          <>
            <FileItem
              name={file.name}
              meta={`${formatBytes(file.size)} · ${invoiceCount} invoice${
                invoiceCount === 1 ? "" : "s"
              } detected`}
              onRemove={reset}
            />
            <p className="sr-only" role="status">
              {file.name} selected
            </p>
          </>
        ) : (
          <Dropzone
            accept=".xml,text/xml,application/xml"
            title="Upload XML file"
            constraints="Drag an .xml file here, or click to browse."
            onFile={handleFile}
          />
        )}
      </Dialog>
    </div>
  );
}
