"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatMoney, formatWorkflowDate, INVOICE_STATUS } from "@/components/workflows/defs";
import { WorkflowStatusBadge } from "@/components/workflows/WorkflowChrome";
import { WorkflowsShell } from "@/components/workflows/WorkflowsShell";

type Doc = {
  id: string;
  number: string;
  status: string;
  customerName: string;
  customerEmail: string | null;
  dateIssued: string | null;
  dateDue: string | null;
  total: number;
  lines: { id: string; itemName: string; quantity: number; unitRate: number; amount: number }[];
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ invoice: Doc }>(`/api/v1/invoices/${id}`)
      .then((d) => setDoc(d.invoice))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load invoice"));
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
            <Link href="/invoices" className="hover:text-primary">
              Invoices
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">{doc?.number ?? "Invoice"}</h1>
            {doc ? <WorkflowStatusBadge label={INVOICE_STATUS[doc.status] ?? doc.status} tone="draft" /> : null}
          </div>
        </header>
        {error ? <p className="p-8 text-sm text-danger">{error}</p> : null}
        {!doc && !error ? <p className="p-8 text-[14px] text-[#8a9a93]">Loading…</p> : null}
        {doc ? (
          <div className="space-y-6 p-8">
            <section className="rounded-xl border border-[#e6ebe8] bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer" value={doc.customerName} />
                <Field label="Customer email" value={doc.customerEmail ?? "—"} />
                <Field label="Date issued" value={formatWorkflowDate(doc.dateIssued)} />
                <Field label="Date due" value={formatWorkflowDate(doc.dateDue)} />
                <Field label="Total" value={formatMoney(doc.total)} />
              </div>
            </section>
            <section className="rounded-xl border border-[#e6ebe8] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-[15px] font-semibold text-[#6b7c74]">Line items</h2>
              {doc.lines.length === 0 ? (
                <p className="text-[14px] text-[#8a9a93]">Add items from inventory to this invoice.</p>
              ) : (
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#eef2f0] text-[11px] uppercase text-[#8a9a93]">
                      <th className="py-2">Description</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Unit rate</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.lines.map((line) => (
                      <tr key={line.id} className="border-b border-[#eef2f0]">
                        <td className="py-2.5">{line.itemName}</td>
                        <td className="py-2.5">{line.quantity}</td>
                        <td className="py-2.5">{formatMoney(line.unitRate)}</td>
                        <td className="py-2.5">{formatMoney(line.amount)}</td>
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
