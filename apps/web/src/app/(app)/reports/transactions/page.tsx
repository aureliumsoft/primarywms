"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@primarywms/shared";
import { ReportsShell } from "@/components/reports/ReportsShell";
import {
  ChipMenu,
  ChipOption,
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
  id: string;
  createdAt: string;
  typeLabel: string;
  qtyDelta: number | null;
  reason: string | null;
  note: string | null;
  item?: { id: string; name: string; sid: string } | null;
  unit?: { name: string; abbreviation: string } | null;
  folder?: { name: string } | null;
  user?: { firstName: string; lastName: string } | null;
  price: number | null;
  value: number | null;
};

const TYPES = [
  ["", "Any transaction"],
  ["move", "Move"],
  ["quantity", "Update Quantity"],
  ["create", "Create"],
  ["delete", "Delete"],
  ["merge", "Merge"],
];

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsReport />
    </Suspense>
  );
}

function TransactionsReport() {
  const r = useReport<Row>("transactions");
  const sp = useSearchParams();
  const [typeOpen, setTypeOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");

  useEffect(() => {
    api<{ tree: TreeFolder[]; rootId?: string }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.rootId || d.tree.find((f) => !f.parentId)?.id || "");
    });
  }, []);

  useEffect(() => {
    const sid = sp.get("sid");
    const itemId = sp.get("itemId");
    const action = sp.get("action");
    const folderId = sp.get("folderId");
    if (sid) r.setSid(sid);
    if (itemId) r.setItemId(itemId);
    if (action) r.setAction(action);
    if (folderId) r.setFolderId(folderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const folderName = tree.find((f) => f.id === r.folderId)?.name;

  return (
    <ReportsShell>
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <ReportHeader title="Transactions" exportPath={`/api/v1/reports?${r.params}`} />
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <ReportSearch value={r.q} onChange={r.setQ} onSubmit={() => r.applySearch()} scanning={r.scanning} onToggleScan={() => r.setScanning((v) => !v)} />
          <FilterChip label={folderName ? folderName : "Any folder"} active={Boolean(r.folderId)} onClick={() => setFolderOpen(true)} />
          <ChipMenu
            label={TYPES.find(([id]) => id === r.action)?.[1] ?? "Any transaction"}
            active={Boolean(r.action)}
            open={typeOpen}
            onToggle={() => setTypeOpen((v) => !v)}
          >
            {TYPES.map(([id, label]) => (
              <ChipOption
                key={id || "all"}
                label={label}
                onClick={() => {
                  r.setAction(id);
                  r.setPage(1);
                  setTypeOpen(false);
                }}
              />
            ))}
          </ChipMenu>
          <ChipMenu
            label={r.userId ? `${r.users.find((u) => u.id === r.userId)?.firstName ?? "User"} ${r.users.find((u) => u.id === r.userId)?.lastName ?? ""}`.trim() : "Any user"}
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
              <SortTh label="Transaction date" col="createdAt" sort={r.sort || "createdAt"} dir={r.dir} onSort={r.onSort} />
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Qty change</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Transaction type</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Folder</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">User</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Reason</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Notes</th>
              {r.hidePrices ? null : <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Value</th>}
            </tr>
          </thead>
          <tbody>
            {(r.rows ?? []).map((row) => {
              const qty = row.qtyDelta ?? 0;
              const unit = row.unit?.name?.toLowerCase() || row.unit?.abbreviation || "units";
              return (
                <tr key={row.id} className="border-b border-[#eef2f0]">
                  <td className="whitespace-nowrap px-4 py-3 text-[#6b7c74]">{format(new Date(row.createdAt), "HH:mm")}</td>
                  <td className="px-4 py-3">
                    {row.item ? (
                      <Link href={`/item/${row.item.id}`} className="font-medium hover:text-primary">
                        {row.item.sid || row.item.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium ${qty > 0 ? "text-primary" : qty < 0 ? "text-[#e24b4b]" : "text-[#6b7c74]"}`}>
                    {qty > 0 ? "+" : ""} {qty} {unit}
                  </td>
                  <td className="px-4 py-3">{row.typeLabel}</td>
                  <td className="px-4 py-3 text-[#6b7c74]">{row.folder?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6b7c74]">{row.user ? `${row.user.firstName} ${row.user.lastName}` : "—"}</td>
                  <td className="px-4 py-3 text-[#6b7c74]">{row.reason || "—"}</td>
                  <td className="px-4 py-3 text-[#6b7c74]">{row.note || "—"}</td>
                  {r.hidePrices ? null : <td className="px-4 py-3">{formatMoney(row.value ?? 0)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {r.rows && r.rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">No transactions in this range.</p> : null}
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
