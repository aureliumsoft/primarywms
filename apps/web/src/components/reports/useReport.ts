"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, toast } from "@/lib/api";
import { type DatePreset, rangeForPreset } from "./ReportChrome";

export function useReport<T>(type: string, dated = true) {
  const initial = dated ? rangeForPreset("month") : { from: "", to: "" };
  const [preset, setPreset] = useState<DatePreset>(dated ? "month" : "custom");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [sourceFolderId, setSourceFolderId] = useState("");
  const [destFolderId, setDestFolderId] = useState("");
  const [sid, setSid] = useState("");
  const [itemId, setItemId] = useState("");
  const [group, setGroup] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("");
  const [dir, setDir] = useState<"ASC" | "DESC">("DESC");
  const [scanning, setScanning] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [rows, setRows] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [hidePrices, setHidePrices] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const params = useMemo(() => {
    const sp = new URLSearchParams({ type, page: String(page), pageSize: String(pageSize) });
    if (dated && from) sp.set("from", from);
    if (dated && to) sp.set("to", to);
    if (appliedQ.trim()) sp.set("q", appliedQ.trim());
    if (action) sp.set("action", action);
    if (userId) sp.set("userId", userId);
    if (folderId) sp.set("folderId", folderId);
    if (sourceFolderId) sp.set("sourceFolderId", sourceFolderId);
    if (destFolderId) sp.set("destFolderId", destFolderId);
    if (sid) sp.set("sid", sid);
    if (itemId) sp.set("itemId", itemId);
    if (group) sp.set("group", "1");
    if (sort) sp.set("sort", sort);
    sp.set("dir", dir);
    return sp;
  }, [action, appliedQ, dated, destFolderId, dir, folderId, from, group, itemId, page, pageSize, sid, sort, sourceFolderId, to, type, userId]);

  const load = useCallback(async () => {
    try {
      const data = await api<{ rows: T[]; total: number; hidePrices?: boolean; stats?: Record<string, number> }>(`/api/v1/reports?${params}`);
      setRows(data.rows);
      setTotal(data.total);
      setHidePrices(Boolean(data.hidePrices));
      setStats(data.stats ?? null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load report");
      setRows([]);
    }
  }, [params]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    api<{ members?: { id: string; firstName: string; lastName: string }[] }>("/api/v1/settings/lookups")
      .then((d) => setUsers(d.members ?? []))
      .catch(() => undefined);
  }, []);

  function applyPreset(next: DatePreset) {
    const range = rangeForPreset(next, from, to);
    setPreset(next);
    setFrom(range.from);
    setTo(range.to);
    setDateOpen(false);
    setPage(1);
  }

  function applyCustom(nextFrom: string, nextTo: string) {
    setPreset("custom");
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  }

  function applySearch(value = q) {
    setAppliedQ(value);
    setPage(1);
  }

  function onSort(col: string) {
    if (sort === col) setDir(dir === "DESC" ? "ASC" : "DESC");
    else {
      setSort(col);
      setDir(col === "name" || col === "from" ? "ASC" : "DESC");
    }
    setPage(1);
  }

  return {
    preset,
    from,
    to,
    q,
    setQ,
    action,
    setAction,
    userId,
    setUserId,
    folderId,
    setFolderId,
    sourceFolderId,
    setSourceFolderId,
    destFolderId,
    setDestFolderId,
    sid,
    setSid,
    itemId,
    setItemId,
    group,
    setGroup,
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    sort,
    dir,
    scanning,
    setScanning,
    dateOpen,
    setDateOpen,
    rows,
    total,
    stats,
    hidePrices,
    error,
    users,
    params: params.toString(),
    applyPreset,
    applyCustom,
    applySearch,
    onSort,
    reload: load,
    toast,
  };
}
