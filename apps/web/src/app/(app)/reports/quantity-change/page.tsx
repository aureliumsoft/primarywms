"use client";

import Link from "next/link";
import { ReportsShell } from "@/components/reports/ReportsShell";
import {
  DateRangeButton,
  ReportHeader,
  ReportPager,
  ReportSearch,
  ScanningBanner,
  SortTh,
} from "@/components/reports/ReportChrome";
import { useReport } from "@/components/reports/useReport";
import { cn } from "@/lib/cn";

type Row = { itemId: string; name: string; sid: string; delta: number; count: number };

export default function QuantityChangePage() {
  const r = useReport<Row>("quantity-change");

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <ReportHeader title="Quantity Change by Item" exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch value={r.q} onChange={r.setQ} onSubmit={() => r.applySearch()} scanning={r.scanning} onToggleScan={() => r.setScanning((v) => !v)} />
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
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {r.error ? <p className="p-6 text-sm text-danger">{r.error}</p> : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6ebe8]">
              <SortTh label="Name" col="name" sort={r.sort || "net"} dir={r.dir} onSort={r.onSort} />
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">SID</th>
              <SortTh label="Net change" col="net" sort={r.sort || "net"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Transactions" col="count" sort={r.sort || "net"} dir={r.dir} onSort={r.onSort} />
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => (
              <tr key={row.itemId} className="border-b border-[#eef2f0]">
                <td className="px-4 py-3">
                  <Link href={`/item/${row.itemId}`} className="font-medium hover:text-primary">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#8a9a93]">{row.sid}</td>
                <td className={cn("px-4 py-3", row.delta < 0 ? "text-[#e24b4b]" : row.delta > 0 ? "text-primary" : "")}>
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </td>
                <td className="px-4 py-3">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.rows && r.rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">No quantity changes in this range.</p> : null}
      </div>
      <ReportPager page={r.page} pageSize={r.pageSize} total={r.total} onPage={r.setPage} onPageSize={r.setPageSize} />
    </ReportsShell>
  );
}
