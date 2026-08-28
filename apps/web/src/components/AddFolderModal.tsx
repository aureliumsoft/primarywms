"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, ChevronDown, CirclePlus, Copy, Folder, Plus, Table2, X } from "lucide-react";
import { MAX_PHOTOS, MAX_PHOTO_TOTAL_BYTES } from "@primarywms/shared";
import { api } from "@/lib/api";
import { saveAddFolderDraft } from "@/lib/add-folder-draft";
import type { TreeFolder } from "./FolderPane";
import { SelectFolderModal } from "./SelectFolderModal";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";
import { TagInput } from "./TagInput";

export function AddFolderModal({
  open,
  parentId,
  tree,
  onClose,
  onCreated,
}: {
  open: boolean;
  parentId: string;
  tree: TreeFolder[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [destId, setDestId] = useState(parentId);
  const [folderOpen, setFolderOpen] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setNotes("");
    setTags([]);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setDestId(parentId);
    setFolderOpen(false);
    setAddMenu(false);
    setError("");
    setConfirmDiscard(false);
  }, [open, parentId]);

  const canAdd = name.trim().length > 0;
  const isDirty = Boolean(name.trim() || notes.trim() || tags.length || photos.length);

  function requestClose() {
    if (pending) return;
    setAddMenu(false);
    setFolderOpen(false);
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  }

  function discardAndClose() {
    setConfirmDiscard(false);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmDiscard) {
        setConfirmDiscard(false);
        return;
      }
      if (folderOpen) {
        setFolderOpen(false);
        return;
      }
      if (addMenu) {
        setAddMenu(false);
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirmDiscard, addMenu, folderOpen, pending, isDirty, onClose]);

  const dest = tree.find((f) => f.id === destId) ?? tree.find((f) => f.id === parentId);
  const rootId = tree.find((f) => f.parentId === null)?.id ?? parentId;
  function addPhotos(list: FileList | File[]) {
    const incoming = Array.from(list).map((file) => ({ file, url: URL.createObjectURL(file) }));
    const next = [...photos, ...incoming];
    if (next.length > MAX_PHOTOS) {
      incoming.forEach((p) => URL.revokeObjectURL(p.url));
      setError(`Maximum of ${MAX_PHOTOS} photos`);
      return;
    }
    const total = next.reduce((sum, item) => sum + item.file.size, 0);
    if (total > MAX_PHOTO_TOTAL_BYTES) {
      incoming.forEach((p) => URL.revokeObjectURL(p.url));
      setError("Photos must be 30 MB or less in total");
      return;
    }
    setError("");
    setPhotos(next);
  }

  function openFullPage() {
    saveAddFolderDraft({
      name,
      notes,
      tags,
      destId,
      custom: {},
      returnTo: window.location.pathname,
    });
    onClose();
    router.push(`/add-folder?parentId=${encodeURIComponent(destId)}&from=${encodeURIComponent(window.location.pathname)}`);
  }

  async function submit(mode: "close" | "another") {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setPending(true);
    setError("");
    setAddMenu(false);
    try {
      const created = await api<{ folder: { id: string } }>("/api/v1/folders", {
        method: "POST",
        body: JSON.stringify({
          parentId: destId,
          name: name.trim(),
          notes: notes.trim() || null,
          tags,
        }),
      });
      if (photos.length) {
        try {
          for (const { file } of photos) {
            const form = new FormData();
            form.append("file", file);
            form.append("ownerType", "FOLDER");
            form.append("ownerId", created.folder.id);
            await api("/api/v1/photos", { method: "POST", body: form });
          }
        } catch {
          onCreated();
          if (mode === "close") onClose();
          else {
            setName("");
            setNotes("");
            setTags([]);
            setPhotos((prev) => {
              prev.forEach((p) => URL.revokeObjectURL(p.url));
              return [];
            });
          }
          return;
        }
      }
      onCreated();
      if (mode === "close") onClose();
      else {
        setName("");
        setNotes("");
        setTags([]);
        setPhotos((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.url));
          return [];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add folder");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close" onClick={requestClose} />
      <div className="relative flex max-h-[min(92vh,760px)] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgb(16_24_20/0.18)]">
        <header className="flex items-center justify-between border-b border-[#ecefee] px-6 py-4">
          <h2 className="text-[20px] font-medium text-[#3d4f47]">Add Folder</h2>
          <button type="button" onClick={requestClose} className="text-[#9aa6a0] hover:text-[#3d4f47]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canAdd || pending) return;
            void submit("close");
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name*"
              className="mb-5 w-full border-0 border-b border-[#cfd6d2] bg-transparent px-0 py-2.5 text-[16px] text-[#1c2b25] outline-none placeholder:text-[#9aa6a0] focus:border-b-2 focus:border-primary"
            />

            <div className="mb-4">
              <TagInput value={tags} onChange={setTags} />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={3}
              className="mb-4 min-h-[88px] w-full resize-y rounded-lg border border-[#d8dfdb] px-3 py-2.5 text-sm text-[#1c2b25] outline-none placeholder:text-[#9aa6a0] focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addPhotos(e.dataTransfer.files);
              }}
              className="mb-2 flex min-h-[148px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#cfd6d2] bg-[#fafbfa] px-4 py-6 text-[#9aa6a0] hover:border-primary/50 hover:bg-primary-soft/40"
            >
              {photos.length ? (
                <div className="flex w-full flex-wrap justify-center gap-2">
                  {photos.map((item, i) => (
                    <span key={`${item.file.name}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-md bg-[#ecefee]">
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                      <span
                        role="button"
                        tabIndex={0}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPhotos((prev) => {
                            const next = prev.filter((_, idx) => idx !== i);
                            URL.revokeObjectURL(item.url);
                            return next;
                          });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <span className="relative mb-2 text-[#b4bfb9]">
                    <Camera className="h-8 w-8" strokeWidth={1.5} />
                    <Plus className="absolute -bottom-0.5 -right-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-[12px]">(Max {MAX_PHOTOS} photos, 30 MB Total)</span>
                </>
              )}
            </button>

            <div className="mt-3 border-y border-dashed border-[#d8dfdb] py-3">
              <button
                type="button"
                onClick={openFullPage}
                className="flex w-full items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.04em] text-[#5c6b64]"
              >
                <Table2 className="h-4 w-4" />
                Show all fields
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          </div>

          <footer className="flex items-end justify-between gap-4 border-t border-[#ecefee] px-6 py-4">
            <div className="relative min-w-0 flex-1">
              <span className="absolute -top-2 left-3 z-[1] bg-white px-1 text-[11px] text-[#8a9a93]">Add to Folder</span>
              <button
                type="button"
                onClick={() => {
                  setFolderOpen(true);
                  setAddMenu(false);
                }}
                className="flex h-12 w-full items-center gap-2 rounded-md border border-[#d8dfdb] px-3 text-left text-sm text-[#3d4f47]"
              >
                <FolderGlyph
                  root={Boolean(dest && !dest.parentId)}
                  kind={dest?.kind === "JOB" ? "JOB" : "ITEM"}
                  populated={dest ? isFolderPopulated(dest) : true}
                />
                <span className="min-w-0 flex-1 truncate">{dest?.name ?? "All Items"}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#9aa6a0]" />
              </button>
            </div>

            <div className="relative shrink-0">
              <div className="flex overflow-hidden rounded-md">
                <button
                  type="submit"
                  disabled={pending || !canAdd}
                  className="h-11 bg-primary px-7 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-40"
                >
                  {pending ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  disabled={pending || !canAdd}
                  aria-label="More add options"
                  onClick={() => {
                    setAddMenu((v) => !v);
                    setFolderOpen(false);
                  }}
                  className="h-11 border-l border-white/35 bg-primary px-2.5 text-white hover:bg-primary-hover disabled:opacity-40"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {addMenu ? (
                <div className="absolute bottom-[calc(100%+8px)] right-0 z-20 min-w-[188px] overflow-hidden rounded-xl bg-white py-1.5 shadow-[0_8px_24px_rgb(16_24_20/0.16)] ring-1 ring-black/5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] text-[#2a3a33] hover:bg-[#f4f6f5]"
                    onClick={() => void submit("close")}
                  >
                    <CirclePlus className="h-[18px] w-[18px] text-[#6b7c74]" strokeWidth={1.75} />
                    Add
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] text-[#2a3a33] hover:bg-[#f4f6f5]"
                    onClick={() => void submit("another")}
                  >
                    <span className="relative h-[18px] w-[18px] text-[#6b7c74]">
                      <Copy className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white">
                        <ArrowRight className="h-2 w-2" strokeWidth={3} />
                      </span>
                    </span>
                    Add &amp; New
                  </button>
                </div>
              ) : null}
            </div>
          </footer>
        </form>

        {confirmDiscard ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
            <div className="absolute inset-0 rounded-2xl bg-white/50 backdrop-blur-[2px]" />
            <div className="relative w-full max-w-[360px] rounded-2xl bg-white px-6 pb-5 pt-6 shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
              <p className="text-[16px] leading-snug text-[#2a3a33]">Discard unsaved changes?</p>
              <div className="mt-8 flex items-center justify-end gap-5">
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="text-[13px] font-bold uppercase tracking-wide text-[#6b7c74] hover:text-[#2a3a33]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={discardAndClose}
                  className="rounded-md bg-[#e24b4b] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-[#d13d3d]"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <SelectFolderModal
        open={folderOpen}
        tree={tree}
        rootId={rootId}
        selectedId={destId || rootId}
        onClose={() => setFolderOpen(false)}
        onSelect={setDestId}
      />
    </div>
  );
}
