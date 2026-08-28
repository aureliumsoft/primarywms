"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { ItemCardMenu } from "./ItemCardMenu";
import { ItemPrimaryButton, ItemSecondaryButton } from "./ui";

export type ItemMenuAction =
  | "history"
  | "transactions"
  | "restock"
  | "create-label"
  | "set-alert"
  | "export"
  | "clone"
  | "merge"
  | "add-to"
  | "update-quantity"
  | "move"
  | "delete";

export function ItemActionsMenu({ itemId, onAction }: { itemId: string; onAction: (action: ItemMenuAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <ItemSecondaryButton onClick={() => setOpen((v) => !v)} aria-label="More actions">
        <MoreHorizontal className="h-4 w-4" />
      </ItemSecondaryButton>
      {open ? (
        <ItemCardMenu
          itemId={itemId}
          variant="header"
          onAction={onAction}
          onClose={() => setOpen(false)}
          className="absolute right-0 top-11 z-30 min-w-[180px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-lg"
        />
      ) : null}
    </div>
  );
}

export function ItemHeaderActions({
  itemId,
  editHref,
  onCreateLabel,
  onMenu,
}: {
  itemId: string;
  editHref: string;
  onCreateLabel: () => void;
  onMenu: (action: ItemMenuAction) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ItemSecondaryButton onClick={onCreateLabel}>Create Label</ItemSecondaryButton>
      <ItemActionsMenu itemId={itemId} onAction={onMenu} />
      <a href={editHref}>
        <ItemPrimaryButton>Edit</ItemPrimaryButton>
      </a>
    </div>
  );
}
