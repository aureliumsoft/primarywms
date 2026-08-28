"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SettingsCard, SettingsField, SettingsPage, SettingsSave, settingsInputClass } from "@/components/settings/ui";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  jobFunction: string | null;
  jobTitle: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pending, setPending] = useState(false);
  const [pwPending, setPwPending] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api<{ user: Profile }>("/api/v1/auth/me")
      .then((d) => setProfile(d.user))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  if (loadError) {
    return (
      <SettingsPage title="User Profile">
        <p className="text-[14px] text-danger">{loadError}</p>
      </SettingsPage>
    );
  }

  if (!profile) {
    return (
      <SettingsPage title="User Profile">
        <p className="text-[14px] text-[#8a9a93]">Loading…</p>
      </SettingsPage>
    );
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setProfileError("");
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setProfileError("First and last name are required");
      return;
    }
    setPending(true);
    try {
      await api("/api/v1/profile", { method: "PATCH", body: JSON.stringify(profile) });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setPending(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!currentPassword) {
      setPwError("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setPwError("New passwords do not match");
      return;
    }
    setPwPending(true);
    try {
      await api("/api/v1/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPwPending(false);
    }
  }

  return (
    <SettingsPage title="User Profile">
      <form onSubmit={saveProfile}>
        <SettingsCard>
          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField label="First Name">
              <input
                className={settingsInputClass()}
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
            </SettingsField>
            <SettingsField label="Last Name">
              <input
                className={settingsInputClass()}
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              />
            </SettingsField>
            <SettingsField label="Email">
              <input className={settingsInputClass()} value={profile.email} disabled />
            </SettingsField>
            <SettingsField label="Phone Number">
              <input
                className={settingsInputClass()}
                value={profile.phone ?? ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </SettingsField>
            <SettingsField label="Job Function">
              <input
                className={settingsInputClass()}
                placeholder="Enter your Job Function"
                value={profile.jobFunction ?? ""}
                onChange={(e) => setProfile({ ...profile, jobFunction: e.target.value })}
              />
            </SettingsField>
            <SettingsField label="Job Title">
              <input
                className={settingsInputClass()}
                placeholder="Select your Job Title…"
                value={profile.jobTitle ?? ""}
                onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
              />
            </SettingsField>
          </div>
          {profileError ? <p className="mt-3 text-sm text-danger">{profileError}</p> : null}
          <SettingsSave pending={pending} />
        </SettingsCard>
      </form>

      <form onSubmit={savePassword} className="mt-6">
        <SettingsCard title="Change Password">
          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField label="Current Password">
              <input
                type="password"
                autoComplete="current-password"
                className={settingsInputClass()}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </SettingsField>
            <SettingsField label="New Password">
              <input
                type="password"
                autoComplete="new-password"
                className={settingsInputClass()}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </SettingsField>
            <SettingsField label="Confirm New Password" className="sm:col-span-2">
              <input
                type="password"
                autoComplete="new-password"
                className={settingsInputClass()}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </SettingsField>
          </div>
          {pwError ? <p className="mt-3 text-sm text-danger">{pwError}</p> : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <SettingsSave pending={pwPending}>Save changes</SettingsSave>
            <Link href="/forgot-password" className="text-[13px] text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </SettingsCard>
      </form>
    </SettingsPage>
  );
}
