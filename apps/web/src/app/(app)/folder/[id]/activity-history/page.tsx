"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ReportsShell } from "@/components/reports/ReportsShell";
import {
  ChipMenu,
  ChipOption,
  DateRangeButton,
  ReportHeader,
  ReportPager,
  ReportSearch,
  ScanningBanner,
  SortTh,
} from "@/components/reports/ReportChrome";
import { useReport } from "@/components/reports/useReport";
import { api } from "@/lib/api";

type Row = {
  id: string;
  createdAt: string;
  typeLabel: string;
  activity: string;
  qtyDelta: number | null;
  qtyAfter: number | null;
  item?: { id: string; name: string; sid: string } | null;
  fromFolder?: { name: string } | null;
  toFolder?: { name: string } | null;
  user?: { firstName: string; lastName: string } | null;
};

const ACTIONS = [
  ["", "All actions"],
  ["moved", "Moved"],
  ["edited", "Edited"],
  ["deleted", "Deleted"],
  ["created", "Created"],
  ["restored", "Restored"],
];

export default function FolderActivityHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [folderName, setFolderName] = useState("");
  const r = useReport<Row>("activity");
  const [actionOpen, setActionOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    r.setFolderId(id);
    api<{ folder: { name: string } }>(`/api/v1/folders/${id}`)
      .then((d) => setFolderName(d.folder.name))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <p className="mb-2 text-[13px] text-[#8a9a93]">
          <Link href={`/folder/${id}/content`} className="hover:text-primary">
            {folderName || "Folder"}
          </Link>
          <span className="mx-1.5">›</span>
          Activity History
        </p>
        <ReportHeader title={`Activity History${folderName ? ` — ${folderName}` : ""}`} exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch value={r.q} onChange={r.setQ} onSubmit={() => r.applySearch()} scanning={r.scanning} onToggleScan={() => r.setScanning((v) => !v)} placeholder="Search Activity" />
          <ChipMenu label={ACTIONS.find(([aid]) => aid === r.action)?.[1] ?? "All actions"} active={Boolean(r.action)} open={actionOpen} onToggle={() => setActionOpen((v) => !v)}>
            {ACTIONS.map(([aid, label]) => (
              <ChipOption
                key={aid || "all"}
                label={label}
                onClick={() => {
                  r.setAction(aid);
                  r.setPage(1);
                  setActionOpen(false);
                }}
              />
            ))}
          </ChipMenu>
          <ChipMenu
            label={r.userId ? `${r.users.find((u) => u.id === r.userId)?.firstName ?? "User"}` : "Any user"}
            active={Boolean(r.userId)}
            open={userOpen}
            onToggle={() => setUserOpen((v) => !v)}
          >
            <ChipOption label="Any user" onClick={() => { r.setUserId(""); r.setPage(1); setUserOpen(false); }} />
            {r.users.map((u) => (
              <ChipOption key={u.id} label={`${u.firstName} ${u.lastName}`} onClick={() => { r.setUserId(u.id); r.setPage(1); setUserOpen(false); }} />
            ))}
          </ChipMenu>
          <DateRangeButton preset={r.preset} from={r.from} to={r.to} open={r.dateOpen} onToggle={() => r.setDateOpen((v) => !v)} onPreset={r.applyPreset} onCustom={r.applyCustom} />
        </div>
      </header>
      {r.scanning ? <ScanningBanner onClose={() => r.setScanning(false)} /> : null}
      <div className="overflow-x-auto px-6 py-4">
        {r.error ? <p className="mb-4 text-sm text-danger">{r.error}</p> : null}
        <table className="min-w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e6ebe8] text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">
              <SortTh label="Date" col="createdAt" sort={r.sort} dir={r.dir} onSort={r.onSort} />
              <th className="px-3 py-3">Activity Type</th>
              <th className="px-3 py-3">Activity</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Qty Change</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Destination</th>
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => (
              <tr key={row.id} className="border-b border-[#eef2ef] hover:bg-[#fafbfb]">
                <td className="whitespace-nowrap px-3 py-2.5">{format(new Date(row.createdAt), "d MMM yyyy HH:mm")}</td>
                <td className="px-3 py-2.5">{row.typeLabel}</td>
                <td className="px-3 py-2.5">{row.activity}</td>
                <td className="px-3 py-2.5">{row.user ? `${row.user.firstName} ${row.user.lastName}` : "—"}</td>
                <td className="px-3 py-2.5">{row.item?.name ?? "—"}</td>
                <td className="px-3 py-2.5">{row.qtyDelta ?? "—"}</td>
                <td className="px-3 py-2.5">{row.fromFolder?.name ?? "—"}</td>
                <td className="px-3 py-2.5">{row.toFolder?.name ?? "—"}</td>
              </tr>
            ))}
            {!r.rows?.length && !r.error ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-[#8a9a93]">
                  No activity for this folder in the selected range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ReportPager page={r.page} pageSize={r.pageSize} total={r.total} onPage={r.setPage} onPageSize={r.setPageSize} />
    </ReportsShell>
  );
}
