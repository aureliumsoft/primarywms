"use client";

import Link from "next/link";
import { useState } from "react";
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

type Row = {
  id: string;
  createdAt: string;
  typeLabel: string;
  activity: string;
  item?: { id: string; name: string; sid: string } | null;
};

const ACTIONS = [
  ["", "All actions"],
  ["moved", "Moved"],
  ["edited", "Edited"],
  ["deleted", "Deleted"],
  ["created", "Created"],
  ["restored", "Restored"],
  ["quantity", "Quantity Changed"],
  ["merged", "Merged"],
];

export default function ActivityHistoryPage() {
  const r = useReport<Row>("activity");
  const [actionOpen, setActionOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <ReportHeader title="Activity History" exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch
            value={r.q}
            onChange={r.setQ}
            onSubmit={() => r.applySearch()}
            scanning={r.scanning}
            onToggleScan={() => r.setScanning((v) => !v)}
            placeholder="Search Activity"
          />
          <ChipMenu
            label={ACTIONS.find(([id]) => id === r.action)?.[1] ?? "All actions"}
            active={Boolean(r.action)}
            open={actionOpen}
            onToggle={() => setActionOpen((v) => !v)}
          >
            {ACTIONS.map(([id, label]) => (
              <ChipOption
                key={id || "all"}
                label={label}
                onClick={() => {
                  r.setAction(id);
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
            <ChipOption
              label="Any user"
              onClick={() => {
                r.setUserId("");
                r.setPage(1);
                setUserOpen(false);
              }}
            />
            {r.users.map((u) => (
              <ChipOption
                key={u.id}
                label={`${u.firstName} ${u.lastName}`}
                onClick={() => {
                  r.setUserId(u.id);
                  r.setPage(1);
                  setUserOpen(false);
                }}
              />
            ))}
          </ChipMenu>
          <DateRangeButton
            preset={r.preset}
            from={r.from}
            to={r.to}
            open={r.dateOpen}
            onToggle={() => r.setDateOpen((v) => !v)}
            onPreset={r.applyPreset}
            onCustom={r.applyCustom}
          />
        </div>
        {r.scanning ? (
          <div className="-mx-6">
            <ScanningBanner onClose={() => r.setScanning(false)} />
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {r.error ? <p className="p-6 text-sm text-danger">{r.error}</p> : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6ebe8]">
              <SortTh label="Date" col="createdAt" sort={r.sort || "createdAt"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Activity type" col="type" sort={r.sort || "createdAt"} dir={r.dir} onSort={r.onSort} />
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Activity</th>
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => (
              <tr key={row.id} className="border-b border-[#eef2f0]">
                <td className="whitespace-nowrap px-4 py-3 text-[#6b7c74]">{format(new Date(row.createdAt), "HH:mm")}</td>
                <td className="px-4 py-3">{row.typeLabel}</td>
                <td className="px-4 py-3">
                  {row.item ? (
                    <Link href={`/item/${row.item.id}`} className="hover:text-primary">
                      {row.activity}
                    </Link>
                  ) : (
                    row.activity
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.rows && r.rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">No activity in this range.</p> : null}
        {r.rows === null ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">Loading…</p> : null}
      </div>
      <ReportPager page={r.page} pageSize={r.pageSize} total={r.total} onPage={r.setPage} onPageSize={r.setPageSize} />
    </ReportsShell>
  );
}
