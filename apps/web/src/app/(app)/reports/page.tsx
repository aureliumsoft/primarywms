"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { ReportsShell } from "@/components/reports/ReportsShell";
import { HUB_CARDS } from "@/components/reports/defs";

export default function ReportsHubPage() {
  return (
    <ReportsShell>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="border-b border-[#e6ebe8] px-8 pb-6 pt-7">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">Reports</h1>
        </header>

        <div className="space-y-8 p-8">
          <section className="overflow-hidden rounded-2xl bg-primary px-6 py-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="flex items-center gap-2 text-[16px] font-semibold">
                  <Bookmark className="h-4 w-4" />
                  Saved Reports
                </h2>
                <p className="mt-6 text-[15px] font-semibold">+ Saving reports saves time!</p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-white/90">
                  <li>Click on a report type below.</li>
                  <li>Apply helpful filters to that report.</li>
                  <li>Export when you need a spreadsheet — saved reports are coming later.</li>
                </ol>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {HUB_CARDS.map((report) => {
              const Icon = report.icon;
              return (
                <Link
                  key={report.href}
                  href={report.href}
                  className="rounded-xl border border-[#e6ebe8] bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f3f1] text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[17px] font-semibold text-[#1c2b25]">{report.title}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#6b7c74]">{report.body}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </ReportsShell>
  );
}
