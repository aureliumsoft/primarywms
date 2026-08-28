"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api, toast } from "@/lib/api";
import { formatWorkflowDate, INVOICE_STATUS } from "@/components/workflows/defs";
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
  customerName: string;
  updatedAt: string;
  createdAt: string;
};

function statusTone(status: string) {
  if (status === "DRAFT") return "draft" as const;
  if (status === "PAID") return "complete" as const;
  if (status === "OPEN" || status === "OVERDUE") return "active" as const;
  return "neutral" as const;
}

export default function InvoicesPage() {
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
    api<{ invoices: Row[]; total: number }>(`/api/v1/invoices?${params}`)
      .then((d) => {
        setRows(d.invoices);
        setTotal(d.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load invoices"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, pageSize, appliedQ, status]);

  async function createDraft() {
    setCreating(true);
    try {
      const res = await api<{ invoice: { id: string } }>("/api/v1/invoices", { method: "POST" });
      router.push(`/invoices/${res.invoice.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invoice");
    } finally {
      setCreating(false);
    }
  }

  return (
    <WorkflowsShell>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <WorkflowHeader
          title="Invoices"
          subtitle="Generate invoices from inventory usage and track payment status."
          newLabel="New invoice"
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
          statusOptions={Object.entries(INVOICE_STATUS).map(([value, label]) => ({ value, label }))}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {error ? <p className="p-8 text-sm text-danger">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <WorkflowEmpty
              icon={FileText}
              title="Create your first invoice"
              body="Build draft invoices from inventory lines and export when ready."
              ctaLabel="New invoice"
              onCreate={() => void createDraft()}
              pending={creating}
            />
          ) : null}
          {!loading && rows.length > 0 ? (
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#f7f8f8] text-[11px] font-semibold uppercase tracking-wide text-[#8a9a93]">
                <tr>
                  <th className="px-8 py-3">Invoice #</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date created</th>
                  <th className="px-8 py-3">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef2f0] hover:bg-[#f8faf9]">
                    <td className="px-8 py-3.5">
                      <Link href={`/invoices/${row.id}`} className="font-semibold text-primary hover:underline">
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <WorkflowStatusBadge label={INVOICE_STATUS[row.status] ?? row.status} tone={statusTone(row.status)} />
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{row.customerName}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.createdAt)}</td>
                    <td className="px-8 py-3.5 text-[#5c6b64]">{formatWorkflowDate(row.updatedAt)}</td>
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
