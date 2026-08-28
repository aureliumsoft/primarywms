"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

export function ItemPageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full overflow-y-auto bg-[#f4f6f5]">{children}</div>;
}

export function ItemHeader({
  breadcrumb,
  sid,
  updatedAt,
  name,
  actions,
}: {
  breadcrumb: React.ReactNode;
  sid: string;
  updatedAt: string;
  name: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-[#e6ebe8] bg-white px-6 py-5 lg:px-8">
      <div className="text-[13px] text-[#8a9a93]">{breadcrumb}</div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[12px] text-[#8a9a93]">
            <Link href={`/items?q=${encodeURIComponent(sid)}`} className="font-medium text-primary hover:underline">
              {sid}
            </Link>
            <span className="mx-1.5">·</span>
            Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#1c2b25]">{name}</h1>
        </div>
        {actions}
      </div>
    </header>
  );
}

export function ItemStatGrid({
  stats,
}: {
  stats: { label: string; value: string | number; onClick?: () => void; hint?: string }[];
}) {
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e6ebe8] bg-[#e6ebe8] md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn("bg-white px-5 py-4", stat.onClick && "cursor-pointer hover:bg-[#fafbfb]")}
          onClick={stat.onClick}
          onKeyDown={stat.onClick ? (e) => e.key === "Enter" && stat.onClick?.() : undefined}
          role={stat.onClick ? "button" : undefined}
          tabIndex={stat.onClick ? 0 : undefined}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">{stat.label}</div>
          <div className="mt-1 text-[22px] font-bold text-[#1c2b25]">{stat.value}</div>
          {stat.hint ? <div className="mt-0.5 text-[12px] text-primary">{stat.hint}</div> : null}
        </div>
      ))}
    </section>
  );
}

export function ItemSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e6ebe8] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[#1c2b25]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ItemFieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#eef2ef] py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-[#8a9a93]">{label}</span>
      <div className="min-w-0 flex-1 text-[14px] text-[#2a3a33] sm:text-right">{children}</div>
    </div>
  );
}

export function ItemPrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

export function ItemSecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center rounded-md border border-[#d8dfdb] bg-white px-4 text-[13px] font-medium text-[#3d4f47] hover:bg-[#f4f6f5] disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

export function ItemTabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-4 flex gap-1 border-b border-[#e6ebe8]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "border-b-2 px-4 py-2 text-[13px] font-semibold transition-colors",
            active === tab.id ? "border-primary text-primary" : "border-transparent text-[#8a9a93] hover:text-[#3d4f47]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
