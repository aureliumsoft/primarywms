"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { formatMoney } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button, Field, Input, Modal } from "./ui";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";

type TagRow = {
  id: string;
  name: string;
  _count: { items: number; folders: number };
};

type Photo = { id: string; publicUrl?: string | null };
type TagChip = { tag: { id: string; name: string } };

type ItemEntry = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  totalValue: number;
  unit?: { name: string; abbreviation: string } | null;
  photos: Photo[];
  tags?: TagChip[];
  folder?: { id: string; name: string };
};

type FolderEntry = {
  id: string;
  name: string;
  photos: Photo[];
  tags?: TagChip[];
  kind?: "ITEM" | "JOB";
  _count: { items: number; children: number };
  value?: number;
  quantity?: number;
};

type Entry = { kind: "item"; data: ItemEntry } | { kind: "folder"; data: FolderEntry };

type Inventory = {
  tag: { id: string; name: string };
  entries: Entry[];
  stats: { folders: number; items: number; quantity: number; value: number };
  hidePrices?: boolean;
};

const SORTS: [string, string][] = [
  ["UPDATED_AT", "Updated At"],
  ["NAME", "Name"],
  ["QUANTITY", "Quantity"],
];

function photoSrc(photos: Photo[]) {
  const photo = photos[0];
  if (!photo) return null;
  return photo.publicUrl || `/api/v1/photos/${photo.id}`;
}

function tagFilled(tag: TagRow) {
  return tag._count.items + tag._count.folders > 0;
}

export function TagsWorkspace({ tagId }: { tagId?: string }) {
  const router = useRouter();
  const [tags, setTags] = useState<TagRow[] | null>(null);
  const [tagQ, setTagQ] = useState("");
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [sort, setSort] = useState("UPDATED_AT");
  const [dir, setDir] = useState<"ASC" | "DESC">("DESC");
  const [view, setView] = useState<"GRID" | "LIST">("GRID");
  const [chromeMenu, setChromeMenu] = useState<"sort" | "view" | "tag" | null>(null);
  const [scanning, setScanning] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);

  const loadTags = useCallback(async () => {
    const data = await api<{ tags: TagRow[] }>("/api/v1/tags");
    setTags(data.tags);
    return data.tags;
  }, []);

  useEffect(() => {
    loadTags().catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load tags"));
  }, [loadTags]);

  useEffect(() => {
    if (!tags) return;
    if (!tagId && tags.length) {
      router.replace(`/tags/${tags[0].id}`);
    }
  }, [tagId, tags, router]);

  useEffect(() => {
    if (!tagId) {
      setInventory(null);
      return;
    }
    const qs = new URLSearchParams();
    if (appliedQ.trim()) qs.set("q", appliedQ.trim());
    qs.set("sort", sort);
    qs.set("dir", dir);
    api<Inventory>(`/api/v1/tags/${tagId}?${qs.toString()}`)
      .then((data) => {
        setInventory(data);
        setLoadError("");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load tag"));
  }, [appliedQ, dir, sort, tagId]);

  useEffect(() => {
    if (!chromeMenu) return;
    function onDoc(event: MouseEvent) {
      if (chromeRef.current && !chromeRef.current.contains(event.target as Node)) setChromeMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [chromeMenu]);

  const visibleTags = useMemo(() => {
    const needle = tagQ.trim().toLowerCase();
    if (!needle) return tags ?? [];
    return (tags ?? []).filter((tag) => tag.name.toLowerCase().includes(needle));
  }, [tags, tagQ]);

  const selected = tags?.find((tag) => tag.id === tagId) ?? inventory?.tag ?? null;
  const sortLabel = SORTS.find(([value]) => value === sort)?.[1] ?? "Updated At";
  const ViewIcon = view === "LIST" ? List : LayoutGrid;

  function selectTag(id: string) {
    if (id === tagId) return;
    router.push(`/tags/${id}`);
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setPending(true);
    setFormError("");
    try {
      const created = await api<{ tag: TagRow }>("/api/v1/tags", { method: "POST", body: JSON.stringify({ name }) });
      setAddOpen(false);
      setNewName("");
      await loadTags();
      router.push(`/tags/${created.tag.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create tag");
    } finally {
      setPending(false);
    }
  }

  async function rename() {
    if (!tagId) return;
    const name = renameName.trim();
    if (!name) return;
    setPending(true);
    setFormError("");
    try {
      await api(`/api/v1/tags/${tagId}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setRenameOpen(false);
      await loadTags();
      const qs = new URLSearchParams({ sort, dir });
      if (appliedQ.trim()) qs.set("q", appliedQ.trim());
      setInventory(await api<Inventory>(`/api/v1/tags/${tagId}?${qs.toString()}`));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not rename tag");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!tagId || !selected) return;
    if (!confirm(`Delete “${selected.name}”? It will be removed from all items and folders.`)) return;
    try {
      await api(`/api/v1/tags/${tagId}`, { method: "DELETE" });
      const remaining = (await loadTags()).filter((tag) => tag.id !== tagId);
      if (remaining[0]) router.push(`/tags/${remaining[0].id}`);
      else router.push("/tags");
      setInventory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete tag");
    }
  }

  function applySearch(value = q) {
    setAppliedQ(value);
  }

  function changeSort(next: string) {
    setDir(next === sort ? (dir === "DESC" ? "ASC" : "DESC") : next === "NAME" ? "ASC" : "DESC");
    setSort(next);
    setChromeMenu(null);
  }

  if (loadError && !tags) return <div className="p-8 text-danger">{loadError}</div>;

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#e6ebe8] bg-[#f4f6f5] md:flex">
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
            <input
              value={tagQ}
              onChange={(e) => setTagQ(e.target.value)}
              placeholder="Search tags"
              className="h-9 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-[13px] text-[#3d4f47] outline-none placeholder:text-[#9aa6a0] focus:border-primary"
            />
          </div>
        </div>
        <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
          {tags === null ? (
            <div className="space-y-1 px-1 pt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-[#e6ebe8]" />
              ))}
            </div>
          ) : visibleTags.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-[#8a9a93]">{tagQ.trim() ? "No matching tags" : "No tags yet"}</p>
          ) : (
            visibleTags.map((tag) => {
              const active = tag.id === tagId;
              const filled = tagFilled(tag);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => selectTag(tag.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium",
                    active ? "bg-[#e4e9e6] text-[#1c2b25]" : "text-[#3d4f47] hover:bg-[#e8ecea]",
                  )}
                >
                  <Tag
                    className={cn("h-4 w-4 shrink-0", active || filled ? "text-primary" : "text-[#8a9a93]", filled && "fill-current")}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{tag.name}</span>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="border-b border-[#e6ebe8] px-6 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">{selected?.name ?? "Tags"}</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setNewName("");
                  setAddOpen(true);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Tag
              </button>
              {tagId ? (
                <div className="relative">
                  <button
                    type="button"
                    title="More tag actions"
                    aria-expanded={chromeMenu === "tag"}
                    onClick={() => setChromeMenu(chromeMenu === "tag" ? null : "tag")}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md text-[#6b7c74] hover:bg-[#f4f6f5]",
                      chromeMenu === "tag" && "bg-[#f4f6f5]",
                    )}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {chromeMenu === "tag" ? (
                    <div className="absolute right-0 top-11 z-40 w-44 rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-[0_8px_24px_rgb(16_24_20/0.14)]">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[#3d4f47] hover:bg-muted"
                        onClick={() => {
                          setChromeMenu(null);
                          setRenameName(selected?.name ?? "");
                          setFormError("");
                          setRenameOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-[#8a9a93]" />
                        Rename
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[#e24b4b] hover:bg-muted"
                        onClick={() => {
                          setChromeMenu(null);
                          void remove();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {tagId ? (
            <>
              <div ref={chromeRef} className="mt-5 flex flex-wrap items-center gap-4">
                <form
                  className="relative min-w-[240px] flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applySearch();
                  }}
                >
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
                  <input
                    ref={searchRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={`Search ${selected?.name ?? "items"}`}
                    autoComplete="off"
                    className={cn(
                      "h-10 w-full rounded-md border bg-white pl-9 pr-12 text-sm text-[#3d4f47] outline-none placeholder:text-[#9aa6a0]",
                      scanning ? "border-[#8a9a93]" : "border-[#d8dfdb]",
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        if (scanning) {
                          setScanning(false);
                          return;
                        }
                        setQ("");
                        applySearch("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    title={scanning ? "Close scanning mode" : "Scan QR / barcode"}
                    aria-pressed={scanning}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const next = !scanning;
                      setScanning(next);
                      if (next) searchRef.current?.focus();
                    }}
                    className={cn(
                      "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded",
                      scanning ? "bg-[#3d4f47] text-white" : "text-[#8a9a93] hover:bg-[#f4f6f5] hover:text-[#3d4f47]",
                    )}
                  >
                    <Barcode className="h-4 w-4" />
                  </button>
                </form>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setChromeMenu(chromeMenu === "sort" ? null : "sort")}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px]",
                      chromeMenu === "sort" ? "bg-[#3d4f47] text-white" : "text-[#3d4f47] hover:bg-[#f4f6f5]",
                    )}
                  >
                    {sortLabel}
                    {dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  </button>
                  {chromeMenu === "sort" ? (
                    <div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-lg border border-[#e6ebe8] bg-white py-1 shadow-[0_8px_24px_rgb(16_24_20/0.14)]">
                      {SORTS.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => changeSort(value)}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-2 text-left text-[14px]",
                            sort === value ? "text-primary" : "text-[#3d4f47] hover:bg-[#f4f6f5]",
                          )}
                        >
                          {label}
                          {sort === value ? dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : null}
                        </button>
                      ))}
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
                    <div className="absolute right-0 top-9 z-30 w-40 rounded-lg border border-[#e6ebe8] bg-white py-2 shadow-lg">
                      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Layout type</p>
                      {(
                        [
                          ["GRID", "Grid", LayoutGrid],
                          ["LIST", "List", List],
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
                    </div>
                  ) : null}
                </div>
              </div>
              {scanning ? (
                <div className="-mx-6 mt-4 flex items-center justify-between bg-[#f4f6f5] px-6 py-2.5 text-[13px] text-[#e24b4b]">
                  <span>Scanning mode is enabled. Please use handheld scanner to perform search.</span>
                  <button type="button" className="inline-flex items-center gap-1.5 hover:underline" onClick={() => setScanning(false)}>
                    Close scanning mode
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 pb-4 text-[13px] text-[#8a9a93]">
                <div>
                  Folders: <span className="font-medium text-[#5c6b64]">{inventory?.stats.folders ?? 0}</span>
                </div>
                <div>
                  Items: <span className="font-medium text-[#5c6b64]">{inventory?.stats.items ?? 0}</span>
                </div>
                <div>
                  Total Quantity: <span className="font-medium text-[#5c6b64]">{inventory?.stats.quantity ?? 0} units</span>
                </div>
                <div>
                  Total Value:{" "}
                  <span className="font-medium text-[#5c6b64]">
                    {inventory?.hidePrices ? "—" : formatMoney(inventory?.stats.value ?? 0)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="pb-5" />
          )}
        </header>

        <div
          className={cn(
            "min-h-0 flex-1 scrollbar-thin",
            view === "LIST" ? "overflow-y-auto bg-[#eef1ef] p-6" : "overflow-y-auto p-6",
          )}
        >
          {!tagId ? (
            <EmptyTags onAdd={() => setAddOpen(true)} hasTags={Boolean(tags?.length)} />
          ) : loadError && !inventory ? (
            <p className="text-sm text-danger">{loadError}</p>
          ) : !inventory ? (
            <div className="grid grid-cols-[repeat(auto-fill,230px)] gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[194px] animate-pulse rounded-xl bg-[#e6ebe8]" />
              ))}
            </div>
          ) : inventory.entries.length === 0 ? (
            <p className="rounded-2xl bg-[#f7f8f8] px-6 py-16 text-center text-sm text-[#8a9a93]">
              {appliedQ.trim() ? "No items or folders match this search." : "Nothing is tagged with this name yet."}
            </p>
          ) : (
            <div className={view === "GRID" ? "grid grid-cols-[repeat(auto-fill,230px)] gap-5" : "flex flex-col gap-3"}>
              {inventory.entries.map((entry) =>
                entry.kind === "folder" ? (
                  <TaggedFolderCard key={entry.data.id} folder={entry.data} list={view === "LIST"} hidePrices={Boolean(inventory.hidePrices)} />
                ) : (
                  <TaggedItemCard key={entry.data.id} item={entry.data} list={view === "LIST"} hidePrices={Boolean(inventory.hidePrices)} />
                ),
              )}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={addOpen}
        title="Add Tag"
        onClose={() => {
          if (!pending) setAddOpen(false);
        }}
      >
        <Field label="Name">
          <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void create()} />
        </Field>
        {formError ? <p className="mt-3 text-sm text-danger">{formError}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !newName.trim()} onClick={() => void create()}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal
        open={renameOpen}
        title="Rename tag"
        onClose={() => {
          if (!pending) setRenameOpen(false);
        }}
      >
        <Field label="Name">
          <Input autoFocus value={renameName} onChange={(e) => setRenameName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void rename()} />
        </Field>
        {formError ? <p className="mt-3 text-sm text-danger">{formError}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !renameName.trim()} onClick={() => void rename()}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EmptyTags({ onAdd, hasTags }: { onAdd: () => void; hasTags: boolean }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl bg-[#f7f8f8] p-10 text-center">
      <Tag className="mx-auto h-10 w-10 text-[#b7c2bd]" strokeWidth={1.5} />
      <h2 className="mt-4 text-lg font-semibold text-[#1c2b25]">{hasTags ? "Select a tag" : "No tags yet"}</h2>
      <p className="mt-2 text-sm text-[#8a9a93]">
        {hasTags ? "Choose a tag from the list to see every matching item and folder." : "Tags cut across folders so you can find items wherever they live."}
      </p>
      {hasTags ? null : (
        <Button className="mt-6" onClick={onAdd}>
          Add Tag
        </Button>
      )}
    </div>
  );
}

function TagPills({ tags }: { tags?: TagChip[] }) {
  if (!tags?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.slice(0, 3).map((row) => (
        <span
          key={row.tag.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#eef2f0] px-1.5 py-0.5 text-[10px] font-medium text-[#5c6b64]"
        >
          <Tag className="h-2.5 w-2.5 shrink-0 fill-current text-primary" />
          <span className="truncate">{row.tag.name}</span>
        </span>
      ))}
    </div>
  );
}

function TaggedItemCard({ item, list, hidePrices }: { item: ItemEntry; list: boolean; hidePrices: boolean }) {
  const src = photoSrc(item.photos);
  const unitLabel = item.unit?.name ? item.unit.name.toLowerCase() : item.unit?.abbreviation ?? "units";
  const meta = (
    <>
      {item.quantity} {unitLabel}
      {hidePrices ? null : (
        <>
          <span className="text-[#c5d0cb]"> | </span>
          {formatMoney(item.totalValue)}
        </>
      )}
    </>
  );
  return (
    <Link
      href={`/item/${item.id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border hover:ring-primary",
        list ? "flex min-h-[132px] items-stretch" : "flex h-[210px] w-[230px] flex-col",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-[#eceeed]", list ? "w-[132px] self-stretch" : "h-[138px] w-full")}>
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs font-semibold uppercase tracking-wide text-[#b7c2bd]">
            {item.name}
          </div>
        )}
      </div>
      <div className={cn("min-w-0", list ? "flex flex-1 flex-col justify-center px-6 py-4" : "px-3 pt-2")}>
        {list ? <div className="text-[13px] tracking-wide text-[#b7c2bd]">{item.sid}</div> : null}
        <div className={cn("truncate font-semibold leading-snug text-[#3d4f47]", list ? "text-[20px] text-[#2a3a33]" : "text-[14px]")}>
          {item.name}
        </div>
        <div className={cn("text-[#8a9a93]", list ? "mt-2 text-[13px]" : "mt-0.5 text-[12px]")}>{meta}</div>
        <TagPills tags={item.tags} />
      </div>
    </Link>
  );
}

function TaggedFolderCard({ folder, list, hidePrices }: { folder: FolderEntry; list: boolean; hidePrices: boolean }) {
  const src = photoSrc(folder.photos);
  return (
    <Link
      href={`/folder/${folder.id}/content`}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border hover:ring-primary",
        list ? "flex min-h-[132px] items-stretch" : "flex h-[210px] w-[230px] flex-col",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden", list ? "w-[132px] self-stretch" : "h-[138px] w-full")}>
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#eceeed]">
            <FolderGlyph populated={isFolderPopulated(folder)} kind={folder.kind === "JOB" ? "JOB" : "ITEM"} size="xl" tone="muted" />
          </div>
        )}
      </div>
      <div className={cn("min-w-0", list ? "flex flex-1 flex-col justify-center px-6 py-4" : "px-3 pt-2")}>
        <div className={cn("truncate font-semibold leading-snug text-[#3d4f47]", list ? "text-[20px] text-[#2a3a33]" : "text-[14px]")}>
          {folder.name}
        </div>
        <div className={cn("flex items-center gap-1.5 text-[#8a9a93]", list ? "mt-2 text-[13px]" : "mt-0.5 text-[12px]")}>
          <span>{folder._count.items} items</span>
          {hidePrices ? null : (
            <>
              <span className="text-[#c5d0cb]">|</span>
              <span>{formatMoney(folder.value ?? 0)}</span>
            </>
          )}
        </div>
        <TagPills tags={folder.tags} />
      </div>
    </Link>
  );
}
