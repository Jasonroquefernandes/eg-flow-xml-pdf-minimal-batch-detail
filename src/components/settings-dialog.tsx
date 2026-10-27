"use client";

import { Dialog } from "@/components/ui/dialog";
import { SettingsForm } from "@/components/settings/settings-form";
import { useCurrentOrgId, useOrganizations, useSettings } from "@/lib/use-store";

export function SettingsDialog({
  open,
  onClose,
  showOrgName = false,
}: {
  open: boolean;
  onClose: () => void;
  showOrgName?: boolean;
}) {
  const currentOrgId = useCurrentOrgId();
  const org = useOrganizations().find((o) => o.id === currentOrgId);
  const saved = useSettings(currentOrgId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={showOrgName && org ? `Settings · ${org.name}` : "Settings"}
      size="lg"
      className="settings-dialog"
    >
      {open && org && (
        <SettingsForm
          key={org.id}
          org={org}
          saved={saved}
          embedded
          hiddenPages={showOrgName ? ["general"] : []}
        />
      )}
    </Dialog>
  );
}
