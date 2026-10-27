"use client";

import { useRef, useState } from "react";
import { Gear, Plus, Envelope, Mailbox, ChatText, type Icon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Chip } from "@/components/ui/chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { BsInput } from "@brandsync/react";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Tooltip } from "@/components/ui/tooltip";
import {
  CellActions,
  CellStack,
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "@/components/ui/pagination";
import { AttachmentsPage } from "@/components/settings/attachments-page";
import { AddOrganizationDialog } from "@/components/add-organization-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { compareValues, nextSort, type SortState } from "@/lib/sort";
import { savePromoAttachments, setCurrentOrgId } from "@/lib/store";
import { useOrganizations, usePromoAttachments, useRole } from "@/lib/use-store";
import type { Organization, PromoAttachment } from "@/lib/types";

type TabId = "organizations" | "attachments";

const PAGE_SIZE = 10;

const DISPATCH: Record<
  NonNullable<Organization["mainDispatch"]>,
  { label: string; icon: Icon }
> = {
  email: { label: "Email", icon: Envelope },
  postal: { label: "Postal", icon: Mailbox },
  sms: { label: "SMS", icon: ChatText },
};

function AttachmentsTab({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const items = usePromoAttachments();

  const onChange = (next: PromoAttachment[], previous: PromoAttachment[]) => {
    if (!savePromoAttachments(next)) {
      toast.error("Attachments could not be saved");
      return;
    }
    toast.success("Attachments saved", {
      action: {
        label: "Undo",
        onClick: () => savePromoAttachments(previous),
      },
    });
  };

  return (
    <AttachmentsPage items={items} onChange={onChange} onAnnounce={() => {}} inputRef={inputRef} />
  );
}

export default function OrganizationsPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("organizations");
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactive">("all");
  const [dispatchFilter, setDispatchFilter] = useState<"all" | NonNullable<Organization["mainDispatch"]>>("all");
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const role = useRole();
  const orgs = useOrganizations();

  if (role !== "super_admin") {
    return (
      <main className="bs-page flex flex-1 items-start justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
        <Alert variant="info" title="Super Admin role required" className="max-w-xl">
          Switch roles from the profile menu (demo) to view organizations.
        </Alert>
      </main>
    );
  }

  const needle = query.trim().toLowerCase();
  const filtered = orgs
    .filter((o) => o.name.toLowerCase().includes(needle))
    .filter((o) => statusFilter === "all" || (statusFilter === "active") === (o.active !== false))
    .filter((o) => dispatchFilter === "all" || (o.mainDispatch ?? "email") === dispatchFilter)
    .sort((a, b) => {
      const value = (o: Organization): string | number => {
        switch (sort.key) {
          case "id": return o.id;
          case "dispatch": return o.mainDispatch ?? "email";
          case "added": return o.createdAt ?? "";
          case "status": return o.active === false ? 1 : 0;
          default: return o.name;
        }
      };
      return (sort.direction === "asc" ? 1 : -1) * compareValues(value(a), value(b));
    });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const manage = (org: Organization) => {
    setCurrentOrgId(org.id);
    setSettingsOpen(true);
  };

  const columns: DataTableColumn<Organization>[] = [
    {
      key: "name",
      sortable: true,
      header: "Organization",
      cell: (org) => <CellStack primary={org.name} strong />,
    },
    {
      key: "id",
      sortable: true,
      header: "ID",
      cell: (org) => <CellStack primary={org.id} />,
    },
    {
      key: "dispatch",
      sortable: true,
      header: "Main dispatch type",
      cell: (org) => {
        const { label, icon: DispatchIcon } = DISPATCH[org.mainDispatch ?? "email"];
        return (
          <span className="inline-flex items-center gap-2">
            <DispatchIcon size={16} aria-hidden="true" className="text-[var(--bs-text-secondary)]" />
            {label}
          </span>
        );
      },
    },
    {
      key: "added",
      sortable: true,
      header: "Added",
      cell: (org) => (
        <CellStack
          nowrap
          primary={
            org.createdAt
              ? new Date(org.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
              : "–"
          }
        />
      ),
    },
    {
      key: "status",
      sortable: true,
      header: "Status",
      cell: (org) =>
        org.active === false ? (
          <Chip variant="neutral">Deactive</Chip>
        ) : (
          <Chip variant="success">Active</Chip>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (org) => (
        <CellActions>
          <Tooltip label="Manage settings">
            <button
              type="button"
              aria-label={`Manage settings for ${org.name}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-[var(--bs-icon-default)]" })}
              onClick={() => manage(org)}
            >
              <Gear size={20} aria-hidden="true" />
            </button>
          </Tooltip>
        </CellActions>
      ),
    },
  ];

  return (
    <main className="bs-page flex flex-1 justify-center px-[var(--bs-margin-fluid)] py-6 sm:py-8">
      <div className="flex w-full max-w-[var(--app-max-width)] flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="bs-h1">Organizations</h1>
          {tab === "organizations" && (
            <div className="ml-auto flex">
              <AddOrganizationDialog />
            </div>
          )}
          {tab === "attachments" && (
            <div className="ml-auto flex">
              <Button onClick={() => attachmentInput.current?.click()}>
                <Plus size={16} aria-hidden="true" />
                Add attachment
              </Button>
            </div>
          )}
        </div>

        <section aria-label="Organizations views">
          <Tabs
            label="Organizations sections"
            idPrefix="org"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "organizations", label: "Organizations" },
              { id: "attachments", label: "Attachments" },
            ]}
          />
          <Separator />
        </section>

        {tab === "attachments" ? (
          <div
            role="tabpanel"
            id="org-panel-attachments"
            aria-labelledby="org-tab-attachments"
          >
            <AttachmentsTab inputRef={attachmentInput} />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="org-panel-organizations"
            aria-labelledby="org-tab-organizations"
            className="flex flex-col gap-4"
          >
        <div className="batch-filters">
          <BsInput
            type="search"
            aria-label="Search organizations"
            value={query}
            placeholder="Search organizations"
            onBsInput={(event) => {
              setQuery(event.detail);
              setPage(0);
            }}
          />
          <FilterMenu
            label="Status"
            value={statusFilter}
            options={[{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Deactive", value: "deactive" }]}
            onChange={(next) => {
              setStatusFilter(next);
              setPage(0);
            }}
          />
          <FilterMenu
            label="Dispatch type"
            value={dispatchFilter}
            options={[{ label: "All", value: "all" }, ...(Object.keys(DISPATCH) as (keyof typeof DISPATCH)[]).map((key) => ({ label: DISPATCH[key].label, value: key, icon: DISPATCH[key].icon }))]}
            onChange={(next) => {
              setDispatchFilter(next);
              setPage(0);
            }}
          />
        </div>

        <DataTable
          caption="Organizations"
          columns={columns}
          rows={pageItems}
          getRowId={(org) => org.id}
          getRowLabel={(org) => org.name}
          sort={sort}
          onSortChange={(key) => setSort((current) => nextSort(current, key))}
          emptyMessage={
            orgs.length === 0
              ? "No organizations yet."
              : "No organizations match your search."
          }
        />

        {pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="bs-caption" aria-live="polite">
              Page {currentPage + 1} of {pageCount}
            </p>
            <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
          </div>
        )}
          </div>
        )}
      </div>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showOrgName
      />
    </main>
  );
}
