"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { Barcode, Calendar, ChevronDown, ChevronLeft, ChevronRight, Search, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { downloadApi } from "@/lib/download";
import { toast } from "@/lib/api";
import { PAGE_SIZE_OPTIONS } from "@primarywms/shared";

export type DatePreset = "today" | "yesterday" | "week" | "last-week" | "month" | "last-month" | "custom";

export function rangeForPreset(preset: DatePreset, customFrom = "", customTo = "") {
  const now = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "today":
      return { from: fmt(startOfDay(now)), to: fmt(endOfDay(now)) };
    case "yesterday": {
      const d = subDays(now, 1);
      return { from: fmt(startOfDay(d)), to: fmt(endOfDay(d)) };
    }
    case "week":
      return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case "last-week": {
      const d = subDays(now, 7);
      return { from: fmt(startOfWeek(d, { weekStartsOn: 1 })), to: fmt(endOfWeek(d, { weekStartsOn: 1 })) };
    }
    case "last-month": {
      const d = subMonths(now, 1);
      return { from: fmt(startOfMonth(d)), to: fmt(endOfMonth(d)) };
    }
    case "custom":
      return { from: customFrom, to: customTo };
    default:
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
  }
}

export function presetLabel(preset: DatePreset, from: string, to: string) {
  const names: Record<DatePreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    week: "This Week",
    "last-week": "Last Week",
    month: "This Month",
    "last-month": "Last Month",
    custom: "Custom",
  };
  const a = from ? format(new Date(`${from}T00:00:00`), "dd/MM/yyyy") : "";
  const b = to ? format(new Date(`${to}T00:00:00`), "dd/MM/yyyy") : "";
  return a && b ? `${names[preset]} ${a} - ${b}` : names[preset];
}

export function ReportHeader({
  title,
  exportPath,
  extra,
}: {
  title: string;
  exportPath?: string;
  extra?: React.ReactNode;
}) {
  async function exportFile(format: "csv" | "xlsx") {
    if (!exportPath) return;
    const url = exportPath.includes("?") ? `${exportPath}&format=${format}` : `${exportPath}?format=${format}`;
    try {
      await downloadApi(url);
      toast.success(format === "xlsx" ? "Spreadsheet downloaded" : "CSV downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[12px] text-[#8a9a93]">Default Report</p>
        <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <button
          type="button"
          title="Email schedule (coming soon)"
          onClick={() => toast.info("Report email subscriptions are coming later.")}
          className="flex h-10 w-10 items-center justify-center rounded-md text-[#6b7c74] hover:bg-[#f4f6f5]"
        >
          <Calendar className="h-5 w-5" />
        </button>
        {exportPath ? (
          <div className="relative">
            <ExportMenu onCsv={() => void exportFile("csv")} onXlsx={() => void exportFile("xlsx")} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExportMenu({ onCsv, onXlsx }: { onCsv: () => void; onXlsx: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
      >
        <Upload className="h-4 w-4" />
        Export
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-lg">
          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#f4f6f5]" onClick={() => { setOpen(false); onCsv(); }}>
            CSV
          </button>
          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#f4f6f5]" onClick={() => { setOpen(false); onXlsx(); }}>
            Excel (.xlsx)
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReportSearch({
  value,
  onChange,
  onSubmit,
  scanning,
  onToggleScan,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  scanning: boolean;
  onToggleScan: () => void;
  placeholder?: string;
}) {
  return (
    <form
      className="relative min-w-[220px] flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "h-10 w-full rounded-md border bg-white pl-9 pr-12 text-sm text-[#3d4f47] outline-none placeholder:text-[#9aa6a0]",
          scanning ? "border-[#8a9a93]" : "border-[#d8dfdb]",
        )}
      />
      <button
        type="button"
        title={scanning ? "Close scanning mode" : "Scan QR / barcode"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggleScan}
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded",
          scanning ? "bg-[#3d4f47] text-white" : "text-[#8a9a93] hover:bg-[#f4f6f5]",
        )}
      >
        <Barcode className="h-4 w-4" />
      </button>
    </form>
  );
}

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md px-3 text-[13px]",
        active ? "bg-[#3d4f47] text-white" : "bg-[#f4f6f5] text-[#3d4f47] hover:bg-[#e8ecea]",
      )}
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  );
}

export function DateRangeButton({
  preset,
  from,
  to,
  open,
  onToggle,
  onPreset,
  onCustom,
}: {
  preset: DatePreset;
  from: string;
  to: string;
  open: boolean;
  onToggle: () => void;
  onPreset: (preset: DatePreset) => void;
  onCustom: (from: string, to: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-md bg-[#f4f6f5] px-3 text-[13px] text-[#3d4f47]",
          open && "bg-[#3d4f47] text-white",
        )}
      >
        <Calendar className="h-4 w-4" />
        {presetLabel(preset, from, to)}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 w-56 rounded-lg border border-[#e6ebe8] bg-white py-2 shadow-[0_8px_24px_rgb(16_24_20/0.14)]">
          {(
            [
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["week", "This Week"],
              ["last-week", "Last Week"],
              ["month", "This Month"],
              ["last-month", "Last Month"],
            ] as [DatePreset, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn("block w-full px-4 py-1.5 text-left text-[13px] hover:bg-[#f4f6f5]", preset === id && "text-primary")}
              onClick={() => onPreset(id)}
            >
              {label}
            </button>
          ))}
          <div className="mt-2 border-t border-[#eef2f0] px-4 pt-2">
            <p className="mb-1 text-[11px] font-bold uppercase text-[#8a9a93]">Custom</p>
            <div className="flex flex-col gap-2">
              <input type="date" className="h-8 rounded border border-[#d8dfdb] px-2 text-[12px]" value={from} onChange={(e) => onCustom(e.target.value, to)} />
              <input type="date" className="h-8 rounded border border-[#d8dfdb] px-2 text-[12px]" value={to} onChange={(e) => onCustom(from, e.target.value)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ScanningBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between bg-[#f4f6f5] px-6 py-2.5 text-[13px] text-[#e24b4b]">
      <span>Scanning mode is enabled. Please use handheld scanner to perform search.</span>
      <button type="button" className="inline-flex items-center gap-1.5 hover:underline" onClick={onClose}>
        Close scanning mode
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ReportPager({
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
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <footer className="flex items-center justify-between border-t border-[#e6ebe8] bg-white px-6 py-3 text-sm text-[#6b7c74]">
      <label className="flex items-center gap-2 text-[13px]">
        Show:
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-8 rounded-md border border-[#d8dfdb] bg-white px-2 text-[13px] outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        per page
      </label>
      <div className="flex items-center gap-2 text-[13px]">
        <span>
          {from}-{to} of {total}
        </span>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded p-1 hover:bg-[#f4f6f5] disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded p-1 hover:bg-[#f4f6f5] disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </footer>
  );
}

export function SortTh({
  label,
  col,
  sort,
  dir,
  onSort,
  className,
}: {
  label: string;
  col: string;
  sort: string;
  dir: "ASC" | "DESC";
  onSort: (col: string) => void;
  className?: string;
}) {
  const active = sort === col;
  return (
    <th className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]", className)}>
      <button type="button" className={cn("inline-flex items-center gap-1", active && "text-[#3d4f47]")} onClick={() => onSort(col)}>
        {label}
        {active ? (dir === "ASC" ? " ↑" : " ↓") : null}
      </button>
    </th>
  );
}

export function ChipMenu({
  label,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  active?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <FilterChip label={label} active={active} onClick={onToggle} />
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-20" aria-label="Close" onClick={onToggle} />
          <div className="absolute left-0 top-11 z-30 max-h-64 w-56 overflow-auto rounded-lg border border-[#e6ebe8] bg-white py-1 shadow-lg">{children}</div>
        </>
      ) : null}
    </div>
  );
}

export function ChipOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f4f6f5]" onClick={onClick}>
      {label}
    </button>
  );
}
