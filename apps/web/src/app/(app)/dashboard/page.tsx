"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Box,
  ChevronRight,
  Folder,
  Hash,
  ImageIcon,
  PoundSterling,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { formatMoney } from "@primarywms/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { DashboardSkeleton } from "@/components/skeletons";

const FOLDER_KEY = "pwms.dashboard.folderIds";

type Photo = { id: string; publicUrl?: string | null };
type DashItem = {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number | null;
  price: number | null;
  totalValue: number;
  photos: Photo[];
  unit?: { abbreviation?: string; name?: string };
  folder?: { id: string; name: string };
};
type Activity = {
  id: string;
  type: string;
  createdAt: string;
  qtyDelta: number | null;
  note: string | null;
  payload: Record<string, unknown> | null;
  item?: { id: string; name: string } | null;
  folder?: { id: string; name: string } | null;
  toFolder?: { id: string; name: string } | null;
  user?: { firstName: string; lastName: string } | null;
};
type Dash = {
  uniqueItems: number;
  itemRows: number;
  folders: number;
  totalQty: number;
  totalValue: number;
  currency: string;
  hidePrices: boolean;
  recent: Activity[];
  lowStock: DashItem[];
  lowStockCount: number;
  recentlyAdded: DashItem[];
};
type TreeFolder = {
  id: string;
  parentId: string | null;
  name: string;
  _count?: { items: number; children: number };
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async (ids: string[]) => {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("folderId", id));
    const qs = params.toString();
    const payload = await api<Dash>(`/api/v1/dashboard${qs ? `?${qs}` : ""}`);
    setData(payload);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(FOLDER_KEY);
    const ids = saved ? (JSON.parse(saved) as string[]) : [];
    setFolderIds(ids);
    load(ids).catch((e) => setError(e.message));
    api<{ tree: TreeFolder[] }>("/api/v1/folders").then((d) => setTree(d.tree)).catch(() => null);
  }, [load]);

  function applyFolders(ids: string[]) {
    const root = tree.find((f) => f.parentId === null);
    const compact = compactFolderSelection(
      tree,
      ids.filter((id) => id !== root?.id),
    );
    setFolderIds(compact);
    window.localStorage.setItem(FOLDER_KEY, JSON.stringify(compact));
    setPickerOpen(false);
    load(compact).catch((e) => setError(e.message));
  }

  const selectedPills = folderIds.length
    ? tree.filter((f) => folderIds.includes(f.id)).map((f) => f.name)
    : ["All Folders"];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f5] scrollbar-thin">
      <div className="mx-auto max-w-[1400px] px-8 py-7">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[#1c2b25]">Dashboard</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#6b7c74]">
              <span>Selected Folders:</span>
              {selectedPills.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-[#3d4f47] px-3 py-1 text-xs font-medium text-white"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-primary-hover"
          >
            Set folders
          </button>
        </header>

        {error ? <p className="mb-4 text-danger">{error}</p> : null}

        {!data ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi icon={<Box className="h-5 w-5" />} iconClass="bg-[#dbeafe] text-[#3b82f6]" value={compact(data.itemRows)} label="Items" />
              <Kpi icon={<Folder className="h-5 w-5" />} iconClass="bg-[#fef3c7] text-[#d97706]" value={compact(data.folders)} label="Folders" />
              <Kpi icon={<Hash className="h-5 w-5" />} iconClass="bg-[#ede9fe] text-[#7c3aed]" value={compact(data.totalQty)} label="Total Quantity" />
              <Kpi
                icon={<PoundSterling className="h-5 w-5" />}
                iconClass="bg-[#ffedd5] text-[#ea580c]"
                value={data.hidePrices ? "—" : data.totalValue === 0 ? "0" : compact(data.totalValue)}
                label="Total Value"
              />
            </section>

            <section className="mb-5 rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgb(16_24_20/0.06)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c2b25]">
                  Items that need restocking
                  <Sparkles className="h-4 w-4 text-primary" />
                </h2>
                <div className="flex items-center gap-2 text-[13px] text-[#6b7c74]">
                  <SlidersHorizontal className="h-4 w-4" />
                  At or Below Min Level
                </div>
              </div>
              {data.lowStock.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6b7c74]">You don’t have any items with low stock.</p>
              ) : (
                <>
                  <ItemCarousel items={data.lowStock} badge="LOW STOCK" badgeClass="bg-[#e24b4b]" currency={data.currency} hidePrices={data.hidePrices} />
                  <div className="mt-5 text-center">
                    <Link href="/reports/low-stock" className="text-sm font-medium text-primary hover:underline">
                      View all {data.lowStockCount} items
                    </Link>
                  </div>
                </>
              )}
            </section>

            <section className="mb-5 rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgb(16_24_20/0.06)]">
              <h2 className="mb-4 text-lg font-semibold text-[#1c2b25]">Recent Items</h2>
              {data.recentlyAdded.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6b7c74]">
                  No items added yet.{" "}
                  <Link href="/items" className="font-medium text-primary hover:underline">
                    Add an item
                  </Link>
                </p>
              ) : (
                <ItemCarousel items={data.recentlyAdded} badge="NEW" badgeClass="bg-[#3d4f47]" currency={data.currency} hidePrices={data.hidePrices} showDots />
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgb(16_24_20/0.06)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1c2b25]">Recent Activity</h2>
                <div className="flex items-center gap-3 text-[13px] text-[#6b7c74]">
                  <Link href="/activity-history" className="hover:text-primary">
                    All Activity
                  </Link>
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
              </div>
              {data.recent.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6b7c74]">No recent activity yet.</p>
              ) : (
                <ul>
                  {data.recent.map((row, i) => (
                    <li
                      key={row.id}
                      className={cn("flex items-start justify-between gap-6 px-3 py-3 text-[14px]", i % 2 === 1 && "bg-[#f7f8f8]")}
                    >
                      <p className="min-w-0 leading-relaxed text-[#2a3a33]">{activityCopy(row)}</p>
                      <span className="shrink-0 text-[13px] text-[#8a9a93]">{format(new Date(row.createdAt), "dd/MM/yyyy")}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 text-center">
                <Link href="/activity-history" className="text-sm font-medium text-primary hover:underline">
                  View all activity
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      <SetFoldersDialog open={pickerOpen} selected={folderIds} onClose={() => setPickerOpen(false)} onApply={applyFolders} />
    </div>
  );
}

function Kpi({
  icon,
  iconClass,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-6 text-center shadow-[0_1px_3px_rgb(16_24_20/0.06)]">
      <div className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-xl", iconClass)}>{icon}</div>
      <div className="text-[28px] font-bold leading-none tracking-tight text-[#1c2b25]">{value}</div>
      <div className="mt-2 text-[13px] text-[#6b7c74]">{label}</div>
    </div>
  );
}

function ItemCarousel({
  items,
  badge,
  badgeClass,
  currency,
  hidePrices,
  showDots,
}: {
  items: DashItem[];
  badge: string;
  badgeClass: string;
  currency: string;
  hidePrices: boolean;
  showDots?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / 4));

  function scroll(dir: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPage(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (pages - 1)));
  }

  return (
    <div className="relative">
      <div ref={scroller} onScroll={onScroll} className="flex gap-4 overflow-x-auto pb-1 scrollbar-thin">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} badge={badge} badgeClass={badgeClass} currency={currency} hidePrices={hidePrices} />
        ))}
      </div>
      {items.length > 4 ? (
        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute -right-3 top-[72px] flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#3d4f47] shadow-md ring-1 ring-black/5 hover:bg-[#f4f6f5]"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}
      {showDots && pages > 1 ? (
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i === page ? "bg-primary" : "bg-[#d5ddd8]")} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({
  item,
  badge,
  badgeClass,
  currency,
  hidePrices,
}: {
  item: DashItem;
  badge: string;
  badgeClass: string;
  currency: string;
  hidePrices: boolean;
}) {
  const src = item.photos[0]?.publicUrl || (item.photos[0] ? `/api/v1/photos/${item.photos[0].id}` : null);
  const unit = item.unit?.abbreviation || item.unit?.name || "unit";
  const value = hidePrices ? null : formatMoney(item.totalValue ?? 0, currency);
  return (
    <Link href={`/item/${item.id}`} className="w-[168px] shrink-0">
      <div className="relative overflow-hidden rounded-xl bg-[#ecefed]">
        <div className="aspect-square">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[#c0cdc6]">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
        </div>
        <span className={cn("absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white", badgeClass)}>
          {badge}
        </span>
      </div>
      <div className="mt-2.5">
        <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#1c2b25]">{item.name}</div>
        <div className="mt-1 text-[12px] text-[#6b7c74]">
          {item.quantity} {unit}
          {value ? ` | ${value}` : ""}
        </div>
      </div>
    </Link>
  );
}

function compact(n: number) {
  if (n >= 1_000_000) return `${trimNum(n / 1_000_000)}M`;
  if (n >= 1000) return `${trimNum(n / 1000)}K`;
  return new Intl.NumberFormat("en-GB").format(n);
}

function trimNum(n: number) {
  return n.toFixed(1).replace(/\.0$/, "");
}

function NameLink({ item }: { item?: { id: string; name: string } | null }) {
  if (!item) return <span>item</span>;
  return (
    <Link href={`/item/${item.id}`} className="font-semibold text-primary hover:underline">
      {item.name}
    </Link>
  );
}

function who(row: Activity) {
  if (!row.user) return "Someone";
  return `${row.user.firstName} ${row.user.lastName}`.trim() || "Someone";
}

function activityCopy(row: Activity) {
  const actor = who(row);
  switch (row.type) {
    case "ITEM_CREATED":
      return (
        <>
          {actor} added <NameLink item={row.item} />
          {row.folder ? <> in {row.folder.name}</> : null}
        </>
      );
    case "ITEM_EDITED":
      return (
        <>
          {actor} updated <NameLink item={row.item} />
          {editHint(row)}
        </>
      );
    case "ITEM_DELETED":
      return (
        <>
          {actor} deleted <NameLink item={row.item} />
        </>
      );
    case "ITEM_RESTORED":
      return (
        <>
          {actor} restored <NameLink item={row.item} />
        </>
      );
    case "FOLDER_CREATED":
      return (
        <>
          {actor} added folder <span className="font-semibold">{row.folder?.name}</span>
        </>
      );
    case "QTY_ADD":
    case "QTY_SUBTRACT":
    case "QTY_SET":
      return (
        <>
          {actor} updated <NameLink item={row.item} /> quantity
          {row.qtyDelta != null ? <> ({row.qtyDelta > 0 ? "+" : ""}
          {row.qtyDelta})</> : null}
        </>
      );
    case "MOVE":
      return (
        <>
          {actor} moved <NameLink item={row.item} />
          {row.toFolder ? <> to {row.toFolder.name}</> : null}
        </>
      );
    case "CLONE":
      return (
        <>
          {actor} cloned <NameLink item={row.item} />
        </>
      );
    default:
      return (
        <>
          {actor} {row.type.replaceAll("_", " ").toLowerCase()} <NameLink item={row.item} />
        </>
      );
  }
}

function editHint(row: Activity) {
  const payload = row.payload;
  if (!payload || typeof payload !== "object") return null;
  if ("notes" in payload) {
    const notes = String(payload.notes ?? "");
    return (
      <>
        {" "}
        Notes from blank to &apos;{notes.slice(0, 80)}
        {notes.length > 80 ? "…" : ""}&apos;
      </>
    );
  }
  if ("name" in payload) return <> name</>;
  return null;
}

function childrenOf(tree: TreeFolder[], parentId: string | null) {
  return tree.filter((f) => f.parentId === parentId);
}

function descendantIds(tree: TreeFolder[], id: string) {
  const out: string[] = [];
  const stack = childrenOf(tree, id).map((f) => f.id);
  while (stack.length) {
    const current = stack.pop()!;
    out.push(current);
    for (const child of childrenOf(tree, current)) stack.push(child.id);
  }
  return out;
}

function expandFolderSelection(tree: TreeFolder[], ids: string[]) {
  const set = new Set<string>();
  for (const id of ids) {
    set.add(id);
    for (const child of descendantIds(tree, id)) set.add(child);
  }
  return set;
}

function compactFolderSelection(tree: TreeFolder[], ids: Iterable<string>) {
  const set = new Set(ids);
  const byId = new Map(tree.map((f) => [f.id, f]));
  return [...set].filter((id) => {
    let parentId = byId.get(id)?.parentId ?? null;
    while (parentId) {
      if (set.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  });
}

function selectableFolderIds(tree: TreeFolder[], rootId: string) {
  return tree.filter((f) => f.id !== rootId).map((f) => f.id);
}

function SetFoldersDialog({
  open,
  selected,
  onClose,
  onApply,
}: {
  open: boolean;
  selected: string[];
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [q, setQ] = useState("");
  const [allSelected, setAllSelected] = useState(true);
  const [draft, setDraft] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setQ("");
    setAllSelected(selected.length === 0);
    setDraft(selected);
    api<{ tree: TreeFolder[]; rootId: string }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.rootId);
      setExpanded(new Set());
    });
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const byId = useMemo(() => new Map(tree.map((f) => [f.id, f])), [tree]);
  const query = q.trim().toLowerCase();

  const visibleIds = useMemo(() => {
    if (!query) return null;
    const match = new Set(tree.filter((f) => f.name.toLowerCase().includes(query)).map((f) => f.id));
    for (const id of [...match]) {
      let current = byId.get(id);
      while (current?.parentId) {
        match.add(current.parentId);
        current = byId.get(current.parentId);
      }
      for (const child of descendantIds(tree, id)) match.add(child);
    }
    return match;
  }, [tree, byId, query]);

  const searchExpanded = useMemo(() => {
    if (!visibleIds) return null;
    const next = new Set<string>();
    for (const id of visibleIds) {
      let current = byId.get(id);
      while (current?.parentId) {
        next.add(current.parentId);
        current = byId.get(current.parentId);
      }
    }
    return next;
  }, [visibleIds, byId]);

  const checkedIds = useMemo(
    () => (allSelected ? new Set(selectableFolderIds(tree, rootId)) : expandFolderSelection(tree, draft)),
    [allSelected, tree, rootId, draft],
  );

  function isChecked(id: string) {
    if (id === rootId) return allSelected;
    return checkedIds.has(id);
  }

  function toggleAll() {
    setAllSelected(true);
    setDraft([]);
  }

  function toggleFolder(id: string) {
    if (id === rootId) {
      toggleAll();
      return;
    }
    const allIds = selectableFolderIds(tree, rootId);
    const current = new Set(allSelected ? allIds : checkedIds);
    const nextChecked = !current.has(id);
    if (nextChecked) {
      current.add(id);
      for (const child of descendantIds(tree, id)) current.add(child);
    } else {
      current.delete(id);
      for (const child of descendantIds(tree, id)) current.delete(child);
    }
    if (allIds.length > 0 && allIds.every((folderId) => current.has(folderId))) {
      setAllSelected(true);
      setDraft([]);
      return;
    }
    setAllSelected(false);
    setDraft(compactFolderSelection(tree, current));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canApply = allSelected || draft.length > 0;
  const topLevel = childrenOf(tree, rootId).filter((f) => !visibleIds || visibleIds.has(f.id));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/20" aria-label="Close folders panel" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-[min(100%,400px)] flex-col bg-white shadow-[-8px_0_24px_rgb(16_24_20/0.12)]">
        <div className="px-6 pb-3 pt-6">
          <h2 className="text-[22px] font-semibold text-[#1c2b25]">Folders</h2>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
            <input
              className="h-10 w-full rounded-lg bg-[#f4f6f5] pl-9 pr-3 text-sm text-[#1c2b25] outline-none placeholder:text-[#8a9a93] focus:ring-2 focus:ring-primary/20"
              placeholder="Search folders."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
          <FolderPickRow
            name="All Items"
            depth={0}
            checked={allSelected}
            hasChildren={false}
            expanded={false}
            hasItems
            onToggle={toggleAll}
          />
          {topLevel.map((folder) => (
            <FolderPickBranch
              key={folder.id}
              folder={folder}
              tree={tree}
              depth={0}
              visibleIds={visibleIds}
              expanded={searchExpanded ?? expanded}
              isChecked={isChecked}
              onToggle={toggleFolder}
              onExpand={toggleExpanded}
            />
          ))}
        </div>

        <div className="flex items-center gap-6 border-t border-[#edf0ee] px-6 py-4">
          <button
            type="button"
            disabled={!canApply}
            onClick={() => onApply(allSelected ? [] : draft)}
            className="rounded-md bg-primary px-8 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-40"
          >
            Apply
          </button>
          <button type="button" onClick={onClose} className="text-[13px] font-bold uppercase tracking-wide text-primary hover:text-primary-hover">
            Cancel
          </button>
        </div>
      </aside>
    </div>
  );
}

function FolderPickBranch({
  folder,
  tree,
  depth,
  visibleIds,
  expanded,
  isChecked,
  onToggle,
  onExpand,
}: {
  folder: TreeFolder;
  tree: TreeFolder[];
  depth: number;
  visibleIds: Set<string> | null;
  expanded: Set<string>;
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const kids = childrenOf(tree, folder.id).filter((child) => !visibleIds || visibleIds.has(child.id));
  const hasChildren = childrenOf(tree, folder.id).length > 0;
  const open = expanded.has(folder.id);
  return (
    <div>
      <FolderPickRow
        name={folder.name}
        depth={depth}
        checked={isChecked(folder.id)}
        hasChildren={hasChildren}
        expanded={open}
        hasItems={(folder._count?.items ?? 0) > 0}
        onToggle={() => onToggle(folder.id)}
        onExpand={() => onExpand(folder.id)}
      />
      {open
        ? kids.map((child) => (
            <FolderPickBranch
              key={child.id}
              folder={child}
              tree={tree}
              depth={depth + 1}
              visibleIds={visibleIds}
              expanded={expanded}
              isChecked={isChecked}
              onToggle={onToggle}
              onExpand={onExpand}
            />
          ))
        : null}
    </div>
  );
}

function FolderPickRow({
  name,
  depth,
  checked,
  hasChildren,
  expanded,
  hasItems,
  onToggle,
  onExpand,
}: {
  name: string;
  depth: number;
  checked: boolean;
  hasChildren: boolean;
  expanded: boolean;
  hasItems: boolean;
  onToggle: () => void;
  onExpand?: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center gap-1 rounded-md py-2 pr-3 hover:bg-[#f4f6f5]"
      style={{ paddingLeft: 8 + depth * 18 }}
      onClick={onToggle}
    >
      {hasChildren ? (
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center text-[#8a9a93]"
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
          onClick={(event) => {
            event.stopPropagation();
            onExpand?.();
          }}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
      <span className="relative shrink-0">
        <Folder
          className={cn("h-[18px] w-[18px]", hasItems ? "fill-[#c5cdd0] text-[#c5cdd0]" : "fill-none text-[#c5cdd0]")}
        />
        {hasItems ? <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate px-2 text-[14px] text-[#1c2b25]">{name}</span>
      <input
        type="checkbox"
        checked={checked}
        className="h-4 w-4 shrink-0 rounded border-[#c5cdd0] accent-primary"
        onClick={(event) => event.stopPropagation()}
        onChange={onToggle}
      />
    </div>
  );
}
