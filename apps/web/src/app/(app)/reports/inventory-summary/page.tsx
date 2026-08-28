"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@primarywms/shared";
import { ReportsShell } from "@/components/reports/ReportsShell";
import { FilterChip, ReportHeader, ReportPager, ReportSearch, ScanningBanner, SortTh } from "@/components/reports/ReportChrome";
import { useReport } from "@/components/reports/useReport";
import { SelectFolderModal } from "@/components/SelectFolderModal";
import type { TreeFolder } from "@/components/FolderPane";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type Row = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  minQuantity: number | null;
  price: number | null;
  totalValue: number;
  folder: { id: string; name: string };
  unit?: { name: string; abbreviation: string } | null;
  locations?: number;
};

export default function InventorySummaryPage() {
  return <SummaryReport type="inventory-summary" title="Inventory Summary" />;
}

export function SummaryReport({ type, title }: { type: "inventory-summary" | "low-stock"; title: string }) {
  const r = useReport<Row>(type, false);
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);

  useEffect(() => {
    api<{ tree: TreeFolder[]; rootId?: string }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.rootId || d.tree.find((f) => !f.parentId)?.id || "");
    });
  }, []);

  const folderName = tree.find((f) => f.id === r.folderId)?.name;

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <ReportHeader title={title} exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch value={r.q} onChange={r.setQ} onSubmit={() => r.applySearch()} scanning={r.scanning} onToggleScan={() => r.setScanning((v) => !v)} />
          <FilterChip label={folderName ? folderName : "Any folder"} active={Boolean(r.folderId)} onClick={() => setFolderOpen(true)} />
          <label className="ml-auto flex items-center gap-2 text-[13px] text-[#5c6b64]">
            Group Items
            <button
              type="button"
              role="switch"
              aria-checked={r.group}
              onClick={() => {
                r.setGroup(!r.group);
                r.setPage(1);
              }}
              className={cn("relative h-5 w-9 rounded-full transition", r.group ? "bg-primary" : "bg-[#d8dfdb]")}
            >
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", r.group ? "left-4" : "left-0.5")} />
            </button>
          </label>
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
              <SortTh label="Name" col="name" sort={r.sort || "name"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Quantity" col="quantity" sort={r.sort || "name"} dir={r.dir} onSort={r.onSort} />
              <SortTh label="Min level" col="minQuantity" sort={r.sort || "name"} dir={r.dir} onSort={r.onSort} />
              {r.hidePrices ? null : <SortTh label="Price" col="price" sort={r.sort || "name"} dir={r.dir} onSort={r.onSort} />}
              {r.hidePrices ? null : <SortTh label="Value" col="totalValue" sort={r.sort || "name"} dir={r.dir} onSort={r.onSort} />}
              <SortTh label="Folder" col="folder" sort={r.sort || "name"} dir={r.dir} onSort={r.onSort} />
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => (
              <tr key={row.id + row.sid} className="border-b border-[#eef2f0]">
                <td className="px-4 py-3">
                  <Link
                    href={r.group && (row.locations ?? 1) > 1 ? `/items?q=${encodeURIComponent(row.sid)}` : `/item/${row.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {row.name}
                  </Link>
                  <div className="text-[12px] text-[#8a9a93]">{row.sid}</div>
                </td>
                <td className="px-4 py-3">
                  {row.quantity} {(row.unit?.name || row.unit?.abbreviation || "units").toLowerCase()}
                </td>
                <td className="px-4 py-3">{row.minQuantity ?? "—"}</td>
                {r.hidePrices ? null : <td className="px-4 py-3">{formatMoney(row.price ?? 0)}</td>}
                {r.hidePrices ? null : <td className="px-4 py-3">{formatMoney(row.totalValue)}</td>}
                <td className="px-4 py-3 text-[#6b7c74]">
                  {row.folder?.id ? (
                    <Link href={`/folder/${row.folder.id}/content`} className="hover:text-primary">
                      {row.folder.name}
                    </Link>
                  ) : (
                    row.folder?.name
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.rows && r.rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">No items match this report.</p> : null}
      </div>
      <ReportPager page={r.page} pageSize={r.pageSize} total={r.total} onPage={r.setPage} onPageSize={r.setPageSize} />
      <SelectFolderModal
        open={folderOpen}
        title="Filter by folder"
        tree={tree}
        rootId={rootId}
        selectedId={r.folderId || rootId}
        onClose={() => setFolderOpen(false)}
        onSelect={(id) => {
          r.setFolderId(id === rootId ? "" : id);
          r.setPage(1);
          setFolderOpen(false);
        }}
      />
    </ReportsShell>
  );
}
