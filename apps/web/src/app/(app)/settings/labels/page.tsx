"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { printLabels } from "@/lib/label-print";
import { getLabelSize } from "@/lib/label-sizes";
import { CreateLabelWizard } from "@/components/CreateLabelWizard";
import { BarcodeMark } from "@/components/BarcodeMark";
import {
  PrimaryAddButton,
  SettingsEmpty,
  SettingsPage,
  SettingsTable,
  SettingsTh,
} from "@/components/settings/ui";

type Unlinked = {
  id: string;
  name: string;
  value: string;
  symbology: string;
  createdAt: string;
  linkedAt: string | null;
};

export default function CreateLabelsPage() {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Unlinked[]>([]);
  const [error, setError] = useState("");
  const [reprinting, setReprinting] = useState<string | null>(null);

  async function load() {
    const data = await api<{ labels: Unlinked[] }>("/api/v1/labels");
    setLabels(data.labels);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load labels"));
  }, []);

  async function reprint(row: Unlinked) {
    const size = getLabelSize("letter-qr-sm") ?? getLabelSize("letter-qr-md");
    if (!size) return;
    setReprinting(row.id);
    setError("");
    try {
      await printLabels({
        size,
        kind: "QR",
        copies: [{ name: row.name, value: row.value }],
        startPosition: 1,
        instructions: false,
        includePhoto: false,
        includeLogo: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reprint label");
    } finally {
      setReprinting(null);
    }
  }

  return (
    <SettingsPage
      title="Create Labels"
      subtitle="Create unlinked QR labels you can attach to items later. Linked labels for existing items are available from any item or folder menu."
      actions={<PrimaryAddButton onClick={() => setOpen(true)}>Create Labels</PrimaryAddButton>}
      wide
    >
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <SettingsTable>
        <thead className="border-b border-[#e6ebe8] bg-[#fafbfa]">
          <tr>
            <SettingsTh>Name</SettingsTh>
            <SettingsTh>Code</SettingsTh>
            <SettingsTh>Preview</SettingsTh>
            <SettingsTh>Created</SettingsTh>
            <SettingsTh>Status</SettingsTh>
            <SettingsTh className="text-right">Actions</SettingsTh>
          </tr>
        </thead>
        <tbody>
          {labels.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <SettingsEmpty message="No unlinked labels yet. Create a batch to print codes you can link later." />
              </td>
            </tr>
          ) : (
            labels.map((row) => (
              <tr key={row.id} className="border-b border-[#eef2f0]">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{row.value}</td>
                <td className="px-4 py-3">
                  <BarcodeMark value={row.value} symbology="QR" height={36} />
                </td>
                <td className="px-4 py-3 text-[#6b7c74]">{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</td>
                <td className="px-4 py-3">{row.linkedAt ? "Linked" : "Unlinked"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={reprinting === row.id}
                    onClick={() => void reprint(row)}
                    className="text-[13px] font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {reprinting === row.id ? "Printing…" : "Reprint"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </SettingsTable>
      <CreateLabelWizard
        open={open}
        mode="unlinked"
        targets={[]}
        onClose={() => {
          setOpen(false);
          load().catch(() => undefined);
        }}
      />
    </SettingsPage>
  );
}
