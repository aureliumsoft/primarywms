"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, Columns3, FolderInput, GripVertical, MoreVertical, Pencil, Upload } from "lucide-react";
import { formatMoney } from "@primarywms/shared";
import { toast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCustomValue, type CustomFieldDef, type StoredCustomValue } from "@/lib/custom-field-values";
import { FolderCardMenu, type FolderMenuAction } from "@/components/folders/FolderCardMenu";
import { ItemCardMenu } from "@/components/items/ItemCardMenu";
import type { ItemMenuAction } from "@/components/items/ItemActionsMenu";
import type { TreeFolder } from "./FolderPane";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";

export type TableFolder = {
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

export type TableItem = {
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
  tags?: { tag: { name: string } }[];
  barcodes?: { id: string; value: string; symbology: string; slot: number }[];
  productLink?: string | null;
  groupedCount?: number;
  groupedQty?: number;
  customValues?: StoredCustomValue[];
};

export type TableEntry = { kind: "folder"; data: TableFolder } | { kind: "item"; data: TableItem };

type ColumnId =
  | "quantity"
  | "price"
  | "value"
  | "tags"
  | "notes"
  | "barcode1"
  | "barcode2"
  | "productLink"
  | "sid"
  | `cf:${string}`;

type ColumnDef = { id: ColumnId; label: string };

const STORAGE_KEY = "primarywms.tableColumns";
const DEFAULT_VISIBLE: ColumnId[] = ["quantity", "price", "value"];

function builtInColumns(): ColumnDef[] {
  return [
    { id: "quantity", label: "Quantity" },
    { id: "price", label: "Price" },
    { id: "value", label: "Value" },
    { id: "tags", label: "Tags" },
    { id: "notes", label: "Notes" },
    { id: "barcode1", label: "Barcode / QR 1" },
    { id: "barcode2", label: "Barcode / QR 2" },
    { id: "productLink", label: "Product Link" },
    { id: "sid", label: "SID" },
  ];
}

function readStoredColumns(available: ColumnDef[]): { order: ColumnId[]; visible: ColumnId[] } {
  const fallback = {
    order: available.map((c) => c.id),
    visible: DEFAULT_VISIBLE.filter((id) => available.some((c) => c.id === id)),
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { order?: string[]; visible?: string[] };
    const ids = new Set(available.map((c) => c.id));
    const order = (parsed.order ?? []).filter((id): id is ColumnId => ids.has(id as ColumnId));
    for (const col of available) if (!order.includes(col.id)) order.push(col.id);
    const visible = (parsed.visible ?? DEFAULT_VISIBLE).filter((id): id is ColumnId => ids.has(id as ColumnId));
    return { order, visible: visible.length ? visible : fallback.visible };
  } catch {
    return fallback;
  }
}

function unitWord(qty: number, unit?: { name?: string; abbreviation?: string } | null) {
  const base = (unit?.name || unit?.abbreviation || "unit").toLowerCase();
  if (qty === 1) return base.endsWith("s") ? base.slice(0, -1) : base;
  return base.endsWith("s") ? base : `${base}s`;
}

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function folderMenuAction(
  folder: TableFolder,
  action: FolderMenuAction,
  handlers: {
    onFolderMenuAction?: (folder: TableFolder, action: FolderMenuAction) => void;
    onCreateLabelFolder: (folder: TableFolder) => void;
    onExportFolder?: (folder: TableFolder) => void;
    onCloneFolder?: (folder: TableFolder) => void;
    onChanged: () => void;
  },
) {
  if (handlers.onFolderMenuAction) {
    handlers.onFolderMenuAction(folder, action);
    return;
  }
  if (action === "create-label") {
    handlers.onCreateLabelFolder(folder);
    return;
  }
  if (action === "export") {
    if (handlers.onExportFolder) {
      handlers.onExportFolder(folder);
      return;
    }
    toast.error("Export is not available here");
    return;
  }
  if (action === "clone") {
    if (handlers.onCloneFolder) {
      handlers.onCloneFolder(folder);
      return;
    }
    toast.error("Clone is not available here");
    return;
  }
  if (action === "edit") {
    toast.error("Edit is not available here");
    return;
  }
  if (action === "delete") {
    toast.error("Delete is not available here");
  }
}

function itemMenuAction(
  action: ItemMenuAction,
  item: TableItem,
  handlers: {
    onCreateLabelItem: (item: TableItem) => void;
    onMoveItem: (item: TableItem) => void;
    onCloneItem?: (item: TableItem) => void;
    onMergeItem?: (item: TableItem) => void;
    onExportItem?: (item: TableItem) => void;
    onAlertItem?: (item: TableItem) => void;
    onRestockItem?: (item: TableItem) => void;
    onAddToItem?: (item: TableItem) => void;
    onDeleteItem?: (item: TableItem) => void;
    onChanged: () => void;
  },
) {
  if (action === "create-label") handlers.onCreateLabelItem(item);
  else if (action === "move") handlers.onMoveItem(item);
  else if (action === "export") handlers.onExportItem?.(item);
  else if (action === "clone") {
    if (handlers.onCloneItem) handlers.onCloneItem(item);
    else toast.error("Clone is not available here");
  } else if (action === "merge") handlers.onMergeItem?.(item);
  else if (action === "set-alert") handlers.onAlertItem?.(item);
  else if (action === "restock") handlers.onRestockItem?.(item);
  else if (action === "add-to") handlers.onAddToItem?.(item);
  else if (action === "delete") {
    if (handlers.onDeleteItem) handlers.onDeleteItem(item);
    else toast.error("Delete is not available here");
  }
}

export function CatalogTableView({
  entries,
  fields,
  tree: _tree,
  rootId: _rootId,
  selecting,
  selectedFolderIds,
  selectedItemIds,
  onToggleFolder,
  onToggleItem,
  onSelectAll,
  onCreateLabelFolder,
  onCreateLabelItem,
  onMoveItem,
  onQtyItem,
  onChanged,
  onCloneFolder,
  onCloneItem,
  onMergeItem,
  onExportFolder,
  onExportItem,
  onAlertItem,
  onRestockItem,
  onAddToItem,
  onDeleteItem,
  onFolderMenuAction,
}: {
  entries: TableEntry[];
  fields: CustomFieldDef[];
  tree: TreeFolder[];
  rootId: string;
  selecting: boolean;
  selectedFolderIds: string[];
  selectedItemIds: string[];
  onToggleFolder: (id: string) => void;
  onToggleItem: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onCreateLabelFolder: (folder: TableFolder) => void;
  onCreateLabelItem: (item: TableItem) => void;
  onMoveItem: (item: TableItem) => void;
  onQtyItem: (item: TableItem) => void;
  onChanged: () => void;
  onCloneFolder?: (folder: TableFolder) => void;
  onCloneItem?: (item: TableItem) => void;
  onMergeItem?: (item: TableItem) => void;
  onExportFolder?: (folder: TableFolder) => void;
  onExportItem?: (item: TableItem) => void;
  onAlertItem?: (item: TableItem) => void;
  onRestockItem?: (item: TableItem) => void;
  onAddToItem?: (item: TableItem) => void;
  onDeleteItem?: (item: TableItem) => void;
  onFolderMenuAction?: (folder: TableFolder, action: FolderMenuAction) => void;
}) {
  const available = useMemo<ColumnDef[]>(() => {
    const custom = fields.map((field) => ({ id: `cf:${field.id}` as ColumnId, label: field.name }));
    return [...builtInColumns(), ...custom];
  }, [fields]);

  const [order, setOrder] = useState<ColumnId[]>(() => available.map((c) => c.id));
  const [visible, setVisible] = useState<ColumnId[]>(DEFAULT_VISIBLE);
  const [draftOrder, setDraftOrder] = useState<ColumnId[]>([]);
  const [draftVisible, setDraftVisible] = useState<ColumnId[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<ColumnId | null>(null);
  const customizeRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readStoredColumns(available);
    setOrder(stored.order);
    setVisible(stored.visible);
  }, [available]);

  useEffect(() => {
    if (!customizeOpen && !menuId) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (customizeOpen && customizeRef.current && !customizeRef.current.contains(target)) setCustomizeOpen(false);
      if (menuId && menuRef.current && !menuRef.current.contains(target)) setMenuId(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [customizeOpen, menuId]);

  const activeColumns = order.filter((id) => visible.includes(id)).map((id) => available.find((c) => c.id === id)!).filter(Boolean);

  const allSelected =
    entries.length > 0 &&
    entries.every((entry) =>
      entry.kind === "folder" ? selectedFolderIds.includes(entry.data.id) : selectedItemIds.includes(entry.data.id),
    );

  const folderHandlers = {
    onFolderMenuAction,
    onCreateLabelFolder,
    onExportFolder,
    onCloneFolder,
    onChanged,
  };

  const itemHandlers = {
    onCreateLabelItem,
    onMoveItem,
    onCloneItem,
    onMergeItem,
    onExportItem,
    onAlertItem,
    onRestockItem,
    onAddToItem,
    onDeleteItem,
    onChanged,
  };

  function openCustomize() {
    setDraftOrder(order);
    setDraftVisible(visible);
    setCustomizeOpen(true);
    setMenuId(null);
  }

  function applyCustomize() {
    setOrder(draftOrder);
    setVisible(draftVisible);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: draftOrder, visible: draftVisible }));
    setCustomizeOpen(false);
  }

  function toggleDraft(id: ColumnId) {
    setDraftVisible((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  }

  function onDragStart(id: ColumnId) {
    setDragId(id);
  }

  function onDrop(targetId: ColumnId) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setDraftOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragId);
      const to = next.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
    setDragId(null);
  }

  function cellValue(entry: TableEntry, column: ColumnDef): string {
    if (entry.kind === "folder") {
      const folder = entry.data;
      switch (column.id) {
        case "quantity": {
          const qty = folder.quantity ?? 0;
          if (!qty && !folder._count.items) return "—";
          return `${qty} ${unitWord(qty)}`;
        }
        case "price":
          return "—";
        case "value":
          return formatMoney(folder.value ?? 0);
        case "tags":
          return folder.tags?.map((row) => row.tag.name).join(", ") || "—";
        case "notes":
          return folder.notes?.trim() || "—";
        case "barcode1":
          return folder.barcodes?.find((row) => row.slot === 1)?.value || folder.sid || "—";
        case "barcode2":
          return folder.barcodes?.find((row) => row.slot === 2)?.value || "—";
        case "productLink":
          return "—";
        case "sid":
          return folder.sid || "—";
        default: {
          if (column.id.startsWith("cf:")) {
            const fieldId = column.id.slice(3);
            const field = fields.find((row) => row.id === fieldId);
            if (!field) return "—";
            return formatCustomValue(field, folder.customValues?.find((row) => row.fieldId === fieldId)) || "—";
          }
          return "—";
        }
      }
    }

    const item = entry.data;
    switch (column.id) {
      case "quantity": {
        const qty = item.groupedQty ?? item.quantity;
        return `${qty} ${unitWord(qty, item.unit)}`;
      }
      case "price":
        return item.price == null ? "—" : formatMoney(item.price);
      case "value":
        return formatMoney(item.totalValue);
      case "tags":
        return item.tags?.map((row) => row.tag.name).join(", ") || "—";
      case "notes":
        return item.notes?.trim() || "—";
      case "barcode1":
        return item.barcodes?.find((row) => row.slot === 1)?.value || item.sid || "—";
      case "barcode2":
        return item.barcodes?.find((row) => row.slot === 2)?.value || "—";
      case "productLink":
        return item.productLink?.trim() || "—";
      case "sid":
        return item.sid || "—";
      default: {
        if (column.id.startsWith("cf:")) {
          const fieldId = column.id.slice(3);
          const field = fields.find((row) => row.id === fieldId);
          if (!field) return "—";
          return formatCustomValue(field, item.customValues?.find((row) => row.fieldId === fieldId)) || "—";
        }
        return "—";
      }
    }
  }

  return (
    <div className="h-full min-h-0 overflow-auto scrollbar-thin">
      <table className="w-max min-w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a9a93]">
            <th className="sticky left-0 top-0 z-30 min-w-[280px] bg-white px-3 py-3 shadow-[4px_0_8px_-4px_rgb(16_24_20/0.18)]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                  onClick={() => onSelectAll(!allSelected)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-2 transition",
                    allSelected ? "border-primary bg-primary" : "border-[#c5d0cb] bg-white",
                  )}
                >
                  {allSelected ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                </button>
                <span>Name</span>
              </div>
            </th>
            {activeColumns.map((column) => (
              <th key={column.id} className="sticky top-0 z-10 whitespace-nowrap bg-white px-4 py-3">
                {column.label}
              </th>
            ))}
            <th className="sticky right-0 top-0 z-30 w-[132px] bg-white px-3 py-2 text-right shadow-[-4px_0_8px_-4px_rgb(16_24_20/0.18)]">
              <div ref={customizeRef} className="relative inline-flex justify-end">
                <button
                  type="button"
                  title="Customize Columns"
                  onClick={() => (customizeOpen ? setCustomizeOpen(false) : openCustomize())}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-bold uppercase tracking-wide transition",
                    customizeOpen
                      ? "border-[#3d4f47] bg-[#3d4f47] text-white"
                      : "border-[#d8dfdb] bg-white text-[#5c6b64] hover:border-[#b8c4be]",
                  )}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                {customizeOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[280px] overflow-hidden rounded-xl border border-[#e6ebe8] bg-white shadow-[0_12px_32px_rgb(16_24_20/0.16)]">
                    <div className="border-b border-[#eef2f0] px-4 py-3">
                      <p className="text-[15px] font-medium text-[#2a3a33]">Customize Columns</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#8a9a93]">
                        Drag to reorder
                        <CircleHelp className="h-3.5 w-3.5" />
                      </p>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto py-1 scrollbar-thin">
                      {draftOrder.map((id) => {
                        const col = available.find((row) => row.id === id);
                        if (!col) return null;
                        const checked = draftVisible.includes(id);
                        return (
                          <div
                            key={id}
                            draggable
                            onDragStart={() => onDragStart(id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDrop(id)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#3d4f47] hover:bg-[#f7f9f8]",
                              dragId === id && "opacity-50",
                            )}
                          >
                            <button
                              type="button"
                              aria-label={`${checked ? "Hide" : "Show"} ${col.label}`}
                              onClick={() => toggleDraft(id)}
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2",
                                checked ? "border-primary bg-primary" : "border-[#c5d0cb] bg-white",
                              )}
                            >
                              {checked ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                            </button>
                            <span className="min-w-0 flex-1 truncate">{col.label}</span>
                            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[#c0cbc6]" />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 border-t border-[#eef2f0] px-4 py-3">
                      <button
                        type="button"
                        onClick={applyCustomize}
                        className="rounded-md bg-primary px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomizeOpen(false)}
                        className="text-[12px] font-bold uppercase tracking-wide text-[#6b7c74] hover:text-[#2a3a33]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const id = entry.data.id;
            const selected =
              entry.kind === "folder" ? selectedFolderIds.includes(id) : selectedItemIds.includes(id);
            const href = entry.kind === "folder" ? `/folder/${id}/content` : `/item/${id}`;
            const open = menuId === id;

            return (
              <tr
                key={`${entry.kind}-${id}`}
                className={cn("group/row border-t border-[#eef2f0] hover:bg-[#f4f6f5]", open && "relative z-40")}
              >
                <td
                  className={cn(
                    "sticky left-0 min-w-[280px] bg-white px-3 py-3.5 shadow-[4px_0_8px_-4px_rgb(16_24_20/0.18)] group-hover/row:bg-[#f4f6f5]",
                    open ? "z-40" : "z-10",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      aria-label={selected ? "Deselect" : "Select"}
                      onClick={() => (entry.kind === "folder" ? onToggleFolder(id) : onToggleItem(id))}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-2 transition",
                        selected ? "border-primary bg-primary" : "border-[#c5d0cb] bg-white",
                        selecting || selected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
                      )}
                    >
                      {selected ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                    </button>
                    <Link href={href} className="flex min-w-0 items-center gap-2.5 text-[15px] font-medium text-[#2a3a33] hover:text-primary">
                      {entry.kind === "folder" ? (
                        <FolderGlyph
                          kind={entry.data.kind === "JOB" ? "JOB" : "ITEM"}
                          populated={isFolderPopulated(entry.data)}
                          size="lg"
                        />
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#eceeed] text-[10px] font-bold text-[#8a9a93]">
                          {(entry.data.name[0] || "I").toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{entry.data.name}</span>
                    </Link>
                  </div>
                </td>
                {activeColumns.map((column) => (
                  <td key={column.id} className="whitespace-nowrap px-4 py-3.5 text-[14px] text-[#4a5c54]">
                    {dash(cellValue(entry, column))}
                  </td>
                ))}
                <td
                  className={cn(
                    "sticky right-0 bg-white px-3 py-3.5 shadow-[-4px_0_8px_-4px_rgb(16_24_20/0.18)] group-hover/row:bg-[#f4f6f5]",
                    open ? "z-40" : "z-10",
                  )}
                >
                  <div className="relative flex items-center justify-end gap-1" ref={open ? menuRef : undefined}>
                    <div
                      className={cn(
                        "flex items-center gap-0.5",
                        open ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
                      )}
                    >
                      <button
                        type="button"
                        title="Move"
                        aria-label="Move"
                        onClick={() => {
                          if (entry.kind === "folder") {
                            folderMenuAction(entry.data, "move", folderHandlers);
                          } else {
                            onMoveItem(entry.data);
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7c74] hover:bg-white hover:text-[#2a3a33]"
                      >
                        <FolderInput className="h-4 w-4" />
                      </button>
                      {entry.kind === "folder" ? (
                        <button
                          type="button"
                          title="Export"
                          aria-label="Export"
                          onClick={() => {
                            if (onExportFolder) onExportFolder(entry.data);
                            else toast.error("Export is not available here");
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7c74] hover:bg-white hover:text-[#2a3a33]"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Update quantity"
                          aria-label="Update quantity"
                          onClick={() => onQtyItem(entry.data)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7c74] hover:bg-white hover:text-[#2a3a33]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="More"
                        aria-label="More"
                        aria-expanded={open}
                        onClick={() => setMenuId(open ? null : id)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md text-[#6b7c74] hover:bg-white hover:text-[#2a3a33]",
                          open && "bg-white",
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    {open ? (
                      entry.kind === "folder" ? (
                        <FolderCardMenu
                          folderId={id}
                          variant="card"
                          className="absolute right-0 top-9 z-50 w-[220px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-[0_8px_24px_rgb(16_24_20/0.14)]"
                          onClose={() => setMenuId(null)}
                          onAction={(action) => {
                            setMenuId(null);
                            folderMenuAction(entry.data, action, folderHandlers);
                          }}
                        />
                      ) : (
                        <ItemCardMenu
                          itemId={id}
                          editHref={`/item/${id}/edit`}
                          className="absolute right-0 top-9 z-50 min-w-[180px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-lg"
                          onClose={() => setMenuId(null)}
                          onAction={(action) => {
                            setMenuId(null);
                            itemMenuAction(action, entry.data, itemHandlers);
                          }}
                        />
                      )
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
