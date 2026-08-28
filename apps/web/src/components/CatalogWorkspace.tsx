"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  Check,
  CircleHelp,
  LayoutGrid,
  List,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Search,
  Table2,
  X,
} from "lucide-react";
import { formatMoney } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "./ui";
import { FolderPane, folderMatchesFilter, type FolderFilter, type TreeFolder } from "./FolderPane";
import { AddFolderModal } from "./AddFolderModal";
import { AddItemModal } from "./AddItemModal";
import { FolderTile } from "./FolderCard";
import { FolderCardMenu, type FolderMenuAction } from "@/components/folders/FolderCardMenu";
import {
  DeleteFolderModal,
  EditFolderModal,
  MoveFolderModal,
  PermissionsModal,
  SetAlertModal,
} from "@/components/folders/FolderModals";
import { CatalogTableView } from "./CatalogTableView";
import { CatalogListMeta, fieldsForList } from "./CatalogListMeta";
import { JobBanner, type CatalogJob } from "./JobBanner";
import { CatalogSkeleton } from "./skeletons";
import { FolderGlyph } from "./FolderGlyph";
import { SelectFolderModal } from "./SelectFolderModal";
import { ExportWizard } from "./ExportWizard";
import { CreateLabelWizard, type LabelTarget } from "./CreateLabelWizard";
import { reprintSavedLabel } from "@/lib/reprint-label";
import type { SavedLabelConfig } from "@/lib/saved-label-config";
import { BulkActionBar } from "./BulkActionBar";
import { BulkDeleteModal } from "@/components/bulk/BulkDeleteModal";
import { BulkMoveModal } from "@/components/bulk/BulkMoveModal";
import { BulkEditModal, CloneFolderModal, CloneItemModal, MergeItemModal } from "./InventoryActions";
import { ItemAlertModal } from "./ItemAlertModal";
import { MoveItemModal, RestockModal, AddToModal, DeleteItemModal, UpdateQuantityModal } from "./items/ItemModals";
import { BulkUpdateQuantityModal } from "./items/BulkUpdateQuantityModal";
import { ItemCardMenu } from "./items/ItemCardMenu";
import type { ItemMenuAction } from "./items/ItemActionsMenu";
import type { ItemActionTarget } from "./items/types";
import {
  formatCustomValue,
  type CustomFieldDef,
  type StoredCustomValue,
} from "@/lib/custom-field-values";

type Entry =
  | { kind: "folder"; data: FolderCard }
  | { kind: "item"; data: ItemCard };

type FolderCard = {
  id: string;
  name: string;
  parentId?: string | null;
  sid?: string;
  kind?: "ITEM" | "JOB";
  jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
  jobId?: string | null;
  notes?: string | null;
  updatedAt: string;
  photos: { id: string; publicUrl?: string | null }[];
  tags?: { tag: { name: string } }[];
  customValues?: StoredCustomValue[];
  barcodes?: { id: string; value: string; symbology: string; slot: number }[];
  _count: { items: number; children: number };
  value?: number;
  quantity?: number;
};

type FolderActionTarget = { id: string; name: string; parentId?: string | null; tags?: string[] };

type ItemCard = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  minQuantity: number | null;
  price: number | null;
  totalValue: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  unit?: { abbreviation: string; name: string };
  photos: { id: string; publicUrl?: string | null }[];
  barcodes?: { id: string; value: string; symbology: string; slot: number }[];
  productLink?: string | null;
  folderId?: string;
  lastFromFolderId?: string | null;
  tags?: { tag: { name: string } }[];
  groupedCount?: number;
  groupedQty?: number;
  customValues?: StoredCustomValue[];
};

type CatalogPayload = {
  folder: {
    id: string;
    name: string;
    sid?: string;
    notes?: string | null;
    kind?: "ITEM" | "JOB";
    jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
    job?: CatalogJob | null;
    photos?: { id: string; publicUrl?: string | null }[];
    tags?: { tag: { name: string } }[];
    customValues?: (StoredCustomValue & { field: { id?: string; name: string; type: string } })[];
    barcodes?: { id: string; value: string; symbology: string; slot: number }[];
  } | null;
  breadcrumb: { id: string; name: string }[];
  entries: Entry[];
  page: number;
  pageSize: number;
  total: number;
  stats: { folders: number; items: number; quantity: number; value: number };
  tree: TreeFolder[];
  rootId: string;
  fields?: CustomFieldDef[];
  listFields?: CustomFieldDef[];
};

export function CatalogWorkspace({ folderId }: { folderId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState(() => searchParams.get("q") || searchParams.get("keyword") || "");
  const [sort, setSort] = useState("UPDATED_AT");
  const [dir, setDir] = useState<"ASC" | "DESC">("DESC");
  const [view, setView] = useState<"GRID" | "LIST" | "TABLE">("GRID");
  const [group, setGroup] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [addItem, setAddItem] = useState(false);
  const [addFolder, setAddFolder] = useState(false);
  const [qtyItem, setQtyItem] = useState<ItemCard | null>(null);
  const [moveItem, setMoveItem] = useState<ItemCard | null>(null);
  const [restockItem, setRestockItem] = useState<ItemCard | null>(null);
  const [addToItem, setAddToItem] = useState<ItemCard | null>(null);
  const [deleteItem, setDeleteItem] = useState<ItemCard | null>(null);
  const [bulkQtyOpen, setBulkQtyOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelTargets, setLabelTargets] = useState<LabelTarget[]>([]);
  const [savedFolderLabels, setSavedFolderLabels] = useState<
    { id: string; name: string; codeValue: string; kind: string; sizeId: string; config: SavedLabelConfig }[]
  >([]);
  const [reprintingLabelId, setReprintingLabelId] = useState<string | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [paneCollapsed, setPaneCollapsed] = useState(false);
  const [hideFolders, setHideFolders] = useState(false);
  const [hideSid, setHideSid] = useState(false);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("ALL");
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  const onFolderFilterChange = useCallback((nextFilter: FolderFilter, nextCompleted: boolean) => {
    setFolderFilter(nextFilter);
    setShowCompletedJobs(nextCompleted);
  }, []);
  const [chromeMenu, setChromeMenu] = useState<"sort" | "view" | "header" | null>(null);
  const [editFolderTarget, setEditFolderTarget] = useState<FolderActionTarget | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<FolderActionTarget | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{
    folder: FolderActionTarget;
    redirectOnDelete?: boolean;
  } | null>(null);
  const [permissionsFolder, setPermissionsFolder] = useState<{ id: string; name: string } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [cloneItem, setCloneItem] = useState<ItemCard | null>(null);
  const [mergeItemId, setMergeItemId] = useState<string | null>(null);
  const [cloneFolder, setCloneFolder] = useState<{ id: string; name: string; parentId?: string | null } | null>(null);
  const [returnToOriginEnabled, setReturnToOriginEnabled] = useState(false);
  const [alertItemIds, setAlertItemIds] = useState<string[] | null>(null);
  const [alertFolder, setAlertFolder] = useState<{ id: string; name: string } | null>(null);
  const [exportFolderId, setExportFolderId] = useState<string | undefined>();
  const [exportItemIds, setExportItemIds] = useState<string[] | undefined>();
  const [sortQuery, setSortQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHelp, setSearchHelp] = useState(false);
  const [scanMiss, setScanMiss] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const headerKebabRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLFormElement>(null);
  const skipSearchDebounce = useRef(true);
  const scanBuffer = useRef("");
  const scanLast = useRef(0);

  async function openCode(value: string) {
    const code = value.trim();
    if (!code) return false;
    try {
      const res = await api<{ match: { kind: string; href: string; name?: string } | null }>(
        `/api/v1/barcodes?value=${encodeURIComponent(code)}`,
      );
      if (res.match) {
        if (res.match.kind === "unlinked") {
          toast.info(
            `Unlinked label “${res.match.name ?? code}”. Open an item or folder and use Add QR / Barcode → Link Existing to attach it.`,
          );
          router.push("/settings/labels");
          return true;
        }
        router.push(res.match.href);
        return true;
      }
    } catch {
      /* fall through to search */
    }
    return false;
  }

  async function handleScan(raw: string) {
    const code = raw.trim();
    if (!code) return;
    setScanMiss("");
    const found = await openCode(code);
    if (found) {
      setQ("");
      return;
    }
    setScanMiss(`No item or folder found for “${code}”`);
    setQ("");
    scanRef.current?.focus();
  }

  function startScanning() {
    setScanning(true);
    setSearchFocused(false);
    setSearchHelp(false);
    setChromeMenu(null);
    setScanMiss("");
    setQ("");
    window.setTimeout(() => scanRef.current?.focus(), 0);
  }

  function stopScanning() {
    setScanning(false);
    setScanMiss("");
    setQ("");
  }

  async function load(nextPage = page) {
    const params = new URLSearchParams();
    if (folderId) params.set("folderId", folderId);
    if (q.trim().length >= 3) params.set("q", q.trim());
    params.set("sort", sort);
    params.set("dir", dir);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    if (group) params.set("group", "1");
    const payload = await api<CatalogPayload>(`/api/v1/catalog?${params}`);
    setData(payload);
    setError("");
  }

  function handleFolderMenuAction(
    folder: FolderActionTarget,
    action: FolderMenuAction,
    opts?: { redirectOnDelete?: boolean },
  ) {
    if (action === "edit") {
      setEditFolderTarget(folder);
      return;
    }
    if (action === "move") {
      setMoveFolderTarget(folder);
      return;
    }
    if (action === "alert") {
      setAlertFolder({ id: folder.id, name: folder.name });
      return;
    }
    if (action === "create-label") {
      setLabelTargets([
        folderToLabelTarget(
          {
            id: folder.id,
            name: folder.name,
            tags: folder.tags?.map((name) => ({ tag: { name } })),
          },
          data?.fields ?? [],
        ),
      ]);
      setLabelOpen(true);
      return;
    }
    if (action === "export") {
      setExportFolderId(folder.id);
      setExportItemIds(undefined);
      setExportOpen(true);
      return;
    }
    if (action === "clone") {
      setCloneFolder(folder);
      return;
    }
    if (action === "permissions") {
      setPermissionsFolder({ id: folder.id, name: folder.name });
      return;
    }
    if (action === "delete") {
      setDeleteFolderTarget({ folder, redirectOnDelete: opts?.redirectOnDelete });
    }
  }

  async function confirmDeleteFolder(meta: { reason: string; note: string }) {
    if (!deleteFolderTarget) return;
    const { folder, redirectOnDelete } = deleteFolderTarget;
    await api(`/api/v1/folders/${folder.id}`, {
      method: "DELETE",
      body: JSON.stringify({ reason: meta.reason || null, note: meta.note || null }),
      toast: "Folder moved to Trash",
    });
    setDeleteFolderTarget(null);
    if (redirectOnDelete && data) {
      const parentId =
        folder.id === data.folder?.id
          ? data.breadcrumb.length > 1
            ? data.breadcrumb[data.breadcrumb.length - 2]?.id
            : data.rootId
          : folder.parentId ?? data.rootId;
      router.push(parentId && parentId !== data.rootId ? `/folder/${parentId}/content` : "/items");
    } else {
      setSelectedFolderIds((ids) => ids.filter((id) => id !== folder.id));
      load();
    }
  }

  useEffect(() => {
    setPage(1);
    setSelectedFolderIds([]);
    setSelectedItemIds([]);
    load(1).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, sort, dir, group, pageSize]);

  useEffect(() => {
    api<{ organization: { returnToOriginEnabled: boolean } }>("/api/v1/auth/me")
      .then((d) => setReturnToOriginEnabled(Boolean(d.organization?.returnToOriginEnabled)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!folderId || folderId === data?.rootId) {
      setSavedFolderLabels([]);
      return;
    }
    api<{ saved: typeof savedFolderLabels }>(`/api/v1/labels?folderId=${folderId}`)
      .then((res) => setSavedFolderLabels(res.saved))
      .catch(() => setSavedFolderLabels([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, data?.rootId]);

  useEffect(() => {
    if (!chromeMenu) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (chromeRef.current?.contains(target) || headerKebabRef.current?.contains(target)) return;
      setChromeMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [chromeMenu]);

  useEffect(() => {
    if (skipSearchDebounce.current) {
      skipSearchDebounce.current = false;
      return;
    }
    if (scanning) return;
    if (q.trim().length > 0 && q.trim().length < 3) return;
    const handle = window.setTimeout(() => {
      setPage(1);
      load(1).catch((e) => setError(e.message));
    }, 280);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!scanning) return;
    const focus = () => scanRef.current?.focus();
    focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stopScanning();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target === scanRef.current) return;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Enter") {
        event.preventDefault();
        const code = scanBuffer.current.trim();
        scanBuffer.current = "";
        if (code) void handleScan(code);
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now();
        if (now - scanLast.current > 80) scanBuffer.current = "";
        scanLast.current = now;
        scanBuffer.current += event.key;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  if (!data) {
    if (error) {
      return <div className="p-8 text-danger">{error}</div>;
    }
    return <CatalogSkeleton />;
  }

  const title = data.folder?.name ?? "All Items";
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const isRoot = !folderId || data.folder?.id === data.rootId;
  const job = data.folder?.job ?? null;
  const jobLocked = job?.status === "COMPLETED";
  const visibleEntries = data.entries.filter((entry) => {
    if (entry.kind === "folder") {
      if (hideFolders) return false;
      return folderMatchesFilter(entry.data, folderFilter, showCompletedJobs);
    }
    return true;
  });
  const selecting = selectedFolderIds.length > 0 || selectedItemIds.length > 0;
  const pageFolderIds = visibleEntries.filter((e) => e.kind === "folder").map((e) => e.data.id);
  const pageItemIds = visibleEntries.filter((e) => e.kind === "item").map((e) => e.data.id);
  const pageTotal = pageFolderIds.length + pageItemIds.length;
  const allOnPageSelected =
    pageTotal > 0 &&
    pageFolderIds.every((id) => selectedFolderIds.includes(id)) &&
    pageItemIds.every((id) => selectedItemIds.includes(id));
  const hasMoreMatching = data.total > pageTotal;

  async function selectAllMatching() {
    const params = new URLSearchParams();
    if (folderId) params.set("folderId", folderId);
    if (q.trim().length >= 3) params.set("q", q.trim());
    params.set("sort", sort);
    params.set("dir", dir);
    params.set("page", "1");
    params.set("pageSize", String(Math.max(data!.total, pageTotal)));
    if (group) params.set("group", "1");
    try {
      const payload = await api<CatalogPayload>(`/api/v1/catalog?${params}`);
      setSelectedFolderIds(payload.entries.filter((e) => e.kind === "folder").map((e) => e.data.id));
      setSelectedItemIds(payload.entries.filter((e) => e.kind === "item").map((e) => e.data.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not select all");
    }
  }

  function selectAllOnPage() {
    setSelectedFolderIds(pageFolderIds);
    setSelectedItemIds(pageItemIds);
  }

  async function confirmBulkDelete(meta: { reason: string; note: string }) {
    if (selectedItemIds.length) {
      await api("/api/v1/items/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          itemIds: selectedItemIds,
          reason: meta.reason || null,
          note: meta.note || null,
        }),
        toast: false,
      });
    }
    for (const id of selectedFolderIds) {
      await api(`/api/v1/folders/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: meta.reason || null, note: meta.note || null }),
        toast: false,
      });
    }
    toast.success("Selection moved to Trash");
    setBulkDeleteOpen(false);
    setSelectedFolderIds([]);
    setSelectedItemIds([]);
    load();
  }

  const sortOptions: [string, string][] = [
    ["NAME", "Name"],
    ["UPDATED_AT", "Updated At"],
    ["QUANTITY", "Quantity"],
    ["MIN_LEVEL", "Min Level"],
    ["PRICE", "Price"],
    ["NOTES", "Description"],
    ["TOTAL_VALUE", "Value"],
  ];
  const sortLabel = sortOptions.find(([value]) => value === sort)?.[1] ?? "Updated At";
  const visibleSortOptions = sortOptions.filter(([, label]) =>
    label.toLowerCase().includes(sortQuery.trim().toLowerCase()),
  );
  const ViewIcon = view === "LIST" ? List : view === "TABLE" ? Table2 : LayoutGrid;

  return (
    <div className="flex h-full min-h-0">
      <FolderPane
        tree={data.tree}
        rootId={data.rootId}
        currentId={data.folder?.id ?? data.rootId}
        collapsed={paneCollapsed}
        onToggle={() => setPaneCollapsed((v) => !v)}
        onFilterChange={onFolderFilterChange}
        fields={data.fields ?? []}
        onFolderChanged={() => void load()}
        onFolderDeleted={(deletedId) => {
          const current = data.folder?.id ?? folderId;
          if (deletedId !== current) return;
          const deleted = data.tree.find((row) => row.id === deletedId);
          const parentId = deleted?.parentId ?? data.rootId;
          router.push(parentId && parentId !== data.rootId ? `/folder/${parentId}/content` : "/items");
        }}
        onCreateLabel={(folder) => {
          setLabelTargets([folderToLabelTarget({ id: folder.id, name: folder.name }, data.fields ?? [])]);
          setLabelOpen(true);
        }}
        onCloneFolder={(folder) => setCloneFolder({ id: folder.id, name: folder.name, parentId: folder.parentId })}
        onExportFolder={(folder) => {
          setExportFolderId(folder.id);
          setExportItemIds(undefined);
          setExportOpen(true);
        }}
      />
      <section className="flex min-w-0 flex-1 flex-col bg-white">
        {error ? <p className="border-b border-[#f3d6d6] bg-[#fdf4f4] px-6 py-2 text-sm text-danger">{error}</p> : null}
        <header className="border-b border-[#e6ebe8] px-6 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-[#8a9a93]">
                <FolderGlyph root populated={false} size="sm" className="text-[#9aa6a0]" />
                {data.breadcrumb.map((crumb, i) => {
                  const last = i === data.breadcrumb.length - 1;
                  return (
                    <span key={crumb.id} className="flex min-w-0 items-center gap-1.5">
                      {i > 0 ? <span className="text-[#c5d0cb]">›</span> : null}
                      {last && !isRoot ? (
                        <span className="truncate text-[#5c6b64]">{crumb.name}</span>
                      ) : (
                        <Link
                          className="truncate hover:text-primary"
                          href={crumb.id === data.rootId ? "/items" : `/folder/${crumb.id}/content`}
                        >
                          {crumb.name}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </div>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddItem(true)}
                disabled={jobLocked}
                className="h-10 rounded-md bg-primary px-5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Item
              </button>
              <button
                type="button"
                onClick={() => setAddFolder(true)}
                disabled={jobLocked}
                className="h-10 rounded-md bg-primary px-5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Folder
              </button>
              {!isRoot && data.folder ? (
                <div ref={headerKebabRef} className="relative">
                  <button
                    type="button"
                    title="More folder actions"
                    aria-label="More folder actions"
                    aria-expanded={chromeMenu === "header"}
                    onClick={() => setChromeMenu(chromeMenu === "header" ? null : "header")}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md text-[#6b7c74] hover:bg-[#f4f6f5]",
                      chromeMenu === "header" && "bg-[#f4f6f5]",
                    )}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {chromeMenu === "header" && data.folder ? (
                    <FolderCardMenu
                      folderId={data.folder.id}
                      variant="header"
                      className="absolute right-0 top-11 z-40 w-[220px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-[0_8px_24px_rgb(16_24_20/0.14)]"
                      onClose={() => setChromeMenu(null)}
                      onAction={(action) => {
                        setChromeMenu(null);
                        handleFolderMenuAction(
                          {
                            id: data.folder!.id,
                            name: data.folder!.name,
                            parentId:
                              data.breadcrumb.length > 1
                                ? data.breadcrumb[data.breadcrumb.length - 2]?.id ?? data.rootId
                                : data.rootId,
                            tags: data.folder!.tags?.map((row) => row.tag.name),
                          },
                          action,
                          { redirectOnDelete: true },
                        );
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {job ? <JobBanner job={job} onChanged={() => load()} /> : null}

          <div ref={chromeRef} className="mt-5 flex flex-wrap items-center gap-4">
            <form
              ref={searchBoxRef}
              className="relative min-w-[240px] flex-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (scanning) {
                  await handleScan(q);
                  return;
                }
                if (await openCode(q)) return;
                if (q.trim().length > 0 && q.trim().length < 3) return;
                setPage(1);
                load(1).catch((err) => setError(err.message));
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
              <input
                className={cn(
                  "h-10 w-full rounded-md border bg-white pl-9 text-sm text-[#3d4f47] outline-none placeholder:text-[#9aa6a0]",
                  scanning ? "border-[#8a9a93] pr-12" : searchFocused ? "border-[#8a9a93] pr-24" : "border-[#d8dfdb] pr-12",
                )}
                placeholder={scanning ? "Search All Items" : `Search ${title}`}
                value={q}
                ref={scanRef}
                autoComplete="off"
                onFocus={() => {
                  if (!scanning) setSearchFocused(true);
                }}
                onBlur={() => {
                  if (scanning) {
                    window.setTimeout(() => {
                      const active = document.activeElement;
                      if (!scanRef.current) return;
                      if (active && active !== document.body && active !== scanRef.current) return;
                      scanRef.current.focus();
                    }, 0);
                    return;
                  }
                  window.setTimeout(() => {
                    if (!searchBoxRef.current?.contains(document.activeElement)) {
                      setSearchFocused(false);
                      setSearchHelp(false);
                    }
                  }, 120);
                }}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (e.target.value.trim().length >= 3) setSearchHelp(false);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Escape") {
                    if (scanning) {
                      e.preventDefault();
                      stopScanning();
                      return;
                    }
                    setQ("");
                    setSearchFocused(false);
                    (e.target as HTMLInputElement).blur();
                    return;
                  }
                  if (e.key !== "Enter") return;
                  if (scanning) {
                    e.preventDefault();
                    await handleScan(q);
                  }
                }}
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
                {searchFocused && !scanning ? (
                  <>
                    <button
                      type="button"
                      title="Search help"
                      aria-label="Search help"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearchHelp(true);
                        setSearchFocused(true);
                        scanRef.current?.focus();
                      }}
                      className="rounded p-1.5 text-[#8a9a93] hover:text-[#3d4f47]"
                    >
                      <CircleHelp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Clear search"
                      aria-label="Clear search"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setQ("");
                        setSearchHelp(false);
                        scanRef.current?.focus();
                      }}
                      className="rounded p-1.5 text-[#8a9a93] hover:text-[#3d4f47]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
                <span className="mx-0.5 h-6 w-px bg-[#d8dfdb]" />
                <button
                  type="button"
                  title={scanning ? "Close scanning mode" : "Scan QR / barcode"}
                  aria-pressed={scanning}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => (scanning ? stopScanning() : startScanning())}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded",
                    scanning ? "bg-[#3d4f47] text-white" : "text-[#8a9a93] hover:bg-[#f4f6f5] hover:text-[#3d4f47]",
                  )}
                >
                  <Barcode className="h-4 w-4" />
                </button>
              </div>
              {searchFocused && !scanning && (q.trim().length < 3 || searchHelp) ? (
                <div
                  className="absolute left-0 top-[calc(100%+6px)] z-40 w-full min-w-[340px] rounded-lg border border-[#e6ebe8] bg-white px-5 py-4 shadow-[0_8px_24px_rgb(16_24_20/0.12)]"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <p className="text-[14px] text-[#3d4f47]">Type at least 3 characters to search for items and folders</p>
                  <div className="my-3 h-px bg-[#e6ebe8]" />
                  <p className="mb-3 text-[13px] text-[#5c6b64]">Refine search results with operators:</p>
                  <ul className="space-y-2.5 text-[13px] text-[#3d4f47]">
                    <li className="flex items-center gap-3">
                      <SearchOp>AND</SearchOp>
                      <span>
                        Example: Hat <strong>AND</strong> Bat
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <SearchOp>OR</SearchOp>
                      <span>
                        Example: Green <strong>OR</strong> Black
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <SearchOp>{'""'}</SearchOp>
                      <span>
                        Example: <strong>&quot;Apple&quot;</strong>
                      </span>
                    </li>
                  </ul>
                </div>
              ) : null}
            </form>
            <div className="group/help relative flex items-center gap-2 text-[13px] text-[#5c6b64]">
              <span>Group Items</span>
              <span className="relative text-[#9aa6a0]">
                <CircleHelp className="h-4 w-4" />
                <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-40 hidden w-[280px] -translate-x-1/2 rounded-md bg-[#3d4f47] px-3 py-2 text-center text-[12px] leading-snug text-white shadow-lg group-hover/help:block">
                  Group items with multiple variants and clones with the same SID.
                </span>
              </span>
              <ToggleSwitch checked={group} onChange={setGroup} disabled={scanning} />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = chromeMenu === "sort" ? null : "sort";
                  setChromeMenu(next);
                  if (next === "sort") setSortQuery("");
                }}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px]",
                  chromeMenu === "sort" ? "bg-[#3d4f47] text-white" : "text-[#3d4f47] hover:bg-[#f4f6f5]",
                )}
              >
                {sortLabel}
                {dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              </button>
              {chromeMenu === "sort" ? (
                <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-lg border border-[#e6ebe8] bg-white shadow-[0_8px_24px_rgb(16_24_20/0.14)]">
                  <div className="relative border-b border-[#eef2f0] px-2 py-2">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
                    <input
                      autoFocus
                      value={sortQuery}
                      onChange={(e) => setSortQuery(e.target.value)}
                      placeholder="Search"
                      className="h-8 w-full rounded-md bg-transparent pl-8 pr-2 text-[13px] text-[#3d4f47] outline-none placeholder:text-[#9aa6a0]"
                    />
                  </div>
                  <div className="py-1">
                    {visibleSortOptions.length ? (
                      visibleSortOptions.map(([value, label]) => {
                        const active = sort === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              if (active) {
                                setDir(dir === "DESC" ? "ASC" : "DESC");
                              } else {
                                setSort(value);
                                setDir(value === "NAME" ? "ASC" : "DESC");
                              }
                              setChromeMenu(null);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-2 text-left text-[14px]",
                              active ? "text-primary" : "text-[#3d4f47] hover:bg-[#f4f6f5]",
                            )}
                          >
                            {label}
                            {active ? (
                              dir === "ASC" ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-4 py-3 text-[13px] text-[#8a9a93]">No matches</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                title="View"
                onClick={() => setChromeMenu(chromeMenu === "view" ? null : "view")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#5c6b64] hover:bg-[#f4f6f5]"
              >
                <ViewIcon className="h-4 w-4" />
              </button>
              {chromeMenu === "view" ? (
                <div className="absolute right-0 top-9 z-30 w-52 rounded-lg border border-[#e6ebe8] bg-white py-2 shadow-lg">
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Layout type</p>
                  {(
                    [
                      ["GRID", "Grid", LayoutGrid],
                      ["LIST", "List", List],
                      ["TABLE", "Table", Table2],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setView(id);
                        setChromeMenu(null);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-[13px]",
                        view === id ? "bg-primary-soft text-primary" : "text-[#3d4f47] hover:bg-[#f4f6f5]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                  <p className="mt-2 px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">View options</p>
                  <div className="flex items-center justify-between px-3 py-1.5 text-[13px] text-[#3d4f47]">
                    Hide Folders
                    <ToggleSwitch checked={hideFolders} onChange={setHideFolders} />
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-[13px] text-[#3d4f47]">
                    Hide SID
                    <ToggleSwitch checked={hideSid} onChange={setHideSid} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {scanning ? (
            <div className="-mx-6 mt-4 space-y-1 bg-[#f4f6f5] px-6 py-2.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#e24b4b]">Scanning mode is enabled. Please use handheld scanner to perform search.</span>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={stopScanning}
                  className="inline-flex items-center gap-1.5 text-[#e24b4b] hover:underline"
                >
                  Close scanning mode
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[12px] text-[#8a9a93]">
                1D scanners cannot read QR codes — use a 2D scanner or the camera when linking QR labels.
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 pb-4 text-[13px] text-[#8a9a93]">
            <Stat label="Folders" value={data.stats.folders} />
            <Stat label="Items" value={data.stats.items} />
            <Stat label="Total Quantity" value={`${data.stats.quantity} units`} />
            <Stat label="Total Value" value={formatMoney(data.stats.value)} />
          </div>
          {!isRoot && savedFolderLabels.length ? (
            <div className="border-t border-[#e6ebe8] pb-3 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Saved labels</p>
              <ul className="mt-1 space-y-1">
                {savedFolderLabels.slice(0, 5).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-[#4a5c54]">
                      {row.kind === "QR" ? "QR" : "Barcode"} · {row.name}
                    </span>
                    <button
                      type="button"
                      disabled={reprintingLabelId === row.id}
                      onClick={() => {
                        setReprintingLabelId(row.id);
                        void reprintSavedLabel({
                          name: row.name,
                          codeValue: row.codeValue,
                          kind: row.kind,
                          sizeId: row.sizeId,
                          config: row.config,
                          photoUrl: data.folder?.photos?.[0]
                            ? data.folder.photos[0].publicUrl || `/api/v1/photos/${data.folder.photos[0].id}`
                            : null,
                        }).finally(() => setReprintingLabelId(null));
                      }}
                      className="font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {reprintingLabelId === row.id ? "Printing…" : "Reprint"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </header>
        {selecting ? (
          <BulkActionBar
            itemCount={selectedItemIds.length}
            folderCount={selectedFolderIds.length}
            pageTotal={pageTotal}
            allOnPageSelected={allOnPageSelected}
            hasMoreMatching={hasMoreMatching}
            onSelectAllPage={selectAllOnPage}
            onSelectAllMatching={hasMoreMatching ? () => void selectAllMatching() : undefined}
            onEdit={() => setBulkEditOpen(true)}
            onUpdateQuantity={() => {
              if (!selectedItemIds.length) return;
              setBulkQtyOpen(true);
            }}
            onMove={() => setBulkMoveOpen(true)}
            onRestock={() => {
              const item = visibleEntries.find((e) => e.kind === "item" && selectedItemIds.includes(e.data.id));
              if (item?.kind === "item") setRestockItem(item.data);
            }}
            onLabels={() => {
              if (!data) return;
              const targets: LabelTarget[] = [];
              for (const entry of visibleEntries) {
                if (entry.kind === "item" && selectedItemIds.includes(entry.data.id)) {
                  targets.push(itemToLabelTarget(entry.data, data.fields ?? []));
                }
              }
              if (!targets.length) return;
              setLabelTargets(targets);
              setLabelOpen(true);
            }}
            onExport={() => {
              if (selectedItemIds.length) {
                setExportFolderId(selectedFolderIds.length === 1 ? selectedFolderIds[0] : folderId);
                setExportItemIds(selectedItemIds);
              } else if (selectedFolderIds.length === 1) {
                setExportFolderId(selectedFolderIds[0]);
                setExportItemIds(undefined);
              } else if (selectedFolderIds.length > 1) {
                toast.info("Select one folder or include items to export a specific scope");
                return;
              } else {
                setExportFolderId(folderId);
                setExportItemIds(undefined);
              }
              setExportOpen(true);
            }}
            onAlerts={() => {
              if (selectedItemIds.length) {
                setAlertItemIds(selectedItemIds);
                if (selectedFolderIds.length) {
                  toast.info("Folder alerts apply one folder at a time — deselect items first.");
                }
                return;
              }
              if (selectedFolderIds.length === 1) {
                const folder = visibleEntries.find((e) => e.kind === "folder" && e.data.id === selectedFolderIds[0]);
                if (folder?.kind === "folder") setAlertFolder({ id: folder.data.id, name: folder.data.name });
                return;
              }
              if (selectedFolderIds.length > 1) {
                toast.info("Select one folder at a time to set a folder alert");
              }
            }}
            onClone={() => {
              if (selectedItemIds.length !== 1) {
                toast.error("Select one item to clone");
                return;
              }
              const item = visibleEntries.find((e) => e.kind === "item" && e.data.id === selectedItemIds[0]);
              if (item?.kind === "item") setCloneItem(item.data);
            }}
            onAddTo={() => {
              const item = visibleEntries.find((e) => e.kind === "item" && selectedItemIds.includes(e.data.id));
              if (item?.kind === "item") setAddToItem(item.data);
            }}
            onDelete={() => setBulkDeleteOpen(true)}
            onClear={() => {
              setSelectedFolderIds([]);
              setSelectedItemIds([]);
            }}
          />
        ) : null}

        <div
          className={cn(
            "flex-1 min-h-0 scrollbar-thin",
            view === "LIST" ? "overflow-y-auto bg-[#eef1ef] p-6" : view === "TABLE" ? "overflow-hidden bg-white" : "overflow-y-auto p-6",
          )}
        >
          {scanning ? (
            <ScanningEmpty miss={scanMiss} />
          ) : visibleEntries.length === 0 ? (
            <EmptyState onAddItem={() => setAddItem(true)} onAddFolder={() => setAddFolder(true)} />
          ) : view === "TABLE" ? (
            <CatalogTableView
              entries={visibleEntries}
              fields={data.fields ?? []}
              tree={data.tree}
              rootId={data.rootId}
              selecting={selecting}
              selectedFolderIds={selectedFolderIds}
              selectedItemIds={selectedItemIds}
              onToggleFolder={(id) => {
                setSelectedFolderIds((ids) => (ids.includes(id) ? ids.filter((row) => row !== id) : [...ids, id]));
              }}
              onToggleItem={(id) => {
                setSelectedItemIds((ids) => (ids.includes(id) ? ids.filter((row) => row !== id) : [...ids, id]));
              }}
              onSelectAll={(checked) => {
                if (!checked) {
                  setSelectedFolderIds([]);
                  setSelectedItemIds([]);
                  return;
                }
                setSelectedFolderIds(visibleEntries.filter((e) => e.kind === "folder").map((e) => e.data.id));
                setSelectedItemIds(visibleEntries.filter((e) => e.kind === "item").map((e) => e.data.id));
              }}
              onCreateLabelFolder={(folder) => {
                setLabelTargets([folderToLabelTarget(folder, data.fields ?? [])]);
                setLabelOpen(true);
              }}
              onCreateLabelItem={(item) => {
                setLabelTargets([itemToLabelTarget(item, data.fields ?? [])]);
                setLabelOpen(true);
              }}
              onMoveItem={(item) => setMoveItem(item)}
              onQtyItem={(item) => setQtyItem(item)}
              onCloneFolder={(folder) => setCloneFolder(folder)}
              onCloneItem={(item) => setCloneItem(item)}
              onMergeItem={(item) => setMergeItemId(item.id)}
              onExportFolder={(folder) => {
                setExportFolderId(folder.id);
                setExportItemIds(undefined);
                setExportOpen(true);
              }}
              onExportItem={(item) => {
                setExportFolderId(undefined);
                setExportItemIds([item.id]);
                setExportOpen(true);
              }}
              onAlertItem={(item) => setAlertItemIds([item.id])}
              onRestockItem={(item) => setRestockItem(item)}
              onAddToItem={(item) => setAddToItem(item)}
              onDeleteItem={(item) => setDeleteItem(item)}
              onFolderMenuAction={(folder, action) =>
                handleFolderMenuAction(
                  {
                    id: folder.id,
                    name: folder.name,
                    parentId: folder.parentId,
                    tags: folder.tags?.map((row) => row.tag.name),
                  },
                  action,
                )
              }
              onChanged={() => {
                setSelectedFolderIds([]);
                setSelectedItemIds([]);
                load();
              }}
            />
          ) : (
            <div className={view === "GRID" ? "grid grid-cols-[repeat(auto-fill,230px)] gap-5" : "flex flex-col gap-3"}>
              {visibleEntries.map((entry) =>
                entry.kind === "folder" ? (
                  <FolderTile
                    key={entry.data.id}
                    folder={entry.data}
                    list={view === "LIST"}
                    menu={menu}
                    setMenu={setMenu}
                    selected={selectedFolderIds.includes(entry.data.id)}
                    showChecks={selecting}
                    onToggleSelect={() => {
                      setSelectedFolderIds((ids) =>
                        ids.includes(entry.data.id) ? ids.filter((id) => id !== entry.data.id) : [...ids, entry.data.id],
                      );
                    }}
                    fields={data.fields ?? []}
                    listFields={view === "LIST" ? fieldsForList(data.fields ?? [], "FOLDER") : undefined}
                    hideSid={hideSid}
                    tree={data.tree}
                    rootId={data.rootId}
                    onCreateLabel={() => {
                      setLabelTargets([folderToLabelTarget(entry.data, data.fields ?? [])]);
                      setLabelOpen(true);
                      setMenu(null);
                    }}
                    onExport={() => {
                      setExportFolderId(entry.data.id);
                      setExportItemIds(undefined);
                      setExportOpen(true);
                      setMenu(null);
                    }}
                    onClone={() => {
                      setCloneFolder(entry.data);
                      setMenu(null);
                    }}
                    onDelete={() => {
                      handleFolderMenuAction(
                        { id: entry.data.id, name: entry.data.name, parentId: entry.data.parentId },
                        "delete",
                      );
                      setMenu(null);
                    }}
                    onChanged={() => {
                      setSelectedFolderIds((ids) => ids.filter((id) => id !== entry.data.id));
                      load();
                    }}
                  />
                ) : (
                  <ItemTile
                    key={entry.data.id}
                    item={entry.data}
                    list={view === "LIST"}
                    extraFields={view === "LIST" ? fieldsForList(data.fields ?? [], "ITEM") : undefined}
                    hideSid={hideSid}
                    menu={menu}
                    setMenu={setMenu}
                    selected={selectedItemIds.includes(entry.data.id)}
                    showChecks={selecting}
                    onToggleSelect={() => {
                      setSelectedItemIds((ids) =>
                        ids.includes(entry.data.id) ? ids.filter((id) => id !== entry.data.id) : [...ids, entry.data.id],
                      );
                    }}
                    onQty={() => setQtyItem(entry.data)}
                    onMove={() => setMoveItem(entry.data)}
                    onCreateLabel={() => {
                      setLabelTargets([itemToLabelTarget(entry.data, data.fields ?? [])]);
                      setLabelOpen(true);
                      setMenu(null);
                    }}
                    onClone={() => {
                      setCloneItem(entry.data);
                      setMenu(null);
                    }}
                    onMerge={() => {
                      setMergeItemId(entry.data.id);
                      setMenu(null);
                    }}
                    onExport={() => {
                      setExportFolderId(undefined);
                      setExportItemIds([entry.data.id]);
                      setExportOpen(true);
                      setMenu(null);
                    }}
                    onAlert={() => {
                      setAlertItemIds([entry.data.id]);
                      setMenu(null);
                    }}
                    onRestock={() => {
                      setRestockItem(entry.data);
                      setMenu(null);
                    }}
                    onAddTo={() => {
                      setAddToItem(entry.data);
                      setMenu(null);
                    }}
                    onDelete={() => {
                      setDeleteItem(entry.data);
                      setMenu(null);
                    }}
                    onDeleted={() => {
                      setSelectedItemIds((ids) => ids.filter((id) => id !== entry.data.id));
                      load();
                    }}
                  />
                ),
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[#e6ebe8] bg-white px-6 py-3 text-sm text-[#6b7c74]">
          <label className="flex items-center gap-2 text-[13px]">
            Show:
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-[#d8dfdb] bg-white px-2 text-[13px] text-[#3d4f47] outline-none focus:border-primary"
            >
              {[20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            per page
          </label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                load(next);
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                load(next);
              }}
            >
              Next
            </Button>
          </div>
        </footer>
      </section>

      <AddItemModal
        open={addItem}
        folderId={data.folder?.id ?? data.rootId}
        tree={data.tree}
        rootId={data.rootId}
        onClose={() => setAddItem(false)}
        onCreated={() => {
          setAddItem(false);
          load();
        }}
      />
      <AddFolderModal
        open={addFolder}
        parentId={data.folder?.id ?? data.rootId}
        tree={data.tree}
        onClose={() => setAddFolder(false)}
        onCreated={() => {
          load();
        }}
      />
      <CreateLabelWizard
        open={labelOpen}
        mode="linked"
        targets={labelTargets}
        onClose={() => {
          setLabelOpen(false);
          if (folderId && folderId !== data?.rootId) {
            api<{ saved: typeof savedFolderLabels }>(`/api/v1/labels?folderId=${folderId}`)
              .then((res) => setSavedFolderLabels(res.saved))
              .catch(() => undefined);
          }
        }}
      />
      {qtyItem ? (
        <UpdateQuantityModal
          item={qtyItem}
          onClose={() => setQtyItem(null)}
          onSaved={() => {
            setQtyItem(null);
            load();
          }}
        />
      ) : null}
      {moveItem ? (
        <MoveItemModal
          item={moveItem}
          tree={data.tree}
          rootId={data.rootId}
          returnToOriginEnabled={returnToOriginEnabled}
          onClose={() => setMoveItem(null)}
          onSaved={(dest) => {
            setMoveItem(null);
            router.push(`/folder/${dest}/content`);
          }}
        />
      ) : null}
      {restockItem ? (
        <RestockModal
          item={itemCardToTarget(restockItem)}
          onClose={() => setRestockItem(null)}
          onDone={(href) => {
            setRestockItem(null);
            router.push(href);
          }}
        />
      ) : null}
      {addToItem ? (
        <AddToModal
          item={itemCardToTarget(addToItem)}
          onClose={() => setAddToItem(null)}
          onDone={(href) => {
            setAddToItem(null);
            router.push(href);
          }}
        />
      ) : null}
      {deleteItem ? (
        <DeleteItemModal
          itemName={deleteItem.name}
          onClose={() => setDeleteItem(null)}
          onConfirm={async (meta) => {
            await api(`/api/v1/items/${deleteItem.id}`, {
              method: "DELETE",
              body: JSON.stringify({ reason: meta.reason || null, note: meta.note || null }),
              toast: "Item moved to Trash",
            });
            setDeleteItem(null);
            setSelectedItemIds((ids) => ids.filter((id) => id !== deleteItem.id));
            load();
          }}
        />
      ) : null}
      {bulkQtyOpen && selectedItemIds.length ? (
        <BulkUpdateQuantityModal
          itemIds={selectedItemIds}
          onClose={() => setBulkQtyOpen(false)}
          onSaved={() => {
            setBulkQtyOpen(false);
            load();
          }}
        />
      ) : null}
      {bulkMoveOpen ? (
        <BulkMoveModal
          itemIds={selectedItemIds}
          folderIds={selectedFolderIds}
          tree={data.tree}
          rootId={data.rootId}
          onClose={() => setBulkMoveOpen(false)}
          onSaved={() => {
            setBulkMoveOpen(false);
            setSelectedFolderIds([]);
            setSelectedItemIds([]);
            load();
          }}
        />
      ) : null}
      {bulkDeleteOpen ? (
        <BulkDeleteModal
          itemCount={selectedItemIds.length}
          folderCount={selectedFolderIds.length}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={confirmBulkDelete}
        />
      ) : null}
      {bulkEditOpen ? (
        <BulkEditModal
          itemIds={selectedItemIds}
          folderIds={selectedFolderIds}
          onClose={() => setBulkEditOpen(false)}
          onDone={() => {
            setBulkEditOpen(false);
            load();
          }}
        />
      ) : null}
      <ExportWizard
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        folderId={exportFolderId ?? (exportItemIds?.length ? undefined : folderId)}
        itemIds={exportItemIds}
      />
      {cloneItem && data ? (
        <CloneItemModal
          item={cloneItem}
          tree={data.tree}
          rootId={data.rootId}
          onClose={() => setCloneItem(null)}
          onDone={() => {
            setCloneItem(null);
            load();
          }}
        />
      ) : null}
      {cloneFolder && data ? (
        <CloneFolderModal
          folder={cloneFolder}
          tree={data.tree}
          rootId={data.rootId}
          onClose={() => setCloneFolder(null)}
          onDone={() => {
            setCloneFolder(null);
            load();
          }}
        />
      ) : null}
      {mergeItemId ? (
        <MergeItemModal
          itemId={mergeItemId}
          onClose={() => setMergeItemId(null)}
          onDone={() => {
            setMergeItemId(null);
            load();
          }}
        />
      ) : null}
      {alertItemIds ? (
        <ItemAlertModal
          itemIds={alertItemIds}
          itemName={visibleEntries.find((e) => e.kind === "item" && e.data.id === alertItemIds[0])?.kind === "item" ? (visibleEntries.find((e) => e.kind === "item" && e.data.id === alertItemIds[0]) as { data: ItemCard }).data.name : undefined}
          fields={data.fields ?? []}
          onClose={() => setAlertItemIds(null)}
        />
      ) : null}
      {alertFolder ? (
        <SetAlertModal
          folderId={alertFolder.id}
          folderName={alertFolder.name}
          fields={data.fields ?? []}
          onClose={() => setAlertFolder(null)}
        />
      ) : null}
      {editFolderTarget ? (
        <EditFolderModal
          folderId={editFolderTarget.id}
          initialName={editFolderTarget.name}
          initialTags={editFolderTarget.tags}
          onClose={() => setEditFolderTarget(null)}
          onSaved={() => {
            setEditFolderTarget(null);
            load();
          }}
        />
      ) : null}
      {moveFolderTarget && data ? (
        <MoveFolderModal
          folderId={moveFolderTarget.id}
          folderName={moveFolderTarget.name}
          parentId={moveFolderTarget.parentId ?? data.rootId}
          tree={data.tree}
          rootId={data.rootId}
          onClose={() => setMoveFolderTarget(null)}
          onSaved={() => {
            const movedId = moveFolderTarget.id;
            setMoveFolderTarget(null);
            if (movedId === data.folder?.id) {
              router.push(`/folder/${movedId}/content`);
            }
            load();
          }}
        />
      ) : null}
      {deleteFolderTarget ? (
        <DeleteFolderModal
          folderName={deleteFolderTarget.folder.name}
          onClose={() => setDeleteFolderTarget(null)}
          onConfirm={confirmDeleteFolder}
        />
      ) : null}
      {permissionsFolder ? (
        <PermissionsModal
          folderId={permissionsFolder.id}
          folderName={permissionsFolder.name}
          onClose={() => setPermissionsFolder(null)}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      {label}: <span className="font-medium text-[#5c6b64]">{value}</span>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-50",
        checked ? "bg-primary" : "bg-[#c5d0cb]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition",
          checked ? "left-4" : "left-0.5",
        )}
      />
    </button>
  );
}

function TableCheck({
  checked,
  visible,
  label,
  onToggle,
}: {
  checked: boolean;
  visible: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-[3px] border-2 transition",
        checked ? "border-primary bg-primary" : "border-[#c5d0cb] bg-white",
        visible || checked ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
    </button>
  );
}

function SearchOp({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded border border-[#d8dfdb] bg-[#f4f6f5] px-1.5 text-[12px] font-bold text-[#3d4f47]">
      {children}
    </span>
  );
}

function photoUrl(photos: { id: string; publicUrl?: string | null }[]) {
  const photo = photos[0];
  if (!photo) return null;
  return photo.publicUrl || `/api/v1/photos/${photo.id}`;
}

function extraFieldsFor(
  fields: CustomFieldDef[],
  stored: StoredCustomValue[] | undefined,
  appliesTo: "ITEM" | "FOLDER",
) {
  return fields
    .filter((field) => (appliesTo === "ITEM" ? field.appliesTo !== "FOLDER" : field.appliesTo !== "ITEM"))
    .map((field) => ({
      id: field.id,
      name: field.name,
      value: formatCustomValue(field, stored?.find((row) => row.fieldId === field.id)),
    }));
}

function itemToLabelTarget(item: ItemCard, fields: CustomFieldDef[]): LabelTarget {
  return {
    kind: "item",
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    price: item.price,
    totalValue: item.totalValue,
    notes: item.notes,
    tags: item.tags?.map((row) => row.tag.name),
    photoUrl: photoUrl(item.photos),
    extraFields: extraFieldsFor(fields, item.customValues, "ITEM"),
  };
}

function folderToLabelTarget(
  folder: {
    id: string;
    name: string;
    sid?: string;
    notes?: string | null;
    photos?: { id: string; publicUrl?: string | null }[];
    tags?: { tag: { name: string } }[];
    barcodes?: { value: string; slot: number }[];
    customValues?: StoredCustomValue[];
  },
  fields: CustomFieldDef[],
): LabelTarget {
  const native = folder.barcodes?.find((row) => row.slot === 1)?.value ?? folder.sid ?? folder.name;
  return {
    kind: "folder",
    id: folder.id,
    name: folder.name,
    sid: native,
    notes: folder.notes,
    tags: folder.tags?.map((row) => row.tag.name),
    photoUrl: folder.photos ? photoUrl(folder.photos) : null,
    extraFields: extraFieldsFor(fields, folder.customValues, "FOLDER"),
  };
}

function itemHref(item: ItemCard) {
  return item.groupedCount && item.groupedCount > 1 ? `/group/${encodeURIComponent(item.sid)}` : `/item/${item.id}`;
}

function ItemCover({ item }: { item: ItemCard }) {
  const shots = item.photos.slice(0, 3);
  const src = (photo: { id: string; publicUrl?: string | null }) => photo.publicUrl || `/api/v1/photos/${photo.id}`;
  if (!shots.length) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-xs font-semibold uppercase tracking-wide text-[#b7c2bd]">
        {item.name}
      </div>
    );
  }
  if (shots.length === 1 || !(item.groupedCount && item.groupedCount > 1)) {
    return <img src={src(shots[0])} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-[2px] bg-white">
      <div className="col-span-2 row-span-2 min-h-0 min-w-0 overflow-hidden">
        <img src={src(shots[0])} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden">
        <img src={src(shots[1])} alt="" className="h-full w-full object-cover" />
      </div>
      {shots[2] ? (
        <div className="min-h-0 min-w-0 overflow-hidden">
          <img src={src(shots[2])} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="bg-[#d4d4d4]" />
      )}
    </div>
  );
}

function itemCardToTarget(item: ItemCard): ItemActionTarget {
  return {
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    price: item.price,
    totalValue: item.totalValue,
    productLink: item.productLink,
    folderId: item.folderId,
    lastFromFolderId: item.lastFromFolderId,
    unit: item.unit,
  };
}

function itemTileMenuAction(
  action: ItemMenuAction,
  item: ItemCard,
  handlers: {
    onCreateLabel: () => void;
    onExport: () => void;
    onClone: () => void;
    onMerge: () => void;
    onAlert: () => void;
    onRestock: () => void;
    onAddTo: () => void;
    onDelete: () => void;
  },
) {
  if (action === "create-label") handlers.onCreateLabel();
  else if (action === "export") handlers.onExport();
  else if (action === "clone") handlers.onClone();
  else if (action === "merge") handlers.onMerge();
  else if (action === "set-alert") handlers.onAlert();
  else if (action === "restock") handlers.onRestock();
  else if (action === "add-to") handlers.onAddTo();
  else if (action === "delete") handlers.onDelete();
}

function ItemTile({
  item,
  list,
  extraFields,
  hideSid,
  menu,
  setMenu,
  selected,
  showChecks,
  onToggleSelect,
  onQty,
  onMove,
  onCreateLabel,
  onClone,
  onMerge,
  onExport,
  onAlert,
  onRestock,
  onAddTo,
  onDelete,
  onDeleted,
}: {
  item: ItemCard;
  list?: boolean;
  extraFields?: CustomFieldDef[];
  hideSid?: boolean;
  menu: string | null;
  setMenu: (id: string | null) => void;
  selected: boolean;
  showChecks?: boolean;
  onToggleSelect: () => void;
  onQty: () => void;
  onMove: () => void;
  onCreateLabel: () => void;
  onClone: () => void;
  onMerge: () => void;
  onExport: () => void;
  onAlert: () => void;
  onRestock: () => void;
  onAddTo: () => void;
  onDelete: () => void;
  onDeleted: () => void;
}) {
  const isNew = Date.now() - new Date(item.createdAt).getTime() < 1000 * 60 * 60 * 24 * 7;
  const low = item.minQuantity != null && item.quantity <= item.minQuantity;
  const qty = item.groupedQty ?? item.quantity;
  const grouped = (item.groupedCount ?? 1) > 1;
  const href = itemHref(item);
  const unitLabel = item.unit?.name ? item.unit.name.toLowerCase() : item.unit?.abbreviation ?? "units";
  const open = menu === item.id;
  const checksOn = selected || Boolean(showChecks);
  const qtyLine = (
    <>
      {qty} {unitLabel}
      {grouped ? ` · ${item.groupedCount} locations` : null}
      <span className="text-[#c5d0cb]"> | </span>
      {formatMoney(item.totalValue)}
    </>
  );

  return (
    <div
      className={cn(
        "group relative rounded-xl bg-white shadow-sm ring-1 ring-border",
        list ? "flex min-h-[132px] items-stretch overflow-hidden" : "flex h-[194px] w-[230px] flex-col overflow-hidden",
        selected && "ring-primary",
        (open || selected) && "z-20",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden", list ? "w-[132px] self-stretch" : "h-[138px] w-full")}>
      <Link href={href} className="absolute inset-0 block bg-[#eceeed]">
        <ItemCover item={item} />
      </Link>
      <button
        type="button"
        aria-label={selected ? "Deselect item" : "Select item"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleSelect();
        }}
        className={cn(
          "absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-[3px] border-2 border-white shadow-sm transition",
          selected ? "bg-primary" : "bg-transparent",
          checksOn ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {selected ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
      </button>
      {grouped ? (
        <span
          className={cn(
            "absolute top-2 rounded bg-[#3d4f47] px-1.5 py-0.5 text-[10px] font-bold text-white",
            checksOn ? "left-9" : "left-2 group-hover:left-9",
          )}
        >
          {item.groupedCount}
        </span>
      ) : isNew ? (
        <span
          className={cn(
            "absolute top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white",
            checksOn ? "left-9" : "left-2 group-hover:left-9",
          )}
        >
          NEW
        </span>
      ) : null}
      {low ? (
        <span className="absolute right-2 top-2 rounded bg-warning px-1.5 py-0.5 text-[10px] font-bold text-white">LOW STOCK</span>
      ) : null}
      <div
        className={cn(
          "absolute hidden gap-1.5 group-hover:flex",
          list ? "bottom-2 right-2" : "right-2 top-10 flex-col",
        )}
      >
        {grouped ? null : (
          <>
            <Mini
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onQty();
              }}
              title="Quantity"
            >
              ±
            </Mini>
            <Mini
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMove();
              }}
              title="Move"
            >
              →
            </Mini>
            <Mini
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAlert();
              }}
              title="Set alert"
            >
              !
            </Mini>
          </>
        )}
        {list ? null : (
          <Mini
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenu(open ? null : item.id);
            }}
            title="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Mini>
        )}
      </div>
      </div>
      {list ? (
        <>
          <Link href={href} className="flex min-w-0 flex-1 flex-col justify-center px-6 py-4">
            {hideSid ? null : <div className="text-[13px] tracking-wide text-[#b7c2bd]">{item.sid}</div>}
            <div className="truncate text-[20px] font-semibold leading-tight text-[#2a3a33]">{item.name}</div>
            <div className="mt-2 text-[13px] text-[#8a9a93]">{qtyLine}</div>
          </Link>
          <div className="relative flex w-[min(42%,420px)] min-w-[220px] shrink-0 items-start justify-between gap-3 border-l border-dotted border-[#c5d0cb] px-5 py-4">
            <CatalogListMeta
              fields={extraFields ?? []}
              stored={item.customValues}
              updatedAt={item.updatedAt || item.createdAt}
            />
            <div className="relative shrink-0">
              <button
                type="button"
                title="More"
                aria-label="More item actions"
                aria-expanded={open}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenu(open ? null : item.id);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-[#6b7c74] hover:bg-[#f4f6f5]",
                  open ? "bg-[#f4f6f5] opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {open ? (
                <ItemCardMenu
                  itemId={item.id}
                  variant="card"
                  className="absolute right-0 top-9 z-10 w-44 rounded-lg border border-border bg-white py-1 text-sm shadow-lg"
                  onClose={() => setMenu(null)}
                  onAction={(action) =>
                    itemTileMenuAction(action, item, {
                      onCreateLabel,
                      onExport,
                      onClone,
                      onMerge,
                      onAlert,
                      onRestock,
                      onAddTo,
                      onDelete,
                    })
                  }
                />
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <>
          {open ? (
            <ItemCardMenu
              itemId={item.id}
              variant="card"
              className="absolute right-2 top-24 z-10 w-44 rounded-lg border border-border bg-white py-1 text-sm shadow-lg"
              onClose={() => setMenu(null)}
              onAction={(action) =>
                itemTileMenuAction(action, item, {
                  onCreateLabel,
                  onExport,
                  onClone,
                  onMerge,
                  onAlert,
                  onRestock,
                  onAddTo,
                  onDelete,
                })
              }
            />
          ) : null}
          <Link href={href} className="block h-[56px] px-3 pt-2">
            <div className="truncate text-[14px] font-semibold leading-snug text-[#3d4f47]">{item.name}</div>
            <div className="mt-0.5 text-[12px] text-[#8a9a93]">{qtyLine}</div>
          </Link>
        </>
      )}
    </div>
  );
}

function Mini({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm shadow" {...props}>
      {children}
    </button>
  );
}

function ScanningEmpty({ miss }: { miss: string }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <svg viewBox="0 0 180 140" className="h-32 w-40 text-[#c5d0cb]" fill="none" aria-hidden>
        <rect x="18" y="58" width="78" height="58" rx="6" stroke="currentColor" strokeWidth="3" />
        <path d="M18 78h78" stroke="currentColor" strokeWidth="3" />
        <rect x="34" y="88" width="40" height="18" rx="2" stroke="currentColor" strokeWidth="2.5" />
        <path d="M40 92v10M45 92v10M50 92v10M55 92v10M62 92v10" stroke="currentColor" strokeWidth="2" />
        <rect x="118" y="22" width="32" height="54" rx="8" stroke="currentColor" strokeWidth="3" />
        <rect x="126" y="10" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="3" />
        <path d="M102 48h16" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4" />
        <circle cx="134" cy="48" r="4" fill="currentColor" />
      </svg>
      <p className="mt-6 max-w-md text-[15px] text-[#8a9a93]">Scan QR / Barcode using scanner to search for items and folders</p>
      {miss ? <p className="mt-3 text-sm text-[#e24b4b]">{miss}</p> : null}
    </div>
  );
}

function EmptyState({ onAddItem, onAddFolder }: { onAddItem: () => void; onAddFolder: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-semibold">No items in this folder</h2>
      <p className="mt-2 text-sm text-muted-foreground">Add an item or a nested folder to start tracking inventory.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={onAddItem}>Add Item</Button>
        <Button variant="secondary" onClick={onAddFolder}>
          Add Folder
        </Button>
      </div>
    </div>
  );
}
