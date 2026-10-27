"use client";

import { DesignPreview } from "@/components/settings/design-preview";
import { useCurrentOrgId, useSettings } from "@/lib/use-store";

export default function StandardEmailPage() {
  const settings = useSettings(useCurrentOrgId());

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width-narrow)] flex-col gap-4">
        <h1 className="bs-h2">Standard email</h1>
        <DesignPreview
          design={{ ...settings.email.design, mode: "standard" }}
          vendor={settings.company.vendor}
          label="email"
          company={settings.company}
          email={settings.email}
        />
      </div>
    </main>
  );
}
