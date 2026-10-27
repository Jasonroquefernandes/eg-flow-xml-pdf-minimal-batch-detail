"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { type Icon } from "@phosphor-icons/react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FormField, SelectRow, SwitchRow } from "@/components/settings/settings-fields";
import type {
  AppSettings,
  EmailProvider,
  Language,
  OrganizationFeatures,
  PrintProvider,
  SmsProvider,
} from "@/lib/types";

type Errors = Record<string, string | undefined>;

type PageProps = {
  settings: AppSettings;
  errors: Errors;
  onChange: (update: (settings: AppSettings) => AppSettings) => void;
};

export function Section({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  icon?: Icon;
  children: React.ReactNode;
}) {
  const id = title ? `section-${title.toLowerCase().replace(/\s+/g, "-")}` : undefined;
  return (
    <section aria-labelledby={id} className="settings-card">
      {title && (
        <div className="settings-card__header">
          <h3 id={id} className="bs-h4">
            {title}
          </h3>
          {description && (
            <p className="bs-body-sm bs-text-secondary">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-5 p-6">{children}</div>
    </section>
  );
}

const RETENTION_OPTIONS = [1, 3, 5, 7, 10];
const COUNTRIES = [
  "Denmark",
  "Finland",
  "Germany",
  "Netherlands",
  "Norway",
  "Sweden",
  "United Kingdom",
];

export function GeneralPage({ settings, onChange }: PageProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <Section>
        <div className="settings-rows flex flex-col gap-5 [&_.bs-field--inline]:grid-cols-[16rem_minmax(0,26rem)]">
          <FormField id="general-theme" label="Theme">
            {(props) => (
              <Select
                {...props}
                value={theme ?? "system"}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </Select>
            )}
          </FormField>
          <FormField id="general-language" label="Language">
            {(props) => (
              <Select
                {...props}
                value={settings.language}
                onChange={(e) =>
                  onChange((s) => ({
                    ...s,
                    language: e.target.value as Language,
                  }))
                }
              >
                <option value="en">English</option>
                <option value="da">Dansk</option>
              </Select>
            )}
          </FormField>
        </div>
      </Section>
    </div>
  );
}

export function CompanyPage({ settings, errors, onChange }: PageProps) {
  const { company } = settings;
  const set = (patch: Partial<AppSettings["company"]>) =>
    onChange((s) => ({ ...s, company: { ...s.company, ...patch } }));

  return (
    <div className="flex flex-col gap-6">
      <Section>
        <div className="settings-rows flex flex-col gap-5 [&_.bs-field--inline]:grid-cols-[16rem_minmax(0,26rem)]">
          <FormField
            id="company-name"
            label="Company name"
            error={errors["company-name"]}
          >
            {(props) => (
              <Input
                {...props}
                placeholder="Enter company name"
                value={company.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            id="company-registration"
            label="Registration number"
            error={errors["company-registration"]}
          >
            {(props) => (
              <Input
                {...props}
                placeholder="Enter registration number"
                value={company.registrationNumber}
                onChange={(e) => set({ registrationNumber: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            id="company-portal"
            label="Portal address"
            helper="The web address customers use to view their invoices."
            error={errors["company-portal"]}
          >
            {(props) => (
              <Input
                {...props}
                type="url"
                placeholder="https://portal.company.com"
                value={company.portalAddress}
                onChange={(e) => set({ portalAddress: e.target.value })}
              />
            )}
          </FormField>
        </div>
      </Section>

      <Section title="Address">
        <div className="settings-rows flex flex-col gap-5 [&_.bs-field--inline]:grid-cols-[16rem_minmax(0,26rem)]">
          <FormField
            id="company-street"
            label="Street"
            error={errors["company-street"]}
          >
            {(props) => (
              <Input
                {...props}
                placeholder="Enter street address"
                value={company.street}
                onChange={(e) => set({ street: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            id="company-city"
            label="City"
            error={errors["company-city"]}
          >
            {(props) => (
              <Input
                {...props}
                placeholder="Enter city"
                value={company.city}
                onChange={(e) => set({ city: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            id="company-postal"
            label="Postal code"
            error={errors["company-postal"]}
          >
            {(props) => (
              <Input
                {...props}
                placeholder="Enter postal code"
                value={company.postalCode}
                onChange={(e) => set({ postalCode: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            id="company-country"
            label="Country"
            error={errors["company-country"]}
          >
            {(props) => (
              <Select
                {...props}
                value={company.country}
                onChange={(e) => set({ country: e.target.value })}
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      </Section>
    </div>
  );
}

export function StoragePage({ settings, onChange }: PageProps) {
  const { company } = settings;
  return (
    <div className="flex flex-col gap-6">
      <Section>
        <SelectRow
          id="company-retention"
          label="Keep data for"
          description="Older data is permanently deleted and cannot be restored."
        >
          {(props) => (
            <Select
              {...props}
              value={company.retentionYears}
              onChange={(e) =>
                onChange((s) => ({
                  ...s,
                  company: {
                    ...s.company,
                    retentionYears: Number(e.target.value),
                  },
                }))
              }
            >
              {RETENTION_OPTIONS.map((years) => (
                <option key={years} value={years}>
                  {years} {years === 1 ? "year" : "years"}
                </option>
              ))}
            </Select>
          )}
        </SelectRow>
      </Section>
    </div>
  );
}

export function ProvidersPage({
  settings,
  onChange,
  vendors,
}: PageProps & { vendors: string[] }) {
  const setVendor = (vendor: string) =>
    onChange((s) => ({ ...s, company: { ...s.company, vendor } }));

  return (
    <div className="flex flex-col gap-6">
      <Section>
        <SelectRow
          id="company-vendor"
          label="Vendor"
          description="The system your invoice XML files come from."
        >
          {(props) => (
            <Select
              {...props}
              value={settings.company.vendor}
              onChange={(e) => setVendor(e.target.value)}
            >
              <option value="">Select a vendor</option>
              {vendors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </SelectRow>
      </Section>
    </div>
  );
}

const REVIEW_OPTIONS = [
  {
    value: true,
    id: "workflow-review-manual",
    title: "Manual review",
    description: "Uploaded files wait for approval before going to customers.",
  },
  {
    value: false,
    id: "workflow-review-auto",
    title: "Automatic dispatch",
    description: "Files go to customers immediately after rendering.",
  },
];

export function WorkflowPage({
  settings,
  features,
  onChange,
  onFeaturesChange,
  onAnnounce,
}: Omit<PageProps, "errors"> & {
  features: OrganizationFeatures;
  onFeaturesChange: (patch: Partial<OrganizationFeatures>) => void;
  onAnnounce: (message: string) => void;
}) {
  const [confirmingAuto, setConfirmingAuto] = useState(false);
  const { providers } = settings;
  const setProviders = (patch: Partial<AppSettings["providers"]>) =>
    onChange((s) => ({ ...s, providers: { ...s.providers, ...patch } }));

  const focusReviewOption = (id: string) =>
    requestAnimationFrame(() => document.getElementById(id)?.focus());

  const chooseReview = (manual: boolean) => {
    if (manual) {
      onFeaturesChange({ review: true });
      setConfirmingAuto(false);
      onAnnounce("Manual review selected.");
    } else if (features.review) {
      setConfirmingAuto(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Section>
        <fieldset className="flex items-start justify-between gap-4 py-3">
          <legend className="sr-only">Review before dispatch</legend>
          <div className="min-w-0">
            <p className="bs-h4">Batch review</p>
            <p className="bs-body-sm bs-text-secondary">
              Choose when uploaded batches can be sent to customers.
            </p>
          </div>
          <div className="inline-flex shrink-0 gap-1 rounded-[var(--bs-border-radius-150)] bg-[var(--bs-color-neutral-container)] p-1">
            {REVIEW_OPTIONS.map((option) => (
              <label
                key={option.id}
                htmlFor={option.id}
                className="cursor-pointer rounded-[var(--bs-border-radius-100)] px-5 py-2 text-sm font-medium text-[var(--bs-text-secondary)] has-[:checked]:bg-[var(--bs-surface-raised)] has-[:checked]:text-[var(--bs-text-default)] has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--bs-border-neutral-focus)]"
              >
                <input
                  type="radio"
                  id={option.id}
                  name="workflow-review"
                  className="sr-only"
                  checked={option.value === features.review}
                  onChange={() => chooseReview(option.value)}
                />
                {option.value ? "Manual" : "Automatic"}
              </label>
            ))}
          </div>
        </fieldset>
        {confirmingAuto && (
          <Alert variant="warning" title="Turn on automatic dispatch?">
            <p className="bs-body-sm">
              Files will go to customers without approval. You can switch back
              to manual review at any time.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  onFeaturesChange({ review: false });
                  setConfirmingAuto(false);
                  onAnnounce("Automatic dispatch selected.");
                  focusReviewOption("workflow-review-auto");
                }}
              >
                Turn on automatic dispatch
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmingAuto(false);
                  focusReviewOption("workflow-review-manual");
                }}
              >
                Keep manual review
              </Button>
            </div>
          </Alert>
        )}
      </Section>

      <Section
        title="Delivery providers"
        description="Select a provider for each delivery channel."
      >
        <div className="flex flex-col divide-y divide-[var(--bs-border-default)]">
          <SelectRow
            id="providers-email"
            label="Email"
          >
            {(props) => (
              <Select
                {...props}
                value={providers.email}
                onChange={(e) =>
                  setProviders({ email: e.target.value as EmailProvider })
                }
              >
                <option value="sendgrid">SendGrid</option>
                <option value="ses">Amazon SES</option>
                <option value="smtp">SMTP</option>
              </Select>
            )}
          </SelectRow>
          <SelectRow
            id="providers-print"
            label="Print & mail"
          >
            {(props) => (
              <Select
                {...props}
                value={providers.print}
                onChange={(e) =>
                  setProviders({ print: e.target.value as PrintProvider })
                }
              >
                <option value="none">None</option>
                <option value="postnord">PostNord Print</option>
                <option value="doc2mail">Doc2Mail</option>
              </Select>
            )}
          </SelectRow>
          <SelectRow
            id="providers-sms"
            label="SMS"
          >
            {(props) => (
              <Select
                {...props}
                value={providers.sms}
                onChange={(e) =>
                  setProviders({ sms: e.target.value as SmsProvider })
                }
              >
                <option value="none">None</option>
                <option value="twilio">Twilio</option>
                <option value="gatewayapi">GatewayAPI</option>
              </Select>
            )}
          </SelectRow>
        </div>
      </Section>
    </div>
  );
}

export function MonitoringPage({ settings, onChange }: PageProps) {
  const { monitoring } = settings;
  const setMonitoring = (patch: Partial<AppSettings["monitoring"]>) =>
    onChange((s) => {
      const next = { ...s.monitoring, ...patch };
      // Tracking is on whenever at least one event is recorded.
      return {
        ...s,
        monitoring: { ...next, track: next.opened || next.read || next.clicked },
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <Section>
        <div className="divide-y divide-[var(--bs-border-default)]">
          <SwitchRow
            id="monitoring-opened"
            label="Opened"
            description="Record when a customer opens the email."
            checked={monitoring.opened}
            onChange={(opened) => setMonitoring({ opened })}
          />
          <SwitchRow
            id="monitoring-read"
            label="Read"
            description="Record when a customer views the invoice itself, not just the email."
            checked={monitoring.read}
            onChange={(read) => setMonitoring({ read })}
          />
          <SwitchRow
            id="monitoring-clicked"
            label="Clicked"
            description="Record when a customer clicks a link in the email."
            checked={monitoring.clicked}
            onChange={(clicked) => setMonitoring({ clicked })}
          />
        </div>
      </Section>
    </div>
  );
}

export function ComingSoonPage({ name }: { name: string }) {
  return (
    <Alert variant="info" title={`${name} settings are not available yet`}>
      This page is planned for a later stage. Nothing here needs to be saved
      yet.
    </Alert>
  );
}
