"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { downloadApi } from "@/lib/download";
import { SettingsCard, SettingsPage, PrimaryAddButton } from "@/components/settings/ui";

export default function BackupPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function downloadBackup() {
    setPending(true);
    setError("");
    try {
      await downloadApi("/api/v1/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "backup" }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create backup");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage
      title="Data Backup"
      subtitle="Download a full copy of your inventory, folders, and transaction history. Only Super Admins and Admins can create backups."
    >
      <SettingsCard title="Full inventory backup">
        <p className="text-[14px] leading-relaxed text-[#6b7c74]">
          Generates a ZIP file with CSV exports of all items, folders, and transactions in your organization. Use this for
          disaster recovery, audits, or migrating data.
        </p>
        <ul className="mt-4 space-y-1.5 text-[13px] text-[#6b7c74]">
          <li>• items.csv — every item with quantity, price, folder, and notes</li>
          <li>• folders.csv — folder tree with parent relationships</li>
          <li>• transactions.csv — full move and quantity history</li>
        </ul>
        {error ? <p className="mt-4 text-[13px] text-danger">{error}</p> : null}
        <div className="mt-6">
          <PrimaryAddButton onClick={() => void downloadBackup()}>
            <span className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              {pending ? "Preparing…" : "Download backup"}
            </span>
          </PrimaryAddButton>
        </div>
      </SettingsCard>
    </SettingsPage>
  );
}
