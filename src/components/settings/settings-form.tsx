"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Buildings,
  Database,
  Envelope,
  FilePdf,
  PaperPlaneTilt,
  Pulse,
  Sliders,
  Storefront,
  type Icon,
} from "@phosphor-icons/react";

import { Alert } from "@/components/ui/alert";
import { BsNavigationDrawer, BsNavigationDrawerItem } from "@brandsync/react";
import {
  CompanyPage,
  GeneralPage,
  MonitoringPage,
  ProvidersPage,
  StoragePage,
  WorkflowPage,
} from "@/components/settings/settings-pages";
import { EMAIL_PATTERN, EmailsPage } from "@/components/settings/emails-page";
import { INVOICE_TYPES, PdfPage } from "@/components/settings/pdf-page";
import { validateDesign } from "@/lib/design";
import { saveSettings, updateOrganizationFeatures } from "@/lib/store";
import { useOrganizations } from "@/lib/use-store";
import type {
  AppSettings,
  InvoiceType,
  Organization,
  OrganizationFeatures,
} from "@/lib/types";

type PageId =
  | "general"
  | "company"
  | "pdf"
  | "emails"
  | "providers"
  | "storage"
  | "workflow"
  | "monitoring";

const PAGES: { id: PageId; label: string; icon: Icon; description?: string }[] = [
  { id: "company", label: "Company profile", icon: Buildings },
  { id: "general", label: "General", icon: Sliders },
  { id: "pdf", label: "PDF invoices", icon: FilePdf },
  { id: "emails", label: "Emails", icon: Envelope },
  { id: "providers", label: "Vendor", icon: Storefront },
  { id: "storage", label: "Storage", icon: Database },
  { id: "workflow", label: "Dispatch", icon: PaperPlaneTilt },
  { id: "monitoring", label: "Monitor", icon: Pulse },
];

type Draft = { settings: AppSettings; features: OrganizationFeatures };
type Issue = {
  page: PageId;
  tab?: InvoiceType;
  field: string;
  message: string;
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(draft: Draft): Issue[] {
  const issues: Issue[] = [];
  const { company } = draft.settings;
  if (
    company.portalAddress.trim() &&
    !isValidUrl(company.portalAddress.trim())
  ) {
    issues.push({
      page: "company",
      field: "company-portal",
      message: "Enter a valid web address, like https://portal.company.com.",
    });
  }

  const { pdf } = draft.settings;
  for (const type of INVOICE_TYPES) {
    if (!pdf[type.id].active) continue;
    for (const issue of validateDesign(pdf[type.id].design, `pdf-${type.id}`)) {
      issues.push({ page: "pdf", tab: type.id, ...issue });
    }
  }

  const { email } = draft.settings;
  if (
    email.fromEmail.trim() &&
    !EMAIL_PATTERN.test(email.fromEmail.trim())
  ) {
    issues.push({
      page: "emails",
      field: "email-from",
      message: "Enter a valid email, like billing@company.com.",
    });
  }
  for (const issue of validateDesign(email.design, "email")) {
    issues.push({ page: "emails", ...issue });
  }
  return issues;
}

export function SettingsForm({
  org,
  saved,
  embedded = false,
  hiddenPages = [],
}: {
  org: Organization;
  saved: AppSettings;
  embedded?: boolean;
  hiddenPages?: PageId[];
}) {
  const [page, setPage] = useState<PageId>("company");
  const orgs = useOrganizations();
  const [draft, setDraft] = useState<Draft>({
    settings: saved,
    features: org.features,
  });
  const [attempted, setAttempted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const mounted = useRef(false);

  const issues = validate(draft);
  const visibleIssues = attempted ? issues : [];
  const errors = Object.fromEntries(
    visibleIssues.map((issue) => [issue.field, issue.message]),
  );
  const pageIssues = visibleIssues;

  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({ settings: saved, features: org.features });

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    } else {
      headingRef.current?.focus();
    }
  }, [page, focusRequest]);

  const updateSettings = (update: (settings: AppSettings) => AppSettings) => {
    setDraft((current) => ({ ...current, settings: update(current.settings) }));
  };

  const updateFeatures = (patch: Partial<OrganizationFeatures>) => {
    setDraft((current) => ({
      ...current,
      features: { ...current.features, ...patch },
    }));
  };

  const goToIssue = (issue: Issue) => {
    pendingFocus.current = issue.field;
    setPage(issue.page);
    setFocusRequest((n) => n + 1);
  };

  const undo = (previous: Draft) => {
    saveSettings(org.id, previous.settings);
    updateOrganizationFeatures(org.id, previous.features);
    setDraft(previous);
    setAnnouncement("Changes undone.");
  };

  const autoSave = () => {
    if (!dirty) return;
    if (issues.length > 0) {
      setAttempted(true);
      return;
    }
    const previous: Draft = { settings: saved, features: org.features };
    if (!saveSettings(org.id, draft.settings)) {
      setSaveFailed(true);
      setAnnouncement("Settings could not be saved.");
      return;
    }
    updateOrganizationFeatures(org.id, draft.features);
    setAttempted(false);
    setSaveFailed(false);
    setAnnouncement("Settings saved.");
    toast.success("Settings saved", {
      action: { label: "Undo", onClick: () => undo(previous) },
    });
  };

  const autoSaveRef = useRef(autoSave);
  useEffect(() => {
    autoSaveRef.current = autoSave;
  });

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => autoSaveRef.current(), 600);
    return () => window.clearTimeout(timer);
  }, [draft, dirty]);

  // Flush a pending change when the form closes.
  useEffect(() => () => autoSaveRef.current(), []);

  const current = PAGES.find((p) => p.id === page)!;

  const Root = embedded ? "div" : "main";

  return (
    <Root
      className={
        embedded
          ? "bs-page bg-transparent!"
          : "bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8"
      }
    >
      <div
        className={
          embedded
            ? "grid min-h-[calc(min(800px,92vh)-10rem)] w-full grid-cols-[13rem_minmax(0,1fr)] items-start gap-x-6 gap-y-4"
            : "flex w-full max-w-[var(--app-max-width)] flex-col gap-6"
        }
      >
        <a
          href="#settings-content"
          className="bs-link sr-only focus:not-sr-only"
          onClick={(event) => {
            event.preventDefault();
            headingRef.current?.focus();
          }}
        >
          Skip to settings content
        </a>

        {!embedded && (
          <div className="flex flex-col gap-1">
            <h1 className="bs-h1">Settings</h1>
          </div>
        )}

        <div className={embedded ? "col-start-1 row-start-1 self-stretch" : undefined}>
          <BsNavigationDrawer className="settings-nav" aria-label="Settings pages" showLogo={false} collapsible={false}>
            {PAGES.filter((p) => !hiddenPages.includes(p.id)).map((p) => (
              <BsNavigationDrawerItem
                key={p.id}
                id={`settings-tab-${p.id}`}
                aria-controls="settings-content"
                selected={p.id === page}
                onBsSelect={() => setPage(p.id)}
              >
                <p.icon slot="icon" size={16} aria-hidden="true" />
                {p.label}
              </BsNavigationDrawerItem>
            ))}
          </BsNavigationDrawer>
        </div>

        <div
          className={
            embedded
              ? "col-start-2 row-start-1 flex flex-col gap-6"
              : "flex flex-col gap-6"
          }
        >
          <div
            id="settings-content"
            role="tabpanel"
            aria-labelledby={`settings-tab-${page}`}
            className="flex min-w-0 flex-col gap-6"
          >
            {pageIssues.length > 0 && (
              <Alert
                variant="error"
                title={`Fix ${pageIssues.length} ${pageIssues.length === 1 ? "thing" : "things"} before saving`}
              >
                <ul className="mt-1 list-disc pl-5">
                  {pageIssues.map((issue) => (
                    <li key={issue.field}>
                      <a
                        href={`#${issue.field}`}
                        className="bs-link"
                        onClick={(event) => {
                          event.preventDefault();
                          goToIssue(issue);
                        }}
                      >
                        {PAGES.find((p) => p.id === issue.page)?.label}
                        {issue.tab &&
                          ` (${INVOICE_TYPES.find((t) => t.id === issue.tab)?.label})`}
                        : {issue.message}
                      </a>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {saveFailed && (
              <Alert variant="error" title="Settings could not be saved">
                Your browser has no storage left. Remove some uploaded images,
                then select Save again.
              </Alert>
            )}

            <div>
              <h2 ref={headingRef} tabIndex={-1} className="bs-h3 outline-none">
                {current.label}
              </h2>
              {current.description && (
                <p className="bs-body-sm bs-text-secondary">{current.description}</p>
              )}
            </div>

            <div className="settings-pane">
              {page === "general" && (
                <GeneralPage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                />
              )}
              {page === "company" && (
                <CompanyPage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                />
              )}
              {page === "pdf" && (
                <PdfPage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                  onAnnounce={setAnnouncement}
                />
              )}
              {page === "emails" && (
                <EmailsPage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                  onAnnounce={setAnnouncement}
                />
              )}
              {page === "providers" && (
                <ProvidersPage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                  vendors={orgs.map((o) => o.name)}
                />
              )}
              {page === "storage" && (
                <StoragePage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                />
              )}
              {page === "workflow" && (
                <WorkflowPage
                  settings={draft.settings}
                  features={draft.features}
                  onChange={updateSettings}
                  onFeaturesChange={updateFeatures}
                  onAnnounce={setAnnouncement}
                />
              )}
              {page === "monitoring" && (
                <MonitoringPage
                  settings={draft.settings}
                  errors={errors}
                  onChange={updateSettings}
                />
              )}
            </div>
          </div>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {announcement}
        </div>
      </div>
    </Root>
  );
}
