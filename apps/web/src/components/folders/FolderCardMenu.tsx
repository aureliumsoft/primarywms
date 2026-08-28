"use client";

import Link from "next/link";
import {
  Barcode,
  BellPlus,
  Clock,
  Copy,
  FolderInput,
  Lock,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { FolderMenuItem } from "@/components/FolderCard";

export type FolderMenuAction =
  | "edit"
  | "move"
  | "alert"
  | "history"
  | "create-label"
  | "export"
  | "clone"
  | "permissions"
  | "delete";

/** Folder header kebab menu. */
export const FOLDER_HEADER_MENU: { id: FolderMenuAction; label: string; danger?: boolean }[] = [
  { id: "edit", label: "Edit" },
  { id: "move", label: "Move to folder" },
  { id: "alert", label: "Set Alert" },
  { id: "history", label: "History" },
  { id: "create-label", label: "Create Label" },
  { id: "export", label: "Export" },
  { id: "clone", label: "Clone" },
  { id: "permissions", label: "Permissions" },
  { id: "delete", label: "Delete", danger: true },
];

/** Folder card kebab menu — subset of header actions. */
export const FOLDER_CARD_MENU: { id: FolderMenuAction; label: string; danger?: boolean }[] = [
  { id: "history", label: "History" },
  { id: "create-label", label: "Create Label" },
  { id: "export", label: "Export" },
  { id: "clone", label: "Clone" },
  { id: "delete", label: "Delete", danger: true },
];

const ICONS: Record<FolderMenuAction, React.ReactNode> = {
  edit: <Pencil className="h-4 w-4" />,
  move: <FolderInput className="h-4 w-4" />,
  alert: <BellPlus className="h-4 w-4" />,
  history: <Clock className="h-4 w-4" />,
  "create-label": <Barcode className="h-4 w-4" />,
  export: <Upload className="h-4 w-4" />,
  clone: <Copy className="h-4 w-4" />,
  permissions: <Lock className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
};

export function FolderCardMenu({
  folderId,
  variant,
  onAction,
  onClose,
  className,
  afterAction,
}: {
  folderId: string;
  variant: "header" | "card";
  onAction: (action: FolderMenuAction) => void;
  onClose?: () => void;
  className?: string;
  /** Extra rows inserted immediately after a standard menu action (e.g. job lifecycle on sidebar). */
  afterAction?: { action: FolderMenuAction; node: React.ReactNode };
}) {
  const items = variant === "header" ? FOLDER_HEADER_MENU : FOLDER_CARD_MENU;
  return (
    <div className={className ?? "absolute right-0 top-9 z-30 w-[220px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-[0_8px_24px_rgb(16_24_20/0.14)]"}>
      {items.flatMap((item) => {
        const row =
          item.id === "history" ? (
            <Link
              key={item.id}
              href={`/folder/${folderId}/activity-history`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[#3d4f47] hover:bg-[#f4f6f5]"
              onClick={onClose}
            >
              <span className="shrink-0 text-[#8a9a93]">{ICONS[item.id]}</span>
              {item.label}
            </Link>
          ) : (
            <FolderMenuItem key={item.id} icon={ICONS[item.id]} danger={item.danger} onClick={() => { onClose?.(); onAction(item.id); }}>
              {item.label}
            </FolderMenuItem>
          );
        if (afterAction?.action === item.id) return [row, <div key={`${item.id}-after`}>{afterAction.node}</div>];
        return [row];
      })}
    </div>
  );
}
