"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import { api, toast } from "@/lib/api";
import { formatWorkflowDate, STOCK_COUNT_STATUS } from "@/components/workflows/defs";
import {
  WorkflowEmpty,
  WorkflowHeader,
  WorkflowPager,
  WorkflowStatusBadge,
  WorkflowToolbar,
} from "@/components/workflows/WorkflowChrome";
import { WorkflowsShell } from "@/components/workflows/WorkflowsShell";

type Row = {
  id: string;
  number: string;
  status: string;
  assignedTo: { name: string | null } | null;
  dueDate: string | null;
  itemCount: number;
  discrepantItems: number;
  resolvedItems: number;
  updatedAt: string;
  createdBy: { name: string | null } | null;
  startedAt: string | null;
};

function statusTone(status: string) {
  if (status === "DRAFT") return "draft" as const;
  if (status === "COMPLETE") return "complete" as const;
  if (status === "IN_PROGRESS" || status === "READY_TO_COUNT") return "active" as const;
  return "neutral" as const;
}

export default function StockCountsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (appliedQ) params.set("q", appliedQ);
    if (status) params.set("status", status);
    api<{ stockCounts: Row[]; total: number }>(`/api/v1/stock-counts?${params}`)
      .then((d) => {
        setRows(d.stockCounts);
        setTotal(d.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load stock counts"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, pageSize, appliedQ, status]);

  async function createDraft() {
    setCreating(true);
    try {
      const res = await api<{ stockCount: { id: string } }>("/api/v1/stock-counts", { method: "POST" });
      router.push(`/stock-counts/${res.stockCount.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create stock count");
    } finally {
      setCreating(false);
    }
  }

  return (
    <WorkflowsShell>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <WorkflowHeader
          title="Stock Counts"
          subtitle="Verify inventory on hand and keep quantities accurate."
          newLabel="New stock count"
          onCreate={() => void createDraft()}
          creating={creating}
        />
        <WorkflowToolbar
          q={q}
          onQChange={setQ}
          onSearch={() => {
            setPage(1);
            setAppliedQ(q);
          }}
          status={status}
          onStatusChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
          statusOptions={Object.entries(STOCK_COUNT_STATUS).map(([value, label]) => ({ value, label }))}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {error ? <p className="p-8 text-sm text-danger">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <WorkflowEmpty
              icon={Hash}
              title="Create your first stock count"
              body="Assign a count, add items, and reconcile discrepancies when you're ready."
              ctaLabel="New stock count"
              onCreate={() => void createDraft()}
              pending={creating}
            />
          ) : null}
          {!loading && rows.length > 0 ? (
            <table className="w-full min-w-[1050px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#f7f8f8] text-[11px] font-semibold uppercase tracking-wide text-[#8a9a93]">
                <tr>
                  <th className="px-8 py-3">Stock count #</th>
                  <th className="px-4 py-3">Assigned to</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Item count</th>
                  <th className="px-4 py-3">Discrepant items</th>
                  <th className="px-4 py-3">Resolved items</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3">Created by</th>
                  <th className="px-8 py-3">Started date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef2f0] hover:bg-[#f8faf9]">
                    <td className="px-8 py-3.5">
                      <Link href={`/stock-counts/${row.id}`} className="font-semibold text-primary hover:underline">
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.assignedTo?.name ?? "Everyone"}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.dueDate)}</td>
                    <td className="px-4 py-3.5">
                      <WorkflowStatusBadge label={STOCK_COUNT_STATUS[row.status] ?? row.status} tone={statusTone(row.status)} />
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.itemCount}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.discrepantItems}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.resolvedItems}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.createdBy?.name ?? "—"}</td>
                    <td className="px-8 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        {!loading && total > 0 ? (
          <WorkflowPager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={setPageSize} />
        ) : null}
      </div>
    </WorkflowsShell>
  );
}
