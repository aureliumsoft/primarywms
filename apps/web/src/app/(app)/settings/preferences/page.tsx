"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SettingsCard, SettingsField, SettingsPage, SettingsSave, SettingsSwitch, settingsInputClass } from "@/components/settings/ui";

const TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

type Prefs = {
  defaultView: "GRID" | "LIST" | "TABLE";
  defaultSort: string;
  sortDirection: "ASC" | "DESC";
  emailAlerts: boolean;
  poEmails: boolean;
  timezoneAuto: boolean;
  timezone: string | null;
};

export default function PreferencesPage() {
  const [form, setForm] = useState<Prefs | null>(null);
  const [orgTimezone, setOrgTimezone] = useState("Europe/London");
  const [pending, setPending] = useState(false);

  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api<{ user: Prefs; organization: { timezone: string } | null }>("/api/v1/auth/me")
      .then((d) => {
        setForm(d.user);
        if (d.organization?.timezone) setOrgTimezone(d.organization.timezone);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load preferences"));
  }, []);

  if (loadError) {
    return (
      <SettingsPage title="Preferences">
        <p className="text-[14px] text-danger">{loadError}</p>
      </SettingsPage>
    );
  }

  if (!form) {
    return (
      <SettingsPage title="Preferences">
        <p className="text-[14px] text-[#8a9a93]">Loading…</p>
      </SettingsPage>
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/v1/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
        toast: "Preferences saved",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences");
    } finally {
      setPending(false);
    }
  }

  const timezone = form.timezoneAuto ? orgTimezone : form.timezone ?? orgTimezone;

  return (
    <SettingsPage title="Preferences">
      <form onSubmit={save}>
        <SettingsCard title="General">
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-4">
              <SettingsField label="Time zone" className="min-w-[240px] flex-1">
                <select
                  className={settingsInputClass()}
                  value={timezone}
                  disabled={form.timezoneAuto}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </SettingsField>
              <SettingsSwitch
                label="Set automatically"
                checked={form.timezoneAuto}
                onChange={(timezoneAuto) => setForm({ ...form, timezoneAuto })}
              />
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <SettingsField label="Sort by" className="min-w-[200px]">
                <select
                  className={settingsInputClass()}
                  value={form.defaultSort}
                  onChange={(e) => setForm({ ...form, defaultSort: e.target.value })}
                >
                  <option value="UPDATED_AT">Updated at</option>
                  <option value="NAME">Name</option>
                  <option value="QUANTITY">Quantity</option>
                  <option value="MIN_LEVEL">Min level</option>
                  <option value="PRICE">Price</option>
                  <option value="TOTAL_VALUE">Total value</option>
                </select>
              </SettingsField>
              <div>
                <span className="mb-1.5 block text-[12px] text-[#8a9a93]">Order</span>
                <div className="flex h-11 items-center gap-4 text-[14px]">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sortDir"
                      checked={form.sortDirection === "ASC"}
                      onChange={() => setForm({ ...form, sortDirection: "ASC" })}
                    />
                    Ascending
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sortDir"
                      checked={form.sortDirection === "DESC"}
                      onChange={() => setForm({ ...form, sortDirection: "DESC" })}
                    />
                    Descending
                  </label>
                </div>
              </div>
            </div>
            <SettingsField label="Default catalog view">
              <select
                className={settingsInputClass()}
                value={form.defaultView}
                onChange={(e) => setForm({ ...form, defaultView: e.target.value as Prefs["defaultView"] })}
              >
                <option value="GRID">Grid</option>
                <option value="LIST">List</option>
                <option value="TABLE">Table</option>
              </select>
            </SettingsField>
          </div>
        </SettingsCard>

        <SettingsCard title="Email" className="mt-6">
          <div className="space-y-5">
            <SettingsSwitch
              label="Alerts"
              description="Email alerts will be sent to the email address associated with your account."
              checked={form.emailAlerts}
              onChange={(emailAlerts) => setForm({ ...form, emailAlerts })}
            />
            <SettingsSwitch
              label="Purchase Orders"
              description="Purchase order emails will be sent to the email address associated with your account."
              checked={form.poEmails}
              onChange={(poEmails) => setForm({ ...form, poEmails })}
            />
          </div>
        </SettingsCard>

        <SettingsSave pending={pending} />
        {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
      </form>
    </SettingsPage>
  );
}
