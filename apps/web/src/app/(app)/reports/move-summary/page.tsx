"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@primarywms/shared";
import { ReportsShell } from "@/components/reports/ReportsShell";
import {
  DateRangeButton,
  FilterChip,
  ReportHeader,
  ReportPager,
  ReportSearch,
  ScanningBanner,
  SortTh,
} from "@/components/reports/ReportChrome";
import { useReport } from "@/components/reports/useReport";
import { SelectFolderModal } from "@/components/SelectFolderModal";
import type { TreeFolder } from "@/components/FolderPane";
import { api } from "@/lib/api";

type Row = {
  fromId: string;
  from: string;
  destCount: number;
  destLabel: string;
  items: number;
  qty: number;
  value: number;
};

export default function MoveSummaryPage() {
  const r = useReport<Row>("move-summary");
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [pick, setPick] = useState<"source" | "dest" | null>(null);

  useEffect(() => {
    api<{ tree: TreeFolder[]; rootId?: string }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.rootId || d.tree.find((f) => !f.parentId)?.id || "");
    });
  }, []);

  const sourceName = tree.find((f) => f.id === r.sourceFolderId)?.name;
  const destName = tree.find((f) => f.id === r.destFolderId)?.name;

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <ReportHeader title="Move Summary" exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch value={r.q} onChange={r.setQ} onSubmit={() => r.applySearch()} scanning={r.scanning} onToggleScan={() => r.setScanning((v) => !v)} />
          <FilterChip label={sourceName ? `Source: ${sourceName}` : "Source: Any folder"} active={Boolean(r.sourceFolderId)} onClick={() => setPick("source")} />
          <FilterChip label={destName ? `Destination: ${destName}` : "Destination: Any folder"} active={Boolean(r.destFolderId)} onClick={() => setPick("dest")} />
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
          <div className="flex flex-wrap gap-x-10 gap-y-3 pb-5 text-[13px] text-[#8a9a93]">
            <Stat label="Sources" value={r.stats.sources} />
            <Stat label="Destinations" value={r.stats.destinations} />
            <Stat label="Items Moved" value={r.stats.items} />
            <Stat label="Quantity Moved" value={`${r.stats.quantity} units`} />
            <Stat label="Value" value={r.hidePrices ? "—" : formatMoney(r.stats.value)} />
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {r.error ? <p className="p-6 text-sm text-danger">{r.error}</p> : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6ebe8]">
              <SortTh label="Source folder" col="from" sort={r.sort || "items"} dir={r.dir} onSort={r.onSort} />
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Destination folder</th>
              <SortTh label="Items moved" col="items" sort={r.sort || "items"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Quantity moved" col="qty" sort={r.sort || "items"} dir={r.dir} onSort={r.onSort} />
              {r.hidePrices ? null : <SortTh label="Value" col="value" sort={r.sort || "items"} dir={r.dir} onSort={r.onSort} />}
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => (
              <tr key={row.fromId} className="border-b border-[#eef2f0]">
                <td className="px-4 py-3 font-medium">{row.from}</td>
                <td className="px-4 py-3 text-[#6b7c74]">
                  <span className="mr-2 text-[#c5d0cb]">→</span>
                  {row.destLabel}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/reports/transactions?action=move&folderId=${encodeURIComponent(row.fromId)}`} className="hover:text-primary">
                    {row.items}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.qty} units</td>
                {r.hidePrices ? null : <td className="px-4 py-3">{formatMoney(row.value)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {r.rows && r.rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">No moves in this range.</p> : null}
      </div>
      <ReportPager page={r.page} pageSize={r.pageSize} total={r.total} onPage={r.setPage} onPageSize={r.setPageSize} />
      <SelectFolderModal
        open={Boolean(pick)}
        title={pick === "dest" ? "Destination folder" : "Source folder"}
        tree={tree}
        rootId={rootId}
        selectedId={(pick === "dest" ? r.destFolderId : r.sourceFolderId) || rootId}
        onClose={() => setPick(null)}
        onSelect={(id) => {
          const next = id === rootId ? "" : id;
          if (pick === "dest") r.setDestFolderId(next);
          else r.setSourceFolderId(next);
          r.setPage(1);
          setPick(null);
        }}
      />
    </ReportsShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[22px] font-semibold text-[#1c2b25]">{value}</div>
      <div>{label}</div>
    </div>
  );
}
