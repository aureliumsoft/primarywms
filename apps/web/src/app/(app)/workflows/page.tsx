"use client";

import Link from "next/link";
import { WORKFLOWS } from "@/components/workflows/defs";
import { WorkflowsShell } from "@/components/workflows/WorkflowsShell";

export default function WorkflowsHubPage() {
  return (
    <WorkflowsShell>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8f8]">
        <header className="border-b border-[#e6ebe8] bg-white px-8 pb-6 pt-7">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">Workflows</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#6b7c74]">
            Workflows are actions you can take on your inventory that interact with quantities.
          </p>
        </header>
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {WORKFLOWS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-[#e6ebe8] bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f3f1] text-[#5c6b64]">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[17px] font-semibold text-[#1c2b25]">{item.title}</h2>
                  {item.badge ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-[#6b7c74]">{item.body}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </WorkflowsShell>
  );
}
