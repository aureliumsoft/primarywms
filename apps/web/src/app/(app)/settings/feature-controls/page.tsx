"use client";

import { useEffect, useState } from "react";
import { api, toast } from "@/lib/api";
import { canManageCompany } from "@/lib/permissions";
import { AccessDenied, SettingsCard, SettingsPage, SettingsSave, SettingsSwitch } from "@/components/settings/ui";

export default function FeatureControlsPage() {
  const [role, setRole] = useState<{ kind: string; permissions: Record<string, boolean> } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ user: { role: { kind: string; permissions: Record<string, boolean> } } }>("/api/v1/auth/me")
      .then((d) => setRole(d.user.role))
      .catch(() => setRole({ kind: "", permissions: {} }));
    api<{ organization: { returnToOriginEnabled: boolean } | null }>("/api/v1/org")
      .then((d) => setEnabled(d.organization?.returnToOriginEnabled ?? false))
      .catch(() => undefined);
  }, []);

  if (role === null) {
    return (
      <SettingsPage title="Feature Controls">
        <p className="text-[14px] text-[#8a9a93]">Loading…</p>
      </SettingsPage>
    );
  }

  if (!canManageCompany(role)) {
    return <AccessDenied message="Only users with company settings access can change feature controls." />;
  }

  return (
    <SettingsPage title="Feature Controls" subtitle="Toggle optional features for your organization.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          try {
            await api("/api/v1/org", { method: "PATCH", body: JSON.stringify({ returnToOriginEnabled: enabled }) });
            toast.success("Feature controls saved");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save feature controls");
          } finally {
            setPending(false);
          }
        }}
      >
        <SettingsCard>
          <SettingsSwitch
            label="Return to Origin"
            description="Move quantity back to the folder it last came from."
            checked={enabled}
            onChange={setEnabled}
          />
          {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
          <SettingsSave pending={pending} />
        </SettingsCard>
      </form>
    </SettingsPage>
  );
}
