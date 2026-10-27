"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { createOrganization, getOrganizations } from "@/lib/store";

export function AddOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const close = () => {
    setOpen(false);
    setName("");
    setError("");
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter an organization name.");
      return;
    }
    if (getOrganizations().some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("An organization with this name already exists.");
      return;
    }
    createOrganization(trimmed);
    toast.success("Organization added", { description: trimmed });
    close();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        Add organization
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Add organization"
        description="New organizations start with review and manual upload enabled. You can change features in Settings."
        actions={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit}>Add organization</Button>
          </>
        }
      >
        <Field label="Organization name" htmlFor="new-org-name" error={error}>
          <Input
            id="new-org-name"
            value={name}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </Field>
      </Dialog>
    </>
  );
}
