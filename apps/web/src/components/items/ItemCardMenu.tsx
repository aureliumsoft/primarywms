"use client";

import Link from "next/link";
import type { ItemMenuAction } from "./ItemActionsMenu";

/** Item detail/header kebab menu. */
export const ITEM_HEADER_MENU: { id: ItemMenuAction; label: string; danger?: boolean }[] = [
  { id: "restock", label: "Restock" },
  { id: "history", label: "History" },
  { id: "transactions", label: "Transactions" },
  { id: "create-label", label: "Create Label" },
  { id: "set-alert", label: "Set Alert" },
  { id: "export", label: "Export" },
  { id: "clone", label: "Clone" },
  { id: "merge", label: "Merge" },
  { id: "add-to", label: "Add to…" },
  { id: "delete", label: "Delete", danger: true },
];

/** Item card kebab menu — no Set Alert, no Edit link. */
export const ITEM_CARD_MENU: { id: ItemMenuAction; label: string; danger?: boolean }[] = [
  { id: "restock", label: "Restock" },
  { id: "history", label: "History" },
  { id: "transactions", label: "Transactions" },
  { id: "create-label", label: "Create Label" },
  { id: "export", label: "Export" },
  { id: "clone", label: "Clone" },
  { id: "merge", label: "Merge" },
  { id: "add-to", label: "Add to…" },
  { id: "delete", label: "Delete", danger: true },
];

/** @deprecated use ITEM_HEADER_MENU or ITEM_CARD_MENU */
export const ITEM_MENU = ITEM_HEADER_MENU;

export function ItemCardMenu({
  itemId,
  variant = "card",
  editHref,
  onAction,
  onClose,
  className,
}: {
  itemId: string;
  variant?: "card" | "header";
  editHref?: string;
  onAction: (action: ItemMenuAction) => void;
  onClose?: () => void;
  className?: string;
}) {
  const items = variant === "header" ? ITEM_HEADER_MENU : ITEM_CARD_MENU;
  return (
    <div className={className ?? "absolute right-0 top-9 z-50 min-w-[180px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-lg"}>
      {variant === "header" && editHref ? (
        <Link href={editHref} className="block px-3 py-2 hover:bg-[#f4f6f5]" onClick={onClose}>
          Edit
        </Link>
      ) : null}
      {items.map((item) =>
        item.id === "history" ? (
          <Link key={item.id} href={`/item/${itemId}/activity-history`} className="block px-3 py-2 hover:bg-[#f4f6f5]" onClick={onClose}>
            {item.label}
          </Link>
        ) : item.id === "transactions" ? (
          <Link key={item.id} href={`/reports/transactions?itemId=${itemId}`} className="block px-3 py-2 hover:bg-[#f4f6f5]" onClick={onClose}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            className={`block w-full px-3 py-2 text-left hover:bg-[#f4f6f5] ${item.danger ? "text-danger" : ""}`}
            onClick={() => {
              onClose?.();
              onAction(item.id);
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
