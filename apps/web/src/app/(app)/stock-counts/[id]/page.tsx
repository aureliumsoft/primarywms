"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatWorkflowDate, STOCK_COUNT_STATUS } from "@/components/workflows/defs";
import { WorkflowStatusBadge } from "@/components/workflows/WorkflowChrome";
import { WorkflowsShell } from "@/components/workflows/WorkflowsShell";

type Doc = {
  id: string;
  number: string;
  status: string;
  assignedTo: { name: string | null } | null;
  dueDate: string | null;
  itemCount: number;
  lines: { id: string; itemName: string; itemSid: string; expectedQty: number; countedQty: number | null }[];
};

export default function StockCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ stockCount: Doc }>(`/api/v1/stock-counts/${id}`)
      .then((d) => setDoc(d.stockCount))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load stock count"));
  }, [id]);

  return (
    <WorkflowsShell>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="border-b border-[#e6ebe8] px-8 pb-6 pt-7">
          <p className="mb-1 text-[13px] text-[#8a9a93]">
            <Link href="/workflows" className="hover:text-primary">
              Workflows
            </Link>
            <span className="mx-1.5">›</span>
            <Link href="/stock-counts" className="hover:text-primary">
              Stock Counts
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">{doc?.number ?? "Stock count"}</h1>
            {doc ? <WorkflowStatusBadge label={STOCK_COUNT_STATUS[doc.status] ?? doc.status} tone="draft" /> : null}
          </div>
        </header>
        {error ? <p className="p-8 text-sm text-danger">{error}</p> : null}
        {!doc && !error ? <p className="p-8 text-[14px] text-[#8a9a93]">Loading…</p> : null}
        {doc ? (
          <div className="space-y-6 p-8">
            <section className="rounded-xl border border-[#e6ebe8] bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Assigned to" value={doc.assignedTo?.name ?? "Everyone"} />
                <Field label="Due date" value={formatWorkflowDate(doc.dueDate)} />
              </div>
            </section>
            <section className="rounded-xl border border-[#e6ebe8] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-[15px] font-semibold text-[#6b7c74]">Items to count</h2>
              {doc.lines.length === 0 ? (
                <p className="text-[14px] text-[#8a9a93]">Add at least 1 item to this stock count.</p>
              ) : (
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#eef2f0] text-[11px] uppercase text-[#8a9a93]">
                      <th className="py-2">Item</th>
                      <th className="py-2">SID</th>
                      <th className="py-2">Expected</th>
                      <th className="py-2">Counted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.lines.map((line) => (
                      <tr key={line.id} className="border-b border-[#eef2f0]">
                        <td className="py-2.5">{line.itemName}</td>
                        <td className="py-2.5">{line.itemSid}</td>
                        <td className="py-2.5">{line.expectedQty}</td>
                        <td className="py-2.5">{line.countedQty ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </WorkflowsShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] text-[#8a9a93]">{label}</div>
      <div className="mt-1 text-[14px] text-[#1c2b25]">{value}</div>
    </div>
  );
}
