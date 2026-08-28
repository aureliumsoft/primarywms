"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { WORKFLOWS } from "./defs";

export function WorkflowsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return WORKFLOWS;
    return WORKFLOWS.filter((w) => w.title.toLowerCase().includes(needle) || w.body.toLowerCase().includes(needle));
  }, [q]);

  const hubActive = pathname === "/workflows";

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#e6ebe8] bg-[#f4f6f5] md:flex">
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search workflows"
              className="h-9 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-[13px] text-[#3d4f47] outline-none placeholder:text-[#9aa6a0] focus:border-primary"
            />
          </div>
        </div>
        <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
          <Link
            href="/workflows"
            className={cn(
              "mb-1 flex w-full items-center rounded-md px-2.5 py-1.5 text-[13px] font-medium",
              hubActive ? "bg-[#e4e9e6] text-primary" : "text-[#3d4f47] hover:bg-[#e8ecea]",
            )}
          >
            All workflows
          </Link>
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-[#8a9a93]">No matching workflows</p>
          ) : (
            visible.map((workflow) => {
              const active = pathname === workflow.href || pathname.startsWith(`${workflow.href}/`);
              const Icon = workflow.icon;
              return (
                <Link
                  key={workflow.href}
                  href={workflow.href}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium",
                    active ? "bg-[#e4e9e6] text-primary" : "text-[#3d4f47] hover:bg-[#e8ecea]",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-[#8a9a93]")} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate">{workflow.title}</span>
                  {workflow.badge ? (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {workflow.badge}
                    </span>
                  ) : null}
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
