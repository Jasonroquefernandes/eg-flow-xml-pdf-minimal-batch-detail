"use client";

import { useState } from "react";
import { BsAvatar, BsBadge } from "@brandsync/react";
import { Shield, UserCircle } from "@phosphor-icons/react";

import { Tabs } from "@/components/ui/tabs";
import { useCurrentOrgId, useOrganizations, useRole } from "@/lib/use-store";

const PROFILE = {
  name: "jfern",
  email: "jfern@eg.dk",
  initials: "JF",
};

type TabId = "account" | "access";

function ProfileRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="bs-h4">{label}</p>
        <p className="bs-body-sm bs-text-secondary">{description}</p>
      </div>
      <div className="bs-body-sm shrink-0 py-1 font-medium">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState<TabId>("account");
  const currentOrgId = useCurrentOrgId();
  const organizations = useOrganizations();
  const role = useRole();
  const organization = organizations.find((org) => org.id === currentOrgId);
  const roleLabel = role === "super_admin" ? "Super admin" : "Organization user";

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width-narrow)] flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BsAvatar
              type="initials"
              initials={PROFILE.initials}
              size="xl"
              ariaLabel={`${PROFILE.name} profile`}
            />
            <div className="min-w-0">
              <h1 className="bs-h1">{PROFILE.name}</h1>
              <p className="bs-body-sm bs-text-secondary">{PROFILE.email}</p>
            </div>
          </div>
          <BsBadge variant="success">Active account</BsBadge>
        </header>

        <div className="side-tabs grid min-h-[24rem] w-full grid-cols-[13rem_minmax(0,1fr)] items-start gap-x-6">
          <div className="self-stretch">
            <Tabs
              label="Profile sections"
              idPrefix="profile"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "account", label: "Account", icon: <UserCircle size={18} aria-hidden="true" /> },
                { id: "access", label: "Access", icon: <Shield size={18} aria-hidden="true" /> },
              ]}
            />
          </div>

          <div
            role="tabpanel"
            id={`profile-panel-${tab}`}
            aria-labelledby={`profile-tab-${tab}`}
            className="flex min-w-0 flex-col gap-3"
          >
            <h2 className="bs-h3">{tab === "account" ? "Account" : "Access"}</h2>

            {tab === "account" ? (
              <div className="flex flex-col divide-y divide-[var(--bs-border-default)]">
                <ProfileRow label="Name" description="The name shown across the app.">
                  {PROFILE.name}
                </ProfileRow>
                <ProfileRow label="Email address" description="Where account messages are sent.">
                  {PROFILE.email}
                </ProfileRow>
                <ProfileRow label="Account status" description="Whether you can sign in.">
                  <BsBadge variant="success">Active</BsBadge>
                </ProfileRow>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--bs-border-default)]">
                <ProfileRow label="Access role" description="What you can see and change.">
                  <BsBadge variant={role === "super_admin" ? "primary" : "neutral"}>{roleLabel}</BsBadge>
                </ProfileRow>
                <ProfileRow label="Current organization" description="The organization you are working in.">
                  {organization?.name ?? "No organization selected"}
                </ProfileRow>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
