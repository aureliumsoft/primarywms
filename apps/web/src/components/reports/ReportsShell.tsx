"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { REPORTS } from "./defs";

export function ReportsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return REPORTS;
    return REPORTS.filter((r) => r.title.toLowerCase().includes(needle) || r.body.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#e6ebe8] bg-[#f4f6f5] md:flex">
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports"
              className="h-9 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-[13px] text-[#3d4f47] outline-none placeholder:text-[#9aa6a0] focus:border-primary"
            />
          </div>
        </div>
        <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-[#8a9a93]">No matching reports</p>
          ) : (
            visible.map((report) => {
              const active = pathname === report.href || (report.href !== "/reports" && pathname.startsWith(report.href));
              const Icon = report.icon;
              const hasNested = REPORTS.some((child) => child.parent === report.href);
              return (
                <Link
                  key={report.href}
                  href={report.href}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium",
                    report.nested && "ml-5",
                    active ? "bg-[#e4e9e6] text-primary" : "text-[#3d4f47] hover:bg-[#e8ecea]",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-[#8a9a93]")} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate">{report.title}</span>
                  {hasNested ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#8a9a93]" /> : null}
                </Link>
              );
            })
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-white">{children}</div>
    </div>
  );
}
