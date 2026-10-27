"use client";

import { useRef, useState } from "react";
import { FileCode, Trash, UploadSimple, X } from "@phosphor-icons/react";

import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  TEMPLATE_ACCEPT_CSS,
  TEMPLATE_ACCEPT_HTML,
  isAllowedImage,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import type { StoredImage, StoredTemplate } from "@/lib/types";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

function readFile(file: File, as: "dataUrl" | "text"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    if (as === "dataUrl") reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

function measureImage(
  dataUrl: string,
): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve(
        img.naturalWidth && img.naturalHeight
          ? { width: img.naturalWidth, height: img.naturalHeight }
          : {},
      );
    img.onerror = () => resolve({});
    img.src = dataUrl;
  });
}

async function loadImage(file: File): Promise<StoredImage> {
  const dataUrl = await readFile(file, "dataUrl");
  return {
    name: file.name,
    dataUrl,
    size: file.size,
    ...(await measureImage(dataUrl)),
  };
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateImage(file: File): string | undefined {
  if (!isAllowedImage(file))
    return "This file is not a PNG, SVG or JPG. Choose a different image.";
  if (file.size > IMAGE_MAX_BYTES)
    return "This image is over 2 MB. Choose a smaller image.";
}

function FilePicker({
  id,
  accept,
  uploadLabel,
  replaceLabel,
  fileName,
  preview,
  removeLabel,
  controlProps,
  error,
  onPick,
  onRemove,
}: {
  id: string;
  accept: string;
  uploadLabel: string;
  replaceLabel: string;
  fileName?: string;
  preview?: React.ReactNode;
  removeLabel: string;
  controlProps: Omit<ControlProps, "id">;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const describedBy = [
    controlProps["aria-describedby"],
    `${id}-status`,
    error && `${id}-upload-error`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="peer sr-only"
          aria-describedby={describedBy}
          aria-invalid={
            controlProps["aria-invalid"] || (error ? true : undefined)
          }
          aria-required={controlProps["aria-required"]}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPick(file);
          }}
        />
        <label
          htmlFor={id}
          aria-hidden="true"
          className="bs-btn bs-btn--outline bs-btn--sm cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--bs-border-neutral-focus)]"
        >
          <UploadSimple aria-hidden="true" />
          {fileName ? replaceLabel : uploadLabel}
        </label>
        {fileName && preview}
        <span
          id={`${id}-status`}
          className="bs-body-sm min-w-0 truncate text-[var(--bs-text-secondary)]"
        >
          {fileName ?? "No file added"}
        </span>
        {fileName && (
          <button
            type="button"
            className="bs-btn bs-btn--ghost bs-btn--icon bs-btn--sm"
            aria-label={removeLabel}
            onClick={() => {
              onRemove();
              inputRef.current?.focus();
            }}
          >
            <Trash aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-upload-error`} role="alert" className="bs-error-msg">
          {error}
        </span>
      )}
    </div>
  );
}

export function ImageUpload({
  controlProps,
  value,
  onChange,
  onAnnounce,
  label,
  error,
}: {
  controlProps: ControlProps;
  value?: StoredImage;
  onChange: (image: StoredImage | undefined) => void;
  onAnnounce: (message: string) => void;
  label: string;
  error?: string;
}) {
  const { id, ...rest } = controlProps;
  const [uploadError, setUploadError] = useState<string>();

  const pick = async (file: File) => {
    if (!isAllowedImage(file)) {
      setUploadError(
        "This file is not a PNG, SVG or JPG. Choose a different image.",
      );
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setUploadError("This image is over 2 MB. Choose a smaller image.");
      return;
    }
    setUploadError(undefined);
    try {
      onChange(await loadImage(file));
      onAnnounce(`Added ${file.name} as the ${label.toLowerCase()}.`);
    } catch {
      setUploadError(
        "This file could not be read. Try again or choose a different image.",
      );
    }
  };

  return (
    <FilePicker
      id={id}
      accept={IMAGE_ACCEPT}
      uploadLabel="Upload image"
      replaceLabel="Replace image"
      fileName={value?.name}
      preview={
        value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.dataUrl}
            alt=""
            className="size-8 rounded object-contain"
          />
        )
      }
      removeLabel={value ? `Remove ${value.name}` : "Remove image"}
      controlProps={rest}
      error={uploadError ?? error}
      onPick={pick}
      onRemove={() => {
        onChange(undefined);
        onAnnounce(`Removed ${value?.name ?? "image"}.`);
      }}
    />
  );
}

export function TemplateUpload({
  controlProps,
  kind,
  value,
  onChange,
  onAnnounce,
}: {
  controlProps: ControlProps;
  kind: "html" | "css";
  value?: StoredTemplate;
  onChange: (template: StoredTemplate | undefined) => void;
  onAnnounce: (message: string) => void;
}) {
  const { id, ...rest } = controlProps;
  const [uploadError, setUploadError] = useState<string>();
  const extension = kind === "html" ? /\.html?$/i : /\.css$/i;

  const pick = async (file: File) => {
    if (!extension.test(file.name)) {
      setUploadError(
        kind === "html"
          ? "This file is not an HTML file. Choose a .html file."
          : "This file is not a CSS file. Choose a .css file.",
      );
      return;
    }
    setUploadError(undefined);
    try {
      onChange({ name: file.name, content: await readFile(file, "text") });
      onAnnounce(`Added ${file.name} as the ${kind.toUpperCase()} template.`);
    } catch {
      setUploadError(
        "This file could not be read. Try again or choose a different file.",
      );
    }
  };

  return (
    <FilePicker
      id={id}
      accept={kind === "html" ? TEMPLATE_ACCEPT_HTML : TEMPLATE_ACCEPT_CSS}
      uploadLabel={`Upload ${kind.toUpperCase()} file`}
      replaceLabel={`Replace ${kind.toUpperCase()} file`}
      fileName={value?.name}
      preview={
        <FileCode
          aria-hidden="true"
          className="size-5 text-[var(--bs-icon-muted)]"
        />
      }
      removeLabel={
        value ? `Remove ${value.name}` : `Remove ${kind.toUpperCase()} file`
      }
      controlProps={rest}
      error={uploadError}
      onPick={pick}
      onRemove={() => {
        onChange(undefined);
        onAnnounce(`Removed ${value?.name ?? `${kind.toUpperCase()} file`}.`);
      }}
    />
  );
}

export function ImageDropzone({
  id,
  title,
  value,
  disabled,
  compact,
  error,
  controlProps,
  onChange,
  onAnnounce,
}: {
  id: string;
  title: string;
  value?: StoredImage;
  disabled?: boolean;
  compact?: boolean;
  error?: string;
  controlProps: Omit<ControlProps, "id">;
  onChange: (image: StoredImage | undefined) => void;
  onAnnounce: (message: string) => void;
}) {
  const [uploadError, setUploadError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shownError = uploadError ?? error;
  const describedBy = [
    controlProps["aria-describedby"],
    `${id}-help`,
    `${id}-status`,
    shownError && `${id}-upload-error`,
  ]
    .filter(Boolean)
    .join(" ");

  const pick = async (file: File) => {
    const problem = validateImage(file);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError(undefined);
    try {
      onChange(await loadImage(file));
      onAnnounce(`Added ${file.name} as the ${title.toLowerCase()}.`);
    } catch {
      setUploadError(
        "This file could not be read. Try again or choose a different image.",
      );
    }
  };

  const meta = value
    ? [
        value.size ? formatSize(value.size) : null,
        value.width && value.height ? `${value.width} × ${value.height}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !disabled) void pick(file);
        }}
        className={cn(
          value && "hidden",
          "rounded-[var(--bs-border-radius-100)] border border-dashed border-[var(--bs-border-default)] bg-[var(--bs-surface-subtle,transparent)]",
          dragging &&
            "border-[var(--bs-color-primary-default)] bg-[var(--bs-color-primary-container)]",
          shownError && "border-[var(--bs-border-error)]",
          disabled && "opacity-50",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={IMAGE_ACCEPT}
          disabled={disabled}
          className="peer sr-only"
          aria-describedby={describedBy}
          aria-invalid={
            controlProps["aria-invalid"] || (shownError ? true : undefined)
          }
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pick(file);
          }}
        />
        <label
          htmlFor={id}
          className={cn(
            "flex rounded-[inherit] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--bs-border-neutral-focus)]",
            compact
              ? "flex-row items-center gap-3 px-3 py-2.5 text-left"
              : "flex-col items-center gap-1 px-4 py-5 text-center",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <UploadSimple
            size={compact ? 20 : 24}
            aria-hidden="true"
            className="text-[var(--bs-icon-muted)]"
          />
          <span
            className={cn("flex min-w-0 flex-col", !compact && "items-center")}
          >
            <span className="bs-label">
              {value ? "Replace" : "Upload"} {title.toLowerCase()}
            </span>
            <span id={`${id}-help`} className="bs-helper">
              PNG, SVG or JPG, up to 2 MB.
            </span>
          </span>
        </label>
      </div>
      <p id={`${id}-status`} className="sr-only">
        {value ? `${value.name} added.` : "No file added."}
      </p>
      {value && (
        <div className="flex items-center gap-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] p-2">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--bs-static-white)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.dataUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="bs-label truncate">{value.name}</span>
            {meta && <span className="bs-helper">{meta}</span>}
          </span>
          <button
            type="button"
            className="bs-btn bs-btn--ghost bs-btn--icon bs-btn--sm"
            aria-label={`Remove ${value.name}`}
            onClick={() => {
              onChange(undefined);
              onAnnounce(`Removed ${value.name}.`);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
      {shownError && (
        <span id={`${id}-upload-error`} role="alert" className="bs-error-msg">
          {shownError}
        </span>
      )}
    </div>
  );
}

export function TemplateDropzone({
  id,
  kind,
  value,
  error,
  controlProps,
  onChange,
  onAnnounce,
}: {
  id: string;
  kind: "html" | "css";
  value?: StoredTemplate;
  error?: string;
  controlProps: Omit<ControlProps, "id">;
  onChange: (template: StoredTemplate | undefined) => void;
  onAnnounce: (message: string) => void;
}) {
  const [uploadError, setUploadError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const extension = kind === "html" ? /\.html?$/i : /\.css$/i;
  const upper = kind.toUpperCase();
  const shownError = uploadError ?? error;
  const describedBy = [
    controlProps["aria-describedby"],
    `${id}-help`,
    `${id}-status`,
    shownError && `${id}-upload-error`,
  ]
    .filter(Boolean)
    .join(" ");

  const pick = async (file: File) => {
    if (!extension.test(file.name)) {
      setUploadError(
        kind === "html"
          ? "This file is not an HTML file. Choose a .html file."
          : "This file is not a CSS file. Choose a .css file.",
      );
      return;
    }
    setUploadError(undefined);
    try {
      onChange({ name: file.name, content: await readFile(file, "text") });
      onAnnounce(`Added ${file.name} as the ${upper} template.`);
    } catch {
      setUploadError(
        "This file could not be read. Try again or choose a different file.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void pick(file);
        }}
        className={cn(
          value && "hidden",
          "rounded-[var(--bs-border-radius-100)] border border-dashed border-[var(--bs-border-default)]",
          dragging &&
            "border-[var(--bs-color-primary-default)] bg-[var(--bs-color-primary-container)]",
          shownError && "border-[var(--bs-border-error)]",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={kind === "html" ? TEMPLATE_ACCEPT_HTML : TEMPLATE_ACCEPT_CSS}
          className="peer sr-only"
          aria-describedby={describedBy}
          aria-invalid={
            controlProps["aria-invalid"] || (shownError ? true : undefined)
          }
          aria-required={controlProps["aria-required"]}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pick(file);
          }}
        />
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-row items-center gap-3 rounded-[inherit] px-3 py-2.5 text-left peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--bs-border-neutral-focus)]"
        >
          <UploadSimple
            size={20}
            aria-hidden="true"
            className="shrink-0 text-[var(--bs-icon-muted)]"
          />
          <span className="flex min-w-0 flex-col">
            <span className="bs-label">
              {value ? "Replace" : "Upload"} {upper} file
            </span>
            <span id={`${id}-help`} className="bs-helper">
              {kind === "html" ? ".html or .htm file" : ".css file"}
            </span>
          </span>
        </label>
      </div>
      <p id={`${id}-status`} className="sr-only">
        {value ? `${value.name} added.` : "No file added."}
      </p>
      {value && (
        <div className="flex items-center gap-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] p-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded bg-[var(--bs-color-primary-container)] text-[var(--bs-color-primary-default)]">
            <FileCode size={20} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="bs-label truncate">{value.name}</span>
            <span className="bs-helper">
              {formatSize(new Blob([value.content]).size)}
            </span>
          </span>
          <button
            type="button"
            className="bs-btn bs-btn--ghost bs-btn--icon bs-btn--sm"
            aria-label={`Remove ${value.name}`}
            onClick={() => {
              onChange(undefined);
              onAnnounce(`Removed ${value.name}.`);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
      {shownError && (
        <span id={`${id}-upload-error`} role="alert" className="bs-error-msg">
          {shownError}
        </span>
      )}
    </div>
  );
}
