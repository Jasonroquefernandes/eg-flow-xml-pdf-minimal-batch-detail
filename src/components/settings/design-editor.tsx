"use client";

import { useState } from "react";
import {
  Check,
  DownloadSimple,
  Eye,
  FileHtml,
  PencilSimple,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";

import { ImageDropzone } from "@/components/settings/file-controls";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { detectImageTags } from "@/lib/design";
import type { DesignSettings, StoredImage, StoredTemplate } from "@/lib/types";

type Errors = Record<string, string | undefined>;
type UpdateDesign = (
  update: (design: DesignSettings) => DesignSettings,
) => void;

function GroupHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h4 id={id} className="bs-h4">
        {title}
      </h4>
      <p className="bs-body-sm bs-text-secondary">{description}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function templateMeta(template: StoredTemplate): string {
  const size = formatBytes(new Blob([template.content]).size);
  if (!template.uploadedAt) return `HTML template • ${size}`;
  const date = new Date(template.uploadedAt).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Uploaded ${date} • ${size}`;
}

function viewTemplate(template: StoredTemplate) {
  const url = URL.createObjectURL(
    new Blob([template.content], { type: "text/html" }),
  );
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadTemplate(template: StoredTemplate) {
  const url = URL.createObjectURL(
    new Blob([template.content], { type: "text/html" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = template.name;
  link.click();
  URL.revokeObjectURL(url);
}

function ModeSwitch({
  idPrefix,
  design,
  onChange,
}: {
  idPrefix: string;
  design: DesignSettings;
  onChange: UpdateDesign;
}) {
  const options = [
    { value: "standard", label: "Standard" },
    { value: "custom", label: "Custom" },
  ] as const;
  return (
    <fieldset>
      <legend className="sr-only">Design type</legend>
      <div className="inline-flex gap-1 rounded-[var(--bs-border-radius-150)] bg-[var(--bs-color-neutral-container)] p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-[var(--bs-border-radius-100)] px-5 py-2 text-sm font-medium text-[var(--bs-text-secondary)] has-[:checked]:bg-[var(--bs-surface-raised)] has-[:checked]:text-[var(--bs-text-default)] has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--bs-border-neutral-focus)]"
          >
            <input
              type="radio"
              name={`${idPrefix}-mode`}
              value={option.value}
              checked={design.mode === option.value}
              onChange={() => onChange((d) => ({ ...d, mode: option.value }))}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function DesignEditor({
  idPrefix,
  typeLabel,
  design,
  errors,
  onChange,
  onAnnounce,
  standardPreview,
}: {
  idPrefix: string;
  typeLabel: string;
  design: DesignSettings;
  errors: Errors;
  onChange: UpdateDesign;
  onAnnounce: (message: string) => void;
  standardPreview?: { href: string; fileName: string; downloadHref: string };
}) {
  const tags = detectImageTags(design.template);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const html = design.template.html;
  const htmlId = `${idPrefix}-template-html`;
  const shownError = uploadError ?? errors[htmlId];
  // Stay open when something needs fixing so the problem is visible.
  const hasError = Object.keys(errors).some(
    (key) => key.startsWith(`${idPrefix}-template-`) || key.startsWith(`${idPrefix}-tag-`),
  );
  const open = expanded || hasError || Boolean(uploadError);
  const pickTemplate = async (file: File) => {
    if (!/\.html?$/i.test(file.name)) {
      setUploadError("This file is not an HTML file. Choose a .html file.");
      return;
    }
    setUploadError(undefined);
    try {
      const content = await file.text();
      onChange((d) => ({
        ...d,
        template: {
          ...d.template,
          html: { name: file.name, content, uploadedAt: new Date().toISOString() },
        },
      }));
      onAnnounce(`Added ${file.name} as the HTML template.`);
    } catch {
      setUploadError(
        "This file could not be read. Try again or choose a different file.",
      );
    }
  };
  const setTagImage = (tag: string, image: StoredImage | undefined) =>
    onChange((d) => {
      const existing = d.assets.find((asset) => asset.tag === tag);
      if (!image)
        return { ...d, assets: d.assets.filter((asset) => asset.tag !== tag) };
      if (existing) {
        return {
          ...d,
          assets: d.assets.map((asset) =>
            asset.tag === tag ? { ...asset, image } : asset,
          ),
        };
      }
      return {
        ...d,
        assets: [...d.assets, { id: crypto.randomUUID(), tag, image }],
      };
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <GroupHeader
          id={`${idPrefix}-mode-heading`}
          title={
            typeLabel === "Email"
              ? "Email design"
              : `${typeLabel} invoice`
          }
          description="Use the standard layout or upload a custom design."
        />
        <div className="flex shrink-0 items-center gap-2">
          {(
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`${idPrefix}-custom-files`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 border-transparent hover:border-transparent text-[var(--bs-text-default)]" })}
              onClick={() => setExpanded((value) => !value)}
            >
              {open ? <Check size={16} aria-hidden="true" /> : <PencilSimple size={16} aria-hidden="true" />}
              {open ? "Done" : "Edit"}
            </button>
          )}
          <ModeSwitch idPrefix={idPrefix} design={design} onChange={onChange} />
        </div>
      </div>

      {design.mode === "standard" ? (
        standardPreview && (
          <div
            id={`${idPrefix}-custom-files`}
            hidden={!open}
            className="flex flex-col gap-4 rounded-[var(--bs-border-radius-150)] bg-[var(--bs-neutral-25)] p-4 [--bs-surface-subtle:var(--bs-surface-raised)]"
          >
          <section className="flex flex-col gap-2" aria-label="HTML template">
          <h5 className="bs-label">Template</h5>
          <div className="flex items-center gap-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-raised)] p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--bs-border-radius-100)] bg-[var(--bs-neutral-25)] text-[var(--bs-icon-default)]">
              <FileHtml size={20} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="bs-label truncate">{standardPreview.fileName}</span>
              <span className="bs-helper">Built-in template • Read only</span>
            </span>
            <div className="flex items-center gap-1">
              <Tooltip label="View file">
                <a
                  href={standardPreview.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View the standard ${typeLabel.toLowerCase()} template (opens in a new tab)`}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                >
                  <Eye size={18} aria-hidden="true" />
                </a>
              </Tooltip>
              <Tooltip label="Download file">
                <a
                  href={standardPreview.downloadHref}
                  download={standardPreview.fileName}
                  aria-label={`Download the standard ${typeLabel.toLowerCase()} template`}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                >
                  <DownloadSimple size={18} aria-hidden="true" />
                </a>
              </Tooltip>
              <Tooltip label="Built-in files can't be removed">
                <button
                  type="button"
                  disabled
                  aria-label="Remove unavailable for the built-in template"
                  className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)] opacity-40 cursor-not-allowed" })}
                >
                  <Trash size={18} aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          </div>
          </section>
          </div>
        )
      ) : (
        <>
        <div
          id={`${idPrefix}-custom-files`}
          hidden={!open}
          className="flex flex-col gap-4 rounded-[var(--bs-border-radius-150)] bg-[var(--bs-neutral-25)] p-4 [--bs-surface-subtle:var(--bs-surface-raised)]"
        >
          <section className="flex flex-col gap-2" aria-label="HTML template">
            <h5 className="bs-label">Template</h5>
            <input
              id={htmlId}
              type="file"
              accept=".html,.htm,text/html"
              className="peer sr-only"
              aria-describedby={shownError ? `${htmlId}-error` : undefined}
              aria-invalid={shownError ? true : undefined}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void pickTemplate(file);
              }}
            />
            {html ? (
              <div className="flex items-center gap-3 rounded-[var(--bs-border-radius-100)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-raised)] p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--bs-border-radius-100)] bg-[var(--bs-neutral-25)] text-[var(--bs-icon-default)]">
                  <FileHtml size={20} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="bs-label truncate">{html.name}</span>
                  <span className="bs-helper">{templateMeta(html)}</span>
                </span>
                <div className="flex items-center gap-1">
                  <Tooltip label="View file">
                    <button
                      type="button"
                      aria-label={`View ${html.name}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                      onClick={() => viewTemplate(html)}
                    >
                      <Eye size={18} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Download file">
                    <button
                      type="button"
                      aria-label={`Download ${html.name}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                      onClick={() => downloadTemplate(html)}
                    >
                      <DownloadSimple size={18} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Remove file">
                    <button
                      type="button"
                      aria-label={`Remove ${html.name}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
                      onClick={() => {
                        onChange((d) => ({
                          ...d,
                          template: { ...d.template, html: undefined },
                        }));
                        onAnnounce(`Removed ${html.name}.`);
                      }}
                    >
                      <Trash size={18} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <label
                htmlFor={htmlId}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) void pickTemplate(file);
                }}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-[var(--bs-border-radius-150)] border border-dashed px-4 py-6 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--bs-border-neutral-focus)] ${dragging ? "border-[var(--bs-color-primary-default)] bg-[var(--bs-color-primary-container)]" : "border-[var(--bs-border-neutral-container)] bg-[var(--bs-neutral-25)]"}`}
              >
                <UploadSimple size={24} aria-hidden="true" className="text-[var(--bs-icon-muted)]" />
                <span className="bs-label">Upload HTML file</span>
                <span className="bs-helper">Drag a .html file here, or click to browse.</span>
              </label>
            )}
            {shownError && (
              <p id={`${htmlId}-error`} role="alert" className="bs-error-msg">
                {shownError}
              </p>
            )}
          </section>

          {tags.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h5 className="bs-label">Images</h5>
                  <p className="bs-helper">Upload one image for each placeholder in your template.</p>
                </div>
                <span className="bs-helper shrink-0 rounded-full bg-[var(--bs-surface-raised)] px-2.5 py-1">
                  {tags.length === 1 ? "1 placeholder" : `${tags.length} placeholders`}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tags.map((tag) => (
                  <ImageDropzone
                    key={tag}
                    id={`${idPrefix}-tag-${tag}-image`}
                    title={`image for {{${tag}}}`}
                    compact
                    value={design.assets.find((a) => a.tag === tag)?.image}
                    error={errors[`${idPrefix}-tag-${tag}-image`]}
                    controlProps={{}}
                    onChange={(next) => setTagImage(tag, next)}
                    onAnnounce={onAnnounce}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
        </>
      )}
    </div>
  );
}
