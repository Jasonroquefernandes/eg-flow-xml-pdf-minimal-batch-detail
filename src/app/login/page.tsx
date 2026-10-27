"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Buildings, Shield, SignIn } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { setCurrentOrgId, setRole } from "@/lib/store";
import { useOrganizations } from "@/lib/use-store";
import type { Role } from "@/lib/types";

const ACCOUNTS: { role: Role; title: string; description: string; icon: typeof Shield }[] = [
  { role: "org_user", title: "Organization user", description: "Manage batches, invoices and settings for one organization.", icon: Buildings },
  { role: "super_admin", title: "Super admin", description: "See all organizations, health overview and attachments.", icon: Shield },
];

// Demo only: no credentials, this just switches the active role.
export default function LoginPage() {
  const router = useRouter();
  const orgs = useOrganizations();
  const [role, setSelectedRole] = useState<Role>("org_user");
  const [orgId, setOrgId] = useState<string>("");
  const selectedOrgId = orgId || orgs[0]?.id || "";

  const signIn = () => {
    setRole(role);
    if (role === "org_user" && selectedOrgId) setCurrentOrgId(selectedOrgId);
    router.push("/");
  };

  return (
    <main className="bs-page flex flex-1 items-center justify-center px-[var(--bs-margin-fluid)] py-10">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-[var(--bs-border-radius-150)] border border-[var(--bs-border-default)] bg-[var(--bs-surface-raised)] p-6">
        <div>
          <h1 className="bs-h2">Sign in to EG Flow</h1>
          <p className="mt-1 bs-body-sm bs-text-secondary">Choose an account to continue. Demo only, no password needed.</p>
        </div>

        <div role="radiogroup" aria-label="Account type" className="flex flex-col gap-3">
          {ACCOUNTS.map(({ role: value, title, description, icon: Icon }) => {
            const active = role === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedRole(value)}
                className={`flex items-start gap-3 rounded-[var(--bs-border-radius-100)] border p-4 text-left ${active ? "border-[var(--bs-border-primary)] bg-[var(--bs-surface-selected)]" : "border-[var(--bs-border-default)] hover:bg-[var(--bs-surface-hover)]"}`}
              >
                <Icon size={24} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>
                  <span className="block bs-body-sm font-semibold">{title}</span>
                  <span className="block bs-caption text-[var(--bs-text-muted)]">{description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {role === "org_user" && orgs.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="bs-body-sm font-medium">Organization</span>
            <select className="bs-input" value={selectedOrgId} onChange={(event) => setOrgId(event.target.value)}>
              {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </label>
        )}

        <Button onClick={signIn}><SignIn aria-hidden="true" /> Sign in</Button>
      </div>
    </main>
  );
}
