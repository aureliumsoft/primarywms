"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_ACCENT } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { canManageCompany } from "@/lib/permissions";
import { AccessDenied, SettingsCard, SettingsField, SettingsPage, SettingsSave, settingsInputClass } from "@/components/settings/ui";

type OrgState = {
  name: string;
  initials: string;
  accentColor: string;
  industry: string;
  country: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  logoKey: string | null;
};

export default function CompanyPage() {
  const [role, setRole] = useState<{ kind: string; permissions: Record<string, boolean> } | null>(null);
  const [org, setOrg] = useState<OrgState | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ user: { role: { kind: string; permissions: Record<string, boolean> } } }>("/api/v1/auth/me")
        .then((d) => setRole(d.user.role))
        .catch(() => setRole({ kind: "", permissions: {} })),
      api<{ organization: OrgState | null }>("/api/v1/org")
        .then((d) => {
          if (d.organization) {
            setOrg({
              name: d.organization.name,
              initials: d.organization.initials,
              accentColor: d.organization.accentColor || DEFAULT_ACCENT,
              industry: d.organization.industry ?? "",
              country: d.organization.country,
              currency: d.organization.currency,
              timezone: d.organization.timezone,
              dateFormat: d.organization.dateFormat,
              logoKey: d.organization.logoKey,
            });
          }
        })
        .catch(() => setOrg(null)),
    ]).finally(() => setLoaded(true));
  }, []);

  if (!loaded || role === null) {
    return (
      <SettingsPage title="Company Details">
        <p className="text-[14px] text-[#8a9a93]">Loading…</p>
      </SettingsPage>
    );
  }

  if (!org) {
    return (
      <SettingsPage title="Company Details">
        <p className="text-[14px] text-danger">Could not load company details.</p>
      </SettingsPage>
    );
  }

  if (!canManageCompany(role)) {
    return <AccessDenied />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/v1/org", { method: "PATCH", body: JSON.stringify(org) });
      toast.success("Company details saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save company details");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage title="Company Details">
      <form onSubmit={onSubmit}>
        <SettingsCard>
          <SettingsField label="Company logo">
            <div className="flex items-center gap-4">
              {org.logoKey ? (
                <img src="/api/v1/org/logo" alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-[#e6ebe8]" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                  {org.initials || "PW"}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="text-[13px] text-[#6b7c74]"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoBusy(true);
                  try {
                    const form = new FormData();
                    form.set("file", file);
                    const res = await fetch("/api/v1/org/logo", { method: "POST", body: form, credentials: "include" });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Upload failed");
                    setOrg((o) => (o ? { ...o, logoKey: data.organization.logoKey } : o));
                    toast.success("Logo uploaded");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setLogoBusy(false);
                  }
                }}
              />
            </div>
            {logoBusy ? <p className="mt-1 text-[12px] text-[#8a9a93]">Uploading…</p> : null}
          </SettingsField>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SettingsField label="Company name">
              <input className={settingsInputClass()} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            </SettingsField>
            <SettingsField label="Initials">
              <input
                className={settingsInputClass()}
                maxLength={4}
                value={org.initials}
                onChange={(e) => setOrg({ ...org, initials: e.target.value.toUpperCase() })}
              />
            </SettingsField>
            <SettingsField label="Industry">
              <input className={settingsInputClass()} value={org.industry ?? ""} onChange={(e) => setOrg({ ...org, industry: e.target.value })} />
            </SettingsField>
            <SettingsField label="Country">
              <input className={settingsInputClass()} value={org.country} onChange={(e) => setOrg({ ...org, country: e.target.value })} />
            </SettingsField>
            <SettingsField label="Currency">
              <input className={settingsInputClass()} value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value })} />
            </SettingsField>
            <SettingsField label="Timezone">
              <input className={settingsInputClass()} value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })} />
            </SettingsField>
            <SettingsField label="Date format">
              <select className={settingsInputClass()} value={org.dateFormat} onChange={(e) => setOrg({ ...org, dateFormat: e.target.value })}>
                <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd</option>
              </select>
            </SettingsField>
            <SettingsField label="Accent color">
              <div className="flex gap-2">
                <input type="color" className="h-11 w-14 rounded-md border border-[#d8dfdb]" value={org.accentColor} onChange={(e) => setOrg({ ...org, accentColor: e.target.value })} />
                <input className={settingsInputClass()} value={org.accentColor} onChange={(e) => setOrg({ ...org, accentColor: e.target.value })} />
              </div>
            </SettingsField>
          </div>
          {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
          <SettingsSave pending={pending} />
        </SettingsCard>
      </form>

      {role.kind === "SUPER_ADMIN" ? (
        <SettingsCard title="Delete organization" className="mt-6 border-[#f0d8d8]">
          <p className="text-[14px] text-[#6b7c74]">Super Admins can permanently delete this workspace. Type the company name to confirm.</p>
          <SettingsField label="Confirm company name" className="mt-4">
            <input className={settingsInputClass()} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </SettingsField>
          <button
            type="button"
            disabled={confirmName !== org.name}
            className="mt-4 h-11 rounded-md bg-[#e24b4b] px-5 text-[13px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
            onClick={async () => {
              if (!confirm("This cannot be undone. Delete the organization?")) return;
              try {
                await api("/api/v1/org", { method: "DELETE", body: JSON.stringify({ confirmName }) });
                window.location.href = "/login";
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not delete organization");
              }
            }}
          >
            Delete organization
          </button>
        </SettingsCard>
      ) : null}
    </SettingsPage>
  );
}
