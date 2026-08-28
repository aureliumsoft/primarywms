"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TreeFolder } from "./FolderPane";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";

export function SelectFolderModal({
  open,
  tree,
  rootId,
  selectedId,
  title = "Add Folder",
  onClose,
  onSelect,
}: {
  open: boolean;
  tree: TreeFolder[];
  rootId: string;
  selectedId: string;
  title?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(selectedId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootId]));

  useEffect(() => {
    if (!open) return;
    setQ("");
    setPicked(selectedId || rootId);
    setExpanded(new Set([rootId]));
  }, [open, selectedId, rootId]);

  const query = q.trim().toLowerCase();
  const byParent = useMemo(() => {
    const map = new Map<string | null, TreeFolder[]>();
    for (const folder of tree) {
      const key = folder.parentId;
      const list = map.get(key) ?? [];
      list.push(folder);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [tree]);

  const matchIds = useMemo(() => {
    if (!query) return null;
    const ids = new Set<string>();
    for (const folder of tree) {
      if (folder.name.toLowerCase().includes(query)) ids.add(folder.id);
    }
    for (const id of [...ids]) {
      let current = tree.find((f) => f.id === id);
      while (current?.parentId) {
        ids.add(current.parentId);
        current = tree.find((f) => f.id === current!.parentId);
      }
    }
    return ids;
  }, [tree, query]);

  useEffect(() => {
    if (!matchIds) return;
    setExpanded((prev) => new Set([...prev, ...matchIds]));
  }, [matchIds]);

  if (!open) return null;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function render(parentId: string | null, depth: number): ReactNode {
    const kids = (byParent.get(parentId) ?? []).filter((folder) => !matchIds || matchIds.has(folder.id));
    return kids.map((folder) => {
      const children = byParent.get(folder.id) ?? [];
      const visibleKids = children.filter((child) => !matchIds || matchIds.has(child.id));
      const hasKids = visibleKids.length > 0;
      const isOpen = expanded.has(folder.id);
      const isRoot = folder.id === rootId;
      const populated = isFolderPopulated(folder) || children.length > 0;
      return (
        <li key={folder.id}>
          <div
            className={cn(
              "flex items-center gap-1 rounded-md pr-3 text-[14px]",
              picked === folder.id ? "bg-[#eef1ef]" : "hover:bg-[#f7f8f8]",
            )}
            style={{ paddingLeft: 8 + depth * 16 }}
          >
            {hasKids ? (
              <button
                type="button"
                aria-label={isOpen ? "Collapse folder" : "Expand folder"}
                onClick={() => toggle(folder.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center text-[#8a9a93]"
              >
                <ChevronRight className={cn("h-4 w-4 transition", isOpen && "rotate-90")} />
              </button>
            ) : (
              <span className="w-7 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => setPicked(folder.id)}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-[#3d4f47]"
            >
              <FolderGlyph
                root={isRoot}
                kind={folder.kind === "JOB" ? "JOB" : "ITEM"}
                populated={populated}
                selected={picked === folder.id}
              />
              <span className="truncate">{folder.name}</span>
            </button>
          </div>
          {hasKids && isOpen ? <ul>{render(folder.id, depth + 1)}</ul> : null}
        </li>
      );
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(88vh,640px)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
        <header className="flex items-center justify-between bg-[#f4f6f5] px-6 py-4">
          <h2 className="text-[18px] font-medium text-[#3d4f47]">{title}</h2>
          <button type="button" onClick={onClose} className="text-[#9aa6a0] hover:text-[#3d4f47]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full rounded-md border border-[#b7c2bc] bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <ul className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">{render(null, 0)}</ul>
        <footer className="flex justify-end px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onSelect(picked);
              onClose();
            }}
            className="rounded-md bg-primary px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
          >
            Select
          </button>
        </footer>
      </div>
    </div>
  );
}
