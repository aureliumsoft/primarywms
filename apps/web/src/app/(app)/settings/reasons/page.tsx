"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, toast } from "@/lib/api";
import { canManageCatalog, canManageCompany } from "@/lib/permissions";
import {
  PrimaryAddButton,
  SettingsAddRow,
  SettingsCard,
  SettingsField,
  SettingsPage,
  SettingsSwitch,
  SettingsTable,
  SettingsTabs,
  SettingsTh,
  settingsInputClass,
} from "@/components/settings/ui";
import { Modal } from "@/components/ui";

type Reason = { id: string; name: string; kind: "MOVE" | "QUANTITY"; isDefault: boolean; isVisible: boolean };

export default function ReasonsPage() {
  const [tab, setTab] = useState<"MOVE" | "QUANTITY">("MOVE");
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [requireMove, setRequireMove] = useState(false);
  const [requireQty, setRequireQty] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<{ kind: string; permissions: Record<string, boolean> } | null>(null);

  function load() {
    api<{ reasons: Reason[] }>("/api/v1/settings/lookups").then((d) => setReasons(d.reasons));
    api<{ organization: { requireMoveReason: boolean; requireQtyReason: boolean } | null; user: { role: { kind: string; permissions: Record<string, boolean> } } }>(
      "/api/v1/auth/me",
    ).then((d) => {
      setRole(d.user.role);
      if (d.organization) {
        setRequireMove(d.organization.requireMoveReason);
        setRequireQty(d.organization.requireQtyReason);
      }
    });
  }

  useEffect(load, []);

  const visible = reasons.filter((r) => r.kind === tab);

  const canToggleRequire = role ? canManageCompany(role) || canManageCatalog(role) : false;

  async function toggleRequire(field: "requireMoveReason" | "requireQtyReason", value: boolean) {
    const prevMove = requireMove;
    const prevQty = requireQty;
    if (field === "requireMoveReason") setRequireMove(value);
    else setRequireQty(value);
    try {
      await api("/api/v1/org", { method: "PATCH", body: JSON.stringify({ [field]: value }), toast: false });
    } catch (err) {
      setRequireMove(prevMove);
      setRequireQty(prevQty);
      toast.error(err instanceof Error ? err.message : "Could not update setting");
    }
  }

  async function patchReason(id: string, patch: { isVisible?: boolean; isDefault?: boolean }) {
    const prev = reasons;
    setReasons((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, ...patch, isDefault: patch.isDefault ? true : r.isDefault } : patch.isDefault ? { ...r, isDefault: false } : r,
      ),
    );
    try {
      await api("/api/v1/settings/reasons", { method: "PATCH", body: JSON.stringify({ id, ...patch }), toast: false });
      load();
    } catch (err) {
      setReasons(prev);
      toast.error(err instanceof Error ? err.message : "Could not update reason");
    }
  }

  async function addReason(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await api<{ reason: Reason }>("/api/v1/settings/reasons", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), kind: tab }),
      });
      setReasons((prev) => [...prev, res.reason]);
      setOpen(false);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add reason");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage
      title="Transaction Reasons"
      subtitle="Define custom reasons for item moves and quantity updates to improve tracking and reporting."
      actions={<PrimaryAddButton onClick={() => setOpen(true)}>+ Add Reason</PrimaryAddButton>}
      wide
    >
      <SettingsTabs
        tabs={[
          { id: "MOVE", label: "Move Reason" },
          { id: "QUANTITY", label: "Quantity Update Reason" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "MOVE" | "QUANTITY")}
      />

      <SettingsCard className="mt-6">
        <SettingsSwitch
          label={tab === "MOVE" ? "Require move reason" : "Require quantity update reason"}
          description={
            tab === "MOVE"
              ? "When enabled, users must select a reason to complete move transactions."
              : "When enabled, users must select a reason to complete quantity update transactions."
          }
          checked={tab === "MOVE" ? requireMove : requireQty}
          onChange={(checked) => {
            if (!canToggleRequire) {
              toast.error("You do not have permission to change this setting");
              return;
            }
            void toggleRequire(tab === "MOVE" ? "requireMoveReason" : "requireQtyReason", checked);
          }}
        />
      </SettingsCard>

      <div className="mt-6">
        <SettingsTable>
          <thead className="border-b border-[#e6ebe8] bg-[#fafbfa]">
            <tr>
              <SettingsTh>{tab === "MOVE" ? "Move reason" : "Quantity reason"}</SettingsTh>
              <SettingsTh className="w-28 text-center">Default</SettingsTh>
              <SettingsTh className="w-28 text-center">Visibility</SettingsTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((reason) => (
              <tr key={reason.id} className="border-b border-[#eef2f0]">
                <td className="px-4 py-3 font-medium text-[#1c2b25]">{reason.name}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="radio"
                    name={`default-${tab}`}
                    checked={reason.isDefault}
                    onChange={() => void patchReason(reason.id, { isDefault: true })}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reason.isVisible}
                    onClick={() => void patchReason(reason.id, { isVisible: !reason.isVisible })}
                    className={`relative mx-auto inline-flex h-6 w-11 rounded-full transition ${reason.isVisible ? "bg-primary" : "bg-[#d8dfdb]"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${reason.isVisible ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
        <SettingsAddRow label="Add Custom Reason" onClick={() => setOpen(true)} />
      </div>

      <Modal open={open} title="Add Custom Reason" onClose={() => setOpen(false)}>
        <form onSubmit={addReason} className="space-y-4">
          <SettingsField label="Reason name">
            <input className={settingsInputClass()} value={name} onChange={(e) => setName(e.target.value)} required />
          </SettingsField>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="h-10 rounded-md px-4 text-[13px] text-[#6b7c74]" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <PrimaryAddButton type="submit">{pending ? "Adding…" : "Add reason"}</PrimaryAddButton>
          </div>
        </form>
      </Modal>
    </SettingsPage>
  );
}
