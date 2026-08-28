"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { api, toast } from "@/lib/api";
import { formatMoney, formatWorkflowDate, PO_STATUS } from "@/components/workflows/defs";
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
  vendorName: string;
  status: string;
  orderTotal: number;
  updatedAt: string;
  dateOrdered: string | null;
  dateExpected: string | null;
  dateReceived: string | null;
  shipToLabel: string;
  createdBy: { name: string | null } | null;
  submittedBy: { name: string | null } | null;
};

function statusTone(status: string) {
  if (status === "DRAFT") return "draft" as const;
  if (status === "RECEIVED" || status === "CLOSED") return "complete" as const;
  if (status === "ORDERED" || status === "APPROVED") return "active" as const;
  return "neutral" as const;
}

export default function PurchaseOrdersPage() {
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
    api<{ purchaseOrders: Row[]; total: number }>(`/api/v1/purchase-orders?${params}`)
      .then((d) => {
        setRows(d.purchaseOrders);
        setTotal(d.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load purchase orders"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, pageSize, appliedQ, status]);

  async function createDraft() {
    setCreating(true);
    try {
      const res = await api<{ purchaseOrder: { id: string } }>("/api/v1/purchase-orders", { method: "POST" });
      router.push(`/purchase-orders/${res.purchaseOrder.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create purchase order");
    } finally {
      setCreating(false);
    }
  }

  return (
    <WorkflowsShell>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <WorkflowHeader
          title="Purchase Orders"
          subtitle="Simplify procurement and track orders from request through receipt."
          newLabel="New purchase order"
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
          statusOptions={Object.entries(PO_STATUS).map(([value, label]) => ({ value, label }))}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {error ? <p className="p-8 text-sm text-danger">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <WorkflowEmpty
              icon={ShoppingCart}
              title="Create your first purchase order"
              body="Track vendors, line items, and receiving against open orders."
              ctaLabel="New purchase order"
              onCreate={() => void createDraft()}
              pending={creating}
            />
          ) : null}
          {!loading && rows.length > 0 ? (
            <table className="w-full min-w-[1100px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#f7f8f8] text-[11px] font-semibold uppercase tracking-wide text-[#8a9a93]">
                <tr>
                  <th className="px-8 py-3">PO #</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Order total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3">Date ordered</th>
                  <th className="px-4 py-3">Date expected</th>
                  <th className="px-4 py-3">Date received</th>
                  <th className="px-4 py-3">Ship to</th>
                  <th className="px-4 py-3">Created by</th>
                  <th className="px-8 py-3">Submitted by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef2f0] hover:bg-[#f8faf9]">
                    <td className="px-8 py-3.5">
                      <Link href={`/purchase-orders/${row.id}`} className="font-semibold text-primary hover:underline">
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.vendorName}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatMoney(row.orderTotal)}</td>
                    <td className="px-4 py-3.5">
                      <WorkflowStatusBadge label={PO_STATUS[row.status] ?? row.status} tone={statusTone(row.status)} />
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.dateOrdered)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.dateExpected)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.dateReceived)}</td>
                    <td className="max-w-[180px] truncate px-4 py-3.5 text-[#5c6b64]" title={row.shipToLabel}>
                      {row.shipToLabel}
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.createdBy?.name ?? "—"}</td>
                    <td className="px-8 py-3.5 text-[#5c6b64]">{row.submittedBy?.name ?? "—"}</td>
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
