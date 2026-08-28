"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Bell, Calendar, Package, Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  ChipMenu,
  ChipOption,
  DateRangeButton,
  ReportPager,
  type DatePreset,
  rangeForPreset,
} from "@/components/reports/ReportChrome";

type Row = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  kind: "QUANTITY" | "DATE";
  item: { id: string; name: string; sid: string } | null;
  folder: { id: string; name: string } | null;
  href: string | null;
};

const TYPES = [
  ["", "Any type"],
  ["QUANTITY", "Quantity"],
  ["DATE", "Date"],
];

const STATUSES = [
  ["all", "Any status"],
  ["unread", "Unread"],
  ["read", "Read"],
];

export default function NotificationsPage() {
  const router = useRouter();
  const initial = rangeForPreset("month");
  const [preset, setPreset] = useState<DatePreset>("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dir, setDir] = useState<"ASC" | "DESC">("DESC");
  const [dateOpen, setDateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize), dir });
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (appliedQ.trim()) sp.set("q", appliedQ.trim());
    if (kind) sp.set("kind", kind);
    if (status !== "all") sp.set("status", status);
    return sp.toString();
  }, [appliedQ, dir, from, kind, page, pageSize, status, to]);

  const load = useCallback(async () => {
    try {
      const data = await api<{ rows: Row[]; total: number; unread: number }>(`/api/v1/notifications?${params}`);
      setRows(data.rows);
      setTotal(data.total);
      setUnread(data.unread);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
      setRows([]);
    }
  }, [params]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function markAll() {
    await api("/api/v1/notifications", { method: "PATCH", body: JSON.stringify({ markAll: true }) });
    load();
  }

  async function openRow(row: Row) {
    if (!row.readAt) {
      await api(`/api/v1/notifications/${row.id}`, { method: "PATCH", toast: false }).catch(() => undefined);
    }
    if (row.href) router.push(row.href);
    else load();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="border-b border-[#e6ebe8] px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">Notifications</h1>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAll()}
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
              >
                Mark all as read
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 pb-4">
          <form
            className="relative min-w-[220px] flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedQ(q);
              setPage(1);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              autoComplete="off"
              className="h-10 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-sm text-[#3d4f47] outline-none placeholder:text-[#9aa6a0]"
            />
          </form>
          <ChipMenu
            label={TYPES.find(([id]) => id === kind)?.[1] ?? "Any type"}
            active={Boolean(kind)}
            open={typeOpen}
            onToggle={() => setTypeOpen((v) => !v)}
          >
            {TYPES.map(([id, label]) => (
              <ChipOption
                key={id || "all"}
                label={label}
                onClick={() => {
                  setKind(id);
                  setPage(1);
                  setTypeOpen(false);
                }}
              />
            ))}
          </ChipMenu>
          <ChipMenu
            label={STATUSES.find(([id]) => id === status)?.[1] ?? "Any status"}
            active={status !== "all"}
            open={statusOpen}
            onToggle={() => setStatusOpen((v) => !v)}
          >
            {STATUSES.map(([id, label]) => (
              <ChipOption
                key={id}
                label={label}
                onClick={() => {
                  setStatus(id);
                  setPage(1);
                  setStatusOpen(false);
                }}
              />
            ))}
          </ChipMenu>
          <button
            type="button"
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-md px-3 text-[13px]",
              dir === "ASC" ? "bg-[#3d4f47] text-white" : "bg-[#f4f6f5] text-[#3d4f47] hover:bg-[#e8ecea]",
            )}
            onClick={() => {
              setDir((d) => (d === "DESC" ? "ASC" : "DESC"));
              setPage(1);
            }}
          >
            {dir === "DESC" ? "Newest first" : "Oldest first"}
          </button>
          <div className="ml-auto">
            <DateRangeButton
              preset={preset}
              from={from}
              to={to}
              open={dateOpen}
              onToggle={() => setDateOpen((v) => !v)}
              onPreset={(next) => {
                const range = rangeForPreset(next, from, to);
                setPreset(next);
                setFrom(range.from);
                setTo(range.to);
                setDateOpen(false);
                setPage(1);
              }}
              onCustom={(nextFrom, nextTo) => {
                setPreset("custom");
                setFrom(nextFrom);
                setTo(nextTo);
                setPage(1);
              }}
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? <p className="p-6 text-sm text-danger">{error}</p> : null}
        {rows === null ? <p className="px-6 py-16 text-center text-sm text-[#8a9a93]">Loading…</p> : null}
        {rows && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <Package className="h-14 w-14 text-[#c5d0cb]" strokeWidth={1.25} />
            <p className="mt-4 text-[18px] font-semibold text-[#1c2b25]">No notifications</p>
            <p className="mt-2 max-w-sm text-[13px] text-[#6b7c74]">
              You can try another{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setDateOpen(true)}>
                date range
              </button>{" "}
              or refine your{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  setKind("");
                  setStatus("all");
                  setAppliedQ("");
                  setQ("");
                  setPage(1);
                }}
              >
                filters
              </button>
              .
            </p>
          </div>
        ) : null}
        <ul>
          {(rows ?? []).map((row) => {
            const unreadRow = !row.readAt;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void openRow(row)}
                  className={cn(
                    "flex w-full items-start gap-4 border-b border-[#eef2f0] px-6 py-4 text-left hover:bg-[#f7f8f8]",
                    unreadRow && "bg-[#f4faf6]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      row.kind === "DATE" ? "bg-[#eef2f0] text-[#6b7c74]" : "bg-primary-soft text-primary",
                    )}
                  >
                    {row.kind === "DATE" ? <Calendar className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-[15px] text-[#1c2b25]", unreadRow ? "font-semibold" : "font-medium")}>{row.title}</span>
                      {unreadRow ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                      <span className="rounded-full bg-[#f4f6f5] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#6b7c74]">
                        {row.kind === "DATE" ? "Date" : "Quantity"}
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] text-[#5c6b64]">{row.body}</span>
                    {row.item || row.folder ? (
                      <span className="mt-1 block text-[12px] text-[#8a9a93]">
                        {row.item ? (
                          <>
                            {row.item.name}
                            {row.item.sid ? ` · ${row.item.sid}` : ""}
                          </>
                        ) : (
                          row.folder?.name
                        )}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 whitespace-nowrap pt-0.5 text-[12px] text-[#8a9a93]">
                    {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <ReportPager
        page={page}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
