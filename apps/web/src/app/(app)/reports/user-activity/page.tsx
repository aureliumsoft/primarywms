"use client";

import { useState } from "react";
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
  userId: string;
  name: string;
  moves: number;
  updates: number;
  creates: number;
  deletes: number;
  restores: number;
  clones: number;
  merges: number;
  total: number;
};

export default function UserActivityPage() {
  const r = useReport<Row>("user-activity");
  const [userOpen, setUserOpen] = useState(false);

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <ReportHeader title="User Activity Summary" exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch value={r.q} onChange={r.setQ} onSubmit={() => r.applySearch()} scanning={r.scanning} onToggleScan={() => r.setScanning((v) => !v)} />
          <ChipMenu
            label={r.userId ? r.users.find((u) => u.id === r.userId)?.firstName ?? "User" : "Any user"}
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
          <div className="ml-auto">
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
        </div>
        {r.scanning ? (
          <div className="-mx-6">
            <ScanningBanner onClose={() => r.setScanning(false)} />
          </div>
        ) : null}
        {r.stats ? (
          <div className="flex flex-wrap gap-x-8 gap-y-3 pb-5 text-[13px] text-[#8a9a93]">
            <Stat label="Users" value={r.stats.users} />
            <Stat label="Items Moved" value={r.stats.moved} />
            <Stat label="Quantity Updated" value={r.stats.updated} />
            <Stat label="Items Created" value={r.stats.created} />
            <Stat label="Items Deleted" value={r.stats.deleted} />
            <Stat label="Items Restored" value={r.stats.restored} />
            <Stat label="Items Cloned" value={r.stats.cloned} />
            <Stat label="Items Merged" value={r.stats.merged} />
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {r.error ? <p className="p-6 text-sm text-danger">{r.error}</p> : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6ebe8]">
              <SortTh label="User" col="name" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Moved" col="moves" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Updated" col="updates" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Created" col="creates" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Deleted" col="deletes" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Cloned" col="clones" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Total" col="total" sort={r.sort || "total"} dir={r.dir} onSort={r.onSort} />
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => (
              <tr key={row.userId} className="border-b border-[#eef2f0]">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.moves}</td>
                <td className="px-4 py-3">{row.updates}</td>
                <td className="px-4 py-3">{row.creates}</td>
                <td className="px-4 py-3">{row.deletes}</td>
                <td className="px-4 py-3">{row.clones}</td>
                <td className="px-4 py-3">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.rows && r.rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">No user activity in this range.</p> : null}
      </div>
      <ReportPager page={r.page} pageSize={r.pageSize} total={r.total} onPage={r.setPage} onPageSize={r.setPageSize} />
    </ReportsShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[22px] font-semibold text-[#1c2b25]">{value}</div>
      <div>{label}</div>
    </div>
  );
}
