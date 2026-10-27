"use client";

import { useRef } from "react";
import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DesignEditor } from "@/components/settings/design-editor";
import { FormField, SwitchRow } from "@/components/settings/settings-fields";
import { Section } from "@/components/settings/settings-pages";
import type {
  AppSettings,
  DesignSettings,
  EmailAttachments,
  EmailSettings,
} from "@/lib/types";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailsPage({
  settings,
  errors,
  onChange,
  onAnnounce,
}: {
  settings: AppSettings;
  errors: Record<string, string | undefined>;
  onChange: (update: (settings: AppSettings) => AppSettings) => void;
  onAnnounce: (message: string) => void;
}) {
  const { email } = settings;
  const fileInput = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<EmailSettings>) =>
    onChange((s) => ({ ...s, email: { ...s.email, ...patch } }));
  const setAttachments = (patch: Partial<EmailAttachments>) =>
    set({ attachments: { ...email.attachments, ...patch } });

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      lastModified: f.lastModified,
    }));
    setAttachments({ files: [...email.attachments.files, ...added] });
    onAnnounce(
      `${added.length} ${added.length === 1 ? "file" : "files"} added.`,
    );
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeFile = (id: string, name: string) => {
    setAttachments({
      files: email.attachments.files.filter((f) => f.id !== id),
    });
    onAnnounce(`${name} removed.`);
    document.getElementById("email-add-files")?.focus();
  };

  const att = email.attachments;

  return (
    <div className="flex min-w-0 flex-col gap-6">
        <Section>
          <DesignEditor
            idPrefix="email"
            typeLabel="Email"
            design={email.design}
            errors={errors}
            onChange={(update: (d: DesignSettings) => DesignSettings) =>
              onChange((s) => ({
                ...s,
                email: { ...s.email, design: update(s.email.design) },
              }))
            }
            onAnnounce={onAnnounce}
            standardPreview={{
              href: "/preview/email",
              fileName: "standard-email.html",
              downloadHref: "/samples/custom-email.html",
            }}
          />
        </Section>

        <Section title="Sender details">
          <div className="settings-rows flex flex-col gap-5 [&_.bs-field--inline]:grid-cols-[16rem_minmax(0,26rem)]">
            <FormField
              id="email-from"
              label="Email"
              error={errors["email-from"]}
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={email.fromEmail}
                  onChange={(e) => set({ fromEmail: e.target.value })}
                />
              )}
            </FormField>
            <FormField id="email-from-name" label="Name">
              {(props) => (
                <Input
                  {...props}
                  value={email.fromName}
                  onChange={(e) => set({ fromName: e.target.value })}
                />
              )}
            </FormField>
            <FormField
              id="email-subject"
              label="Subject"
              helper="Use {{invoice_number}} and {{vendor}} to fill in details."
              error={errors["email-subject"]}
            >
              {(props) => (
                <Input
                  {...props}
                  value={email.subject}
                  onChange={(e) => set({ subject: e.target.value })}
                />
              )}
            </FormField>
          </div>
        </Section>

        <Section>
          <SwitchRow
            id="email-attachments-enabled"
            label="Attach files to emails"
            description="Include the files you choose below with every invoice email sent to your customers."
            checked={att.enabled}
            onChange={(enabled) => setAttachments({ enabled })}
          />
          {att.enabled && (
            <fieldset className="flex flex-col gap-3">
              <legend className="bs-label mb-2">Include</legend>
              <Checkbox
                id="email-attach-pdf"
                checked={att.invoicePdf}
                onChange={(e) =>
                  setAttachments({ invoicePdf: e.target.checked })
                }
              >
                Invoice PDF
              </Checkbox>
              <Checkbox
                id="email-attach-additional"
                checked={att.additional}
                onChange={(e) =>
                  setAttachments({ additional: e.target.checked })
                }
              >
                Additional files
              </Checkbox>
              {errors["email-attach-pdf"] && (
                <span className="bs-error-msg">
                  {errors["email-attach-pdf"]}
                </span>
              )}
              {att.additional && (
                <div className="flex flex-col gap-2">
                  {att.files.length > 0 && (
                    <ul
                      aria-label="Additional files"
                      className="flex flex-col gap-1"
                    >
                      {att.files.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="bs-body-sm">{file.name}</span>
                          <Button
                            variant="ghost"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeFile(file.id, file.name)}
                          >
                            <Trash size={16} aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
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
                  <div>
                    <Button
                      id="email-add-files"
                      variant="outline"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Add files
                    </Button>
                  </div>
                  {errors["email-add-files"] && (
                    <span className="bs-error-msg">
                      {errors["email-add-files"]}
                    </span>
                  )}
                </div>
              )}
            </fieldset>
          )}
        </Section>
    </div>
  );
}
