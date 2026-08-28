"use client";

import {
  BellPlus,
  Copy,
  FolderInput,
  PackagePlus,
  Pencil,
  QrCode,
  ShoppingCart,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/cn";

/** Bulk bar order: Edit → Update Qty → Move → Export → Restock → Label → Alert → Clone → Add to → Delete */
export function BulkActionBar({
  itemCount,
  folderCount,
  pageTotal,
  allOnPageSelected,
  hasMoreMatching,
  onSelectAllPage,
  onSelectAllMatching,
  onEdit,
  onUpdateQuantity,
  onMove,
  onExport,
  onRestock,
  onLabels,
  onAlerts,
  onClone,
  onAddTo,
  onDelete,
  onClear,
}: {
  itemCount: number;
  folderCount: number;
  /** Total entries on the current page (for select-all state). */
  pageTotal?: number;
  allOnPageSelected?: boolean;
  /** True when more entries exist beyond the current page. */
  hasMoreMatching?: boolean;
  onSelectAllPage?: () => void;
  onSelectAllMatching?: () => void;
  onEdit: () => void;
  onUpdateQuantity?: () => void;
  onMove: () => void;
  onExport: () => void;
  onRestock?: () => void;
  onLabels: () => void;
  onAlerts: () => void;
  onClone?: () => void;
  onAddTo?: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const totalSelected = itemCount + folderCount;
  const label =
    folderCount && itemCount
      ? `${itemCount} item${itemCount === 1 ? "" : "s"} and ${folderCount} folder${folderCount === 1 ? "" : "s"} selected`
      : itemCount
        ? `${itemCount} item${itemCount === 1 ? "" : "s"} selected`
        : `${folderCount} folder${folderCount === 1 ? "" : "s"} selected`;

  const showItemActions = itemCount > 0;
  const singleItem = itemCount === 1 && folderCount === 0;

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-primary/20 bg-[#e8f4ee] px-6 py-2.5 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="font-medium text-[#1c2b25]">{label}</span>
        {onSelectAllPage && pageTotal && pageTotal > totalSelected ? (
          <button type="button" className="font-medium text-primary hover:underline" onClick={onSelectAllPage}>
            All
          </button>
        ) : null}
        {onSelectAllMatching && hasMoreMatching ? (
          <button type="button" className="font-medium text-primary hover:underline" onClick={onSelectAllMatching}>
            Select all matching
          </button>
        ) : null}
        {allOnPageSelected && pageTotal ? (
          <span className="text-[13px] text-[#6b7c74]">All on page selected</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        <BarBtn icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
          Edit
        </BarBtn>
        {showItemActions && onUpdateQuantity ? (
          <BarBtn icon={<PackagePlus className="h-3.5 w-3.5" />} onClick={onUpdateQuantity}>
            Update Quantity
          </BarBtn>
        ) : null}
        <BarBtn icon={<FolderInput className="h-3.5 w-3.5" />} onClick={onMove}>
          Move
        </BarBtn>
        <BarBtn icon={<Upload className="h-3.5 w-3.5" />} onClick={onExport}>
          Export
        </BarBtn>
        {singleItem && onRestock ? (
          <BarBtn icon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={onRestock}>
            Restock
          </BarBtn>
        ) : null}
        {showItemActions ? (
          <BarBtn icon={<QrCode className="h-3.5 w-3.5" />} onClick={onLabels}>
            Create Label
          </BarBtn>
        ) : null}
        <BarBtn icon={<BellPlus className="h-3.5 w-3.5" />} onClick={onAlerts}>
          Set Alert
        </BarBtn>
        {singleItem && onClone ? (
          <BarBtn icon={<Copy className="h-3.5 w-3.5" />} onClick={onClone}>
            Clone
          </BarBtn>
        ) : null}
        {singleItem && onAddTo ? (
          <BarBtn icon={<PackagePlus className="h-3.5 w-3.5" />} onClick={onAddTo}>
            Add to…
          </BarBtn>
        ) : null}
        <BarBtn icon={<Trash2 className="h-3.5 w-3.5" />} danger onClick={onDelete}>
          Delete
        </BarBtn>
        <span className="mx-1 h-5 w-px bg-[#c5d9cf]" />
        <IconBtn title="Edit" icon={<Pencil className="h-4 w-4" />} onClick={onEdit} />
        <IconBtn title="Move" icon={<FolderInput className="h-4 w-4" />} onClick={onMove} />
        {singleItem && onClone ? <IconBtn title="Clone" icon={<Copy className="h-4 w-4" />} onClick={onClone} /> : null}
        <button type="button" className="ml-1 font-medium text-primary hover:underline" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

function BarBtn({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium hover:bg-white",
        danger ? "text-[#e24b4b]" : "text-[#2a3a33]",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function IconBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[#2a3a33] hover:bg-white"
    >
      {icon}
    </button>
  );
}
