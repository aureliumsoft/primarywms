"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api, toast } from "@/lib/api";
import {
  DateRangeButton,
  type DatePreset,
  rangeForPreset,
} from "@/components/reports/ReportChrome";
import {
  SettingsEmpty,
  SettingsPage,
  SettingsTable,
  SettingsTh,
} from "@/components/settings/ui";

type AlertRow = {
  id: string;
  kind: "QUANTITY" | "DATE";
  qtyComparator: string | null;
  dateWhen: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  recipientKind: string;
  item: { id: string; name: string; sid: string; folder: { name: string } } | null;
  folder: { id: string; name: string } | null;
};

export default function ManageAlertsPage() {
  const initial = rangeForPreset("month");
  const [preset, setPreset] = useState<DatePreset>("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [kind, setKind] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (appliedQ.trim()) params.set("q", appliedQ.trim());
    if (kind) params.set("kind", kind);
    const data = await api<{ alerts: AlertRow[] }>(`/api/v1/alerts?${params}`);
    setRows(data.alerts);
    setSelected([]);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof Error ? err.message : "Could not load alerts"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQ, kind]);

  const shown = useMemo(() => {
    if (!rows) return [];
    return rows.filter((row) => {
      const created = row.createdAt.slice(0, 10);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [rows, from, to]);

  async function removeSelected() {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} alert${selected.length === 1 ? "" : "s"}?`)) return;
    try {
      await api("/api/v1/alerts", { method: "PATCH", body: JSON.stringify({ ids: selected, delete: true }) });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete alerts");
    }
  }

  return (
    <SettingsPage
      title="Manage Alerts"
      subtitle="These alerts serve as proactive measures to ensure efficient asset and consumption tracking."
      actions={
        selected.length ? (
          <button
            type="button"
            onClick={() => void removeSelected()}
            className="inline-flex h-10 items-center rounded-md border border-[#e6ebe8] bg-white px-4 text-[13px] font-bold uppercase tracking-wide text-[#e24b4b]"
          >
            Delete selected
          </button>
        ) : null
      }
      wide
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form
          className="relative min-w-[220px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(q);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9aa6a0]"
          />
        </form>
        <select
          className="h-10 rounded-md border border-[#d8dfdb] bg-white px-3 text-[13px]"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">All types</option>
          <option value="QUANTITY">Quantity</option>
          <option value="DATE">Date</option>
        </select>
        <DateRangeButton
          preset={preset}
          from={from}
          to={to}
          open={dateOpen}
          onToggle={() => setDateOpen((v) => !v)}
          onPreset={(next) => {
            const range = rangeForPreset(next, from, to);
            setPreset(next);
            setFrom(range.from);
            setTo(range.to);
            setDateOpen(false);
          }}
          onCustom={(nextFrom, nextTo) => {
            setPreset("custom");
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
      </div>

      {rows === null ? <p className="text-[14px] text-[#8a9a93]">Loading…</p> : null}
      {rows && shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#e6ebe8] bg-white py-20 text-center">
          <SettingsEmpty message="No data available" />
          <p className="mt-2 text-[13px] text-[#6b7c74]">
            You can try another date range or refine your filters.
          </p>
        </div>
      ) : (
        <SettingsTable>
          <thead className="border-b border-[#e6ebe8] bg-[#fafbfa]">
            <tr>
              <SettingsTh className="w-10">
                <input
                  type="checkbox"
                  checked={shown.length > 0 && selected.length === shown.length}
                  onChange={(e) => setSelected(e.target.checked ? shown.map((r) => r.id) : [])}
                />
              </SettingsTh>
              <SettingsTh>Name</SettingsTh>
              <SettingsTh>Type</SettingsTh>
              <SettingsTh>Trigger</SettingsTh>
              <SettingsTh>SID</SettingsTh>
              <SettingsTh>Folder</SettingsTh>
              <SettingsTh>Last triggered</SettingsTh>
              <SettingsTh>Created</SettingsTh>
              <SettingsTh>Recipients</SettingsTh>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-b border-[#eef2f0]">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() =>
                      setSelected((ids) => (ids.includes(row.id) ? ids.filter((id) => id !== row.id) : [...ids, row.id]))
                    }
                  />
                </td>
                <td className="px-4 py-2 font-medium">{row.item?.name ?? row.folder?.name ?? "—"}</td>
                <td className="px-4 py-2">{row.kind === "QUANTITY" ? "Quantity" : "Date"}</td>
                <td className="px-4 py-2">
                  {row.kind === "QUANTITY" ? (row.qtyComparator ?? "At or below min").replaceAll("_", " ") : row.dateWhen}
                </td>
                <td className="px-4 py-2">{row.item?.sid ?? "—"}</td>
                <td className="px-4 py-2">{row.folder?.name ?? row.item?.folder?.name ?? "—"}</td>
                <td className="px-4 py-2">{row.lastTriggeredAt ? new Date(row.lastTriggeredAt).toLocaleString() : "—"}</td>
                <td className="px-4 py-2">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">{row.recipientKind.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      )}
    </SettingsPage>
  );
}
