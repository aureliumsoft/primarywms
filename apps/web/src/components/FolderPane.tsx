"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MoreVertical, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CustomFieldDef } from "@/lib/custom-field-values";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";
import { FolderSidebarActionMenu } from "./FolderSidebarActionMenu";

export type TreeFolder = {
  id: string;
  parentId: string | null;
  name: string;
  kind?: "ITEM" | "JOB";
  jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
  jobId?: string | null;
  updatedAt?: string;
  _count?: { items: number; children: number };
};

function sortFoldersLatestFirst(folders: TreeFolder[]) {
  return [...folders].sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });
}

export type FolderFilter = "ALL" | "ITEMS" | "JOBS";

const FILTER_KEY = "primarywms.folderFilter";
const COMPLETED_KEY = "primarywms.showCompletedJobs";

export function folderMatchesFilter(
  folder: {
    kind?: "ITEM" | "JOB";
    jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
    _count?: { items?: number; children?: number } | null;
  },
  filter: FolderFilter,
  showCompletedJobs: boolean,
) {
  const kind = folder.kind ?? "ITEM";
  if (filter === "ITEMS" && !(folder._count?.items ?? 0)) return false;
  if (filter === "JOBS" && kind !== "JOB") return false;
  if (kind === "JOB" && folder.jobStatus === "COMPLETED" && !showCompletedJobs) return false;
  return true;
}

function readStoredFilter(): FolderFilter {
  if (typeof window === "undefined") return "ALL";
  const value = window.localStorage.getItem(FILTER_KEY);
  return value === "ITEMS" || value === "JOBS" || value === "ALL" ? value : "ALL";
}

function readStoredCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COMPLETED_KEY) === "1";
}

export function FolderPane({
  tree,
  rootId,
  currentId,
  collapsed,
  onToggle,
  onFilterChange,
  fields = [],
  onFolderChanged,
  onFolderDeleted,
  onCreateLabel,
  onCloneFolder,
  onExportFolder,
}: {
  tree: TreeFolder[];
  rootId: string;
  currentId: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onFilterChange?: (filter: FolderFilter, showCompletedJobs: boolean) => void;
  fields?: CustomFieldDef[];
  onFolderChanged?: () => void;
  onFolderDeleted?: (folderId: string) => void;
  onCreateLabel?: (folder: TreeFolder) => void;
  onCloneFolder?: (folder: TreeFolder) => void;
  onExportFolder?: (folder: TreeFolder) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FolderFilter>("ALL");
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const atRoot = currentId === rootId;

  useEffect(() => {
    setFilter(readStoredFilter());
    setShowCompletedJobs(readStoredCompleted());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(FILTER_KEY, filter);
    window.localStorage.setItem(COMPLETED_KEY, showCompletedJobs ? "1" : "0");
    onFilterChange?.(filter, showCompletedJobs);
  }, [filter, showCompletedJobs, hydrated, onFilterChange]);

  useEffect(() => {
    if (!filterOpen) return;
    function onDoc(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  const visibleTree = useMemo(() => {
    const query = q.trim().toLowerCase();
    const matches = tree.filter((folder) => {
      if (folder.id === rootId) return false;
      if (!folderMatchesFilter(folder, filter, showCompletedJobs)) return false;
      if (query && !folder.name.toLowerCase().includes(query)) return false;
      return true;
    });
    const matchIds = new Set(matches.map((folder) => folder.id));
    const byId = new Map(tree.map((folder) => [folder.id, folder]));

    function nearestVisibleParent(folder: TreeFolder) {
      let parentId = folder.parentId;
      while (parentId && parentId !== rootId) {
        if (matchIds.has(parentId)) return parentId;
        parentId = byId.get(parentId)?.parentId ?? null;
      }
      return rootId;
    }

    return matches.map((folder) => ({ ...folder, parentId: nearestVisibleParent(folder) }));
  }, [tree, rootId, q, filter, showCompletedJobs]);

  const filterLabel =
    filter === "ITEMS" ? "Item folders" : filter === "JOBS" ? "Job folders" : "All Folders";

  if (collapsed) {
    return (
      <div className="relative hidden w-0 shrink-0 md:block">
        <button
          type="button"
          aria-label="Show folders"
          onClick={onToggle}
          className="absolute left-0 top-24 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#d8dfdb] bg-white text-[#6b7c74] shadow-sm hover:text-[#3d4f47]"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="relative hidden w-[260px] shrink-0 flex-col overflow-visible border-r border-[#e6ebe8] bg-[#f4f6f5] md:flex">
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search folders"
            className="h-9 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-[13px] text-[#3d4f47] outline-none placeholder:text-[#9aa6a0] focus:border-primary"
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Link
            href="/items"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-[#3d4f47]",
              atRoot || filter !== "ALL" ? "bg-[#e4e9e6]" : "hover:bg-[#e8ecea]",
            )}
          >
            <FolderGlyph
              root={filter === "ALL"}
              kind={filter === "JOBS" ? "JOB" : "ITEM"}
              populated
              selected={filter !== "ALL" || atRoot}
            />
            <span className="truncate">{filterLabel}</span>
          </Link>
          <div ref={filterRef} className="relative shrink-0">
            <button
              type="button"
              title="Filter folders"
              aria-label="Filter folders"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((open) => !open)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-[#6b7c74] hover:text-[#3d4f47]",
                filterOpen || filter !== "ALL" || showCompletedJobs ? "bg-[#e4e9e6]" : "hover:bg-[#e8ecea]",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            {filterOpen ? (
              <div className="absolute right-0 top-9 z-50 w-[252px] rounded-lg border border-[#e6ebe8] bg-white py-2 shadow-[0_8px_24px_rgb(16_24_20/0.14)]">
                <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Filter by</p>
                {(
                  [
                    ["ALL", "All folders"],
                    ["ITEMS", "Item folders only"],
                    ["JOBS", "Job folders only"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] text-[#3d4f47] hover:bg-[#f4f6f5]"
                  >
                    {label}
                    {filter === value ? <Check className="h-4 w-4 text-[#5c6b64]" strokeWidth={2.5} /> : null}
                  </button>
                ))}
                <div className="my-2 h-px bg-[#e6ebe8]" />
                <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">View options</p>
                <div className="flex items-center justify-between gap-3 px-4 py-2 text-[14px] text-[#3d4f47]">
                  Show completed jobs
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showCompletedJobs}
                    onClick={() => setShowCompletedJobs((value) => !value)}
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition",
                      showCompletedJobs ? "bg-primary" : "bg-[#c5d0cb]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition",
                        showCompletedJobs ? "left-4" : "left-0.5",
                      )}
                    />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {visibleTree.length ? (
          <FolderList
            folders={visibleTree}
            tree={tree}
            rootId={rootId}
            currentId={currentId}
            parentId={rootId}
            menuId={menuId}
            setMenuId={setMenuId}
            fields={fields}
            onFolderChanged={onFolderChanged}
            onFolderDeleted={onFolderDeleted}
            onCreateLabel={onCreateLabel}
            onCloneFolder={onCloneFolder}
            onExportFolder={onExportFolder}
          />
        ) : (
          <p className="px-2 py-6 text-center text-[13px] text-[#8a9a93]">
            {filter === "JOBS"
              ? showCompletedJobs
                ? "No job folders"
                : "No active job folders"
              : filter === "ITEMS"
                ? "No folders with items"
              : q.trim()
                ? "No matching folders"
                : "No folders"}
          </p>
        )}
      </div>
      <div className="border-t border-[#e6ebe8] px-4 py-3 text-[13px]">
        <Link
          className="block py-1 text-primary hover:underline"
          href={currentId !== rootId ? `/import?folderId=${currentId}` : "/import"}
        >
          Bulk Import
        </Link>
        <Link className="block py-1 text-primary hover:underline" href="/activity-history">
          History
        </Link>
        <Link className="block py-1 text-primary hover:underline" href="/trash">
          Trash
        </Link>
      </div>
      {onToggle ? (
        <button
          type="button"
          aria-label="Hide folders"
          onClick={onToggle}
          className="absolute -right-3 top-24 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#d8dfdb] bg-white text-[#6b7c74] shadow-sm hover:text-[#3d4f47]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </aside>
  );
}

function FolderList({
  folders,
  tree,
  rootId,
  currentId,
  parentId,
  depth = 0,
  menuId,
  setMenuId,
  fields,
  onFolderChanged,
  onFolderDeleted,
  onCreateLabel,
  onCloneFolder,
  onExportFolder,
}: {
  folders: TreeFolder[];
  tree: TreeFolder[];
  rootId: string;
  currentId: string;
  parentId: string | null;
  depth?: number;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  fields: CustomFieldDef[];
  onFolderChanged?: () => void;
  onFolderDeleted?: (folderId: string) => void;
  onCreateLabel?: (folder: TreeFolder) => void;
  onCloneFolder?: (folder: TreeFolder) => void;
  onExportFolder?: (folder: TreeFolder) => void;
}) {
  const children = sortFoldersLatestFirst(folders.filter((f) => f.parentId === parentId));
  return (
    <ul>
      {children.map((folder) => {
        const href = folder.id === rootId ? "/items" : `/folder/${folder.id}/content`;
        const active = folder.id === currentId;
        const hasKids = folders.some((f) => f.parentId === folder.id);
        const isJob = folder.kind === "JOB";
        const completed = isJob && folder.jobStatus === "COMPLETED";
        const open = menuId === folder.id;
        return (
          <li key={folder.id} className="group relative">
            <div
              className={cn(
                "flex items-center rounded-md",
                active ? "bg-[#e4e9e6]" : "hover:bg-[#e8ecea]",
                completed && "opacity-60",
              )}
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              <Link
                href={href}
                title={folder.name}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-[13px] text-[#3d4f47]",
                  active && "font-medium",
                )}
              >
                {hasKids ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8a9a93]" /> : <span className="w-3.5 shrink-0" />}
                <FolderGlyph
                  kind={isJob ? "JOB" : "ITEM"}
                  root={folder.id === rootId}
                  populated={isFolderPopulated(folder) || hasKids}
                  selected={active}
                  size="md"
                  className={completed ? "opacity-70" : undefined}
                />
                <span className="truncate">{folder.name}</span>
              </Link>
              <button
                type="button"
                title="More folder actions"
                aria-label={`More actions for ${folder.name}`}
                aria-expanded={open}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuId(open ? null : folder.id);
                }}
                className={cn(
                  "mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#6b7c74] hover:bg-[#dde3e0] hover:text-[#3d4f47]",
                  open ? "bg-[#dde3e0] opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            {open ? (
              <FolderSidebarActionMenu
                folder={folder}
                tree={tree}
                rootId={rootId}
                fields={fields}
                onCreateLabel={() => onCreateLabel?.(folder)}
                onClone={() => onCloneFolder?.(folder)}
                onExport={() => onExportFolder?.(folder)}
                onChanged={() => onFolderChanged?.()}
                onDeleted={onFolderDeleted}
                onClose={() => setMenuId(null)}
              />
            ) : null}
            <FolderList
              folders={folders}
              tree={tree}
              rootId={rootId}
              currentId={currentId}
              parentId={folder.id}
              depth={depth + 1}
              menuId={menuId}
              setMenuId={setMenuId}
              fields={fields}
              onFolderChanged={onFolderChanged}
              onFolderDeleted={onFolderDeleted}
              onCreateLabel={onCreateLabel}
              onCloneFolder={onCloneFolder}
              onExportFolder={onExportFolder}
            />
          </li>
        );
      })}
    </ul>
  );
}
