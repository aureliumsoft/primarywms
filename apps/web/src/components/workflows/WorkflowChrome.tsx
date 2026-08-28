"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { ReportPager } from "@/components/reports/ReportChrome";

export function WorkflowHeader({
  title,
  subtitle,
  newHref,
  newLabel,
  onCreate,
  creating,
  settingsHref,
  settingsLabel = "Settings",
}: {
  title: string;
  subtitle: string;
  newHref?: string;
  newLabel?: string;
  onCreate?: () => void;
  creating?: boolean;
  settingsHref?: string;
  settingsLabel?: string;
}) {
  return (
    <header className="border-b border-[#e6ebe8] px-8 pb-5 pt-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[13px] text-[#8a9a93]">
            <Link href="/workflows" className="hover:text-primary">
              Workflows
            </Link>
            <span className="mx-1.5">›</span>
            {title}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">{title}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#6b7c74]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {settingsHref ? (
            <Link
              href={settingsHref}
              className="inline-flex h-10 items-center rounded-md border border-[#d8dfdb] px-3 text-[13px] font-medium text-[#3d4f47] hover:bg-[#f4f6f5]"
            >
              {settingsLabel}
            </Link>
          ) : null}
          {newHref && newLabel ? (
            <Link
              href={newHref}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              {newLabel}
            </Link>
          ) : onCreate && newLabel ? (
            <button
              type="button"
              disabled={creating}
              onClick={onCreate}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Creating…" : newLabel}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function WorkflowToolbar({
  q,
  onQChange,
  onSearch,
  status,
  onStatusChange,
  statusOptions,
}: {
  q: string;
  onQChange: (value: string) => void;
  onSearch: () => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#e6ebe8] px-8 py-4">
      <form
        className="relative min-w-[240px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa6a0]" />
        <input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search"
          className="h-10 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </form>
      {statusOptions && onStatusChange ? (
        <select
          className="h-10 rounded-md border border-[#d8dfdb] bg-white px-3 text-[13px]"
          value={status ?? ""}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export function WorkflowEmpty({
  icon: Icon,
  title,
  body,
  ctaHref,
  ctaLabel,
  onCreate,
  pending,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel: string;
  onCreate?: () => void;
  pending?: boolean;
}) {
  const buttonClass =
    "mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-50";
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-[20px] font-semibold text-[#1c2b25]">{title}</h2>
      <p className="mt-2 max-w-md text-[14px] text-[#6b7c74]">{body}</p>
      {onCreate ? (
        <button type="button" className={buttonClass} disabled={pending} onClick={onCreate}>
          {pending ? "Creating…" : ctaLabel}
        </button>
      ) : ctaHref ? (
        <Link href={ctaHref} className={buttonClass}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function WorkflowStatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "active" | "draft" | "complete" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium",
        tone === "active" && "bg-primary-soft text-primary",
        tone === "draft" && "bg-[#fff6e8] text-[#9a6b1f]",
        tone === "complete" && "bg-[#eef2f0] text-[#5c6b64]",
        tone === "neutral" && "bg-[#eef2f0] text-[#5c6b64]",
      )}
    >
      {label}
    </span>
  );
}

export function WorkflowPager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return <ReportPager page={page} pageSize={pageSize} total={total} onPage={onPage} onPageSize={onPageSize} />;
}
