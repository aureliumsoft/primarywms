"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Camera,
  ChevronDown,
  CirclePlus,
  Copy,
  Minus,
  Plus,
  Table2,
  X,
} from "lucide-react";
import { MAX_PHOTOS, MAX_PHOTO_TOTAL_BYTES, formatMoney } from "@primarywms/shared";
import { api } from "@/lib/api";
import { saveAddItemDraft } from "@/lib/add-item-draft";
import { buildCreateItemBody, createItemWithPhotos, validateItemCustomFields } from "@/lib/add-item-submit";
import { defaultsFromFields, type CustomFieldDef } from "@/lib/custom-field-values";
import type { TreeFolder } from "./FolderPane";
import { SelectFolderModal } from "./SelectFolderModal";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";

export function AddItemModal({
  open,
  folderId,
  tree,
  rootId,
  onClose,
  onCreated,
}: {
  open: boolean;
  folderId: string;
  tree: TreeFolder[];
  rootId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const [minQuantity, setMinQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [destId, setDestId] = useState(folderId);
  const [folderOpen, setFolderOpen] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [itemFields, setItemFields] = useState<CustomFieldDef[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setQuantity("1");
    setMinQuantity("");
    setPrice("");
    setVariantsEnabled(false);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setDestId(folderId);
    setFolderOpen(false);
    setAddMenu(false);
    setError("");
    setConfirmDiscard(false);
    api<{ units: { id: string; name: string; isDefault: boolean }[]; fields: CustomFieldDef[] }>(
      "/api/v1/settings/lookups",
    ).then((d) => {
      setUnits(d.units);
      setItemFields(d.fields.filter((f) => f.appliesTo !== "FOLDER"));
      const def = d.units.find((u) => u.isDefault) ?? d.units[0];
      if (def) setUnitId(def.id);
    });
  }, [open, folderId]);

  const canAdd = name.trim().length > 0 && unitId && quantity !== "";
  const isDirty = Boolean(
    name.trim() ||
      quantity !== "1" ||
      minQuantity ||
      price ||
      variantsEnabled ||
      photos.length ||
      destId !== folderId,
  );
  const totalValue =
    price && quantity && !Number.isNaN(Number(price)) && !Number.isNaN(Number(quantity))
      ? Number(price) * Number(quantity)
      : null;

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

  const dest = tree.find((f) => f.id === destId) ?? tree.find((f) => f.id === folderId);

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
    saveAddItemDraft({
      name,
      quantity,
      unitId,
      minQuantity,
      price,
      notes: "",
      productLink: "",
      tags: [],
      destId,
      custom: defaultsFromFields(itemFields),
      variantsEnabled,
      returnTo: window.location.pathname,
    });
    onClose();
    router.push(`/add-item?folderId=${encodeURIComponent(destId)}&from=${encodeURIComponent(window.location.pathname)}`);
  }

  async function submit(mode: "close" | "another") {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!unitId) {
      setError("Choose a unit of measure");
      return;
    }
    setPending(true);
    setError("");
    setAddMenu(false);
    try {
      const body = buildCreateItemBody({
        folderId: destId,
        name,
        quantity,
        unitId,
        minQuantity,
        price,
        notes: "",
        productLink: "",
        tags: [],
        itemFields,
        custom: defaultsFromFields(itemFields),
        nativeCode: null,
        linkedCode: null,
      });
      validateItemCustomFields(itemFields, defaultsFromFields(itemFields));
      await createItemWithPhotos(body, photos);
      onCreated();
      if (mode === "close") onClose();
      else {
        setName("");
        setQuantity("1");
        setMinQuantity("");
        setPrice("");
        setVariantsEnabled(false);
        setPhotos((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.url));
          return [];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
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
          <h2 className="text-[20px] font-medium text-[#3d4f47]">Add Item</h2>
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

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Quantity*</label>
                <div className="flex h-11 items-center rounded-md border border-[#d8dfdb]">
                  <button
                    type="button"
                    className="flex h-full w-10 items-center justify-center text-[#6b7c74] hover:bg-[#f4f6f5]"
                    onClick={() => setQuantity(String(Math.max(0, Number(quantity || 0) - 1)))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    required
                    type="number"
                    min={0}
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-center text-sm outline-none"
                  />
                  <button
                    type="button"
                    className="flex h-full w-10 items-center justify-center text-[#6b7c74] hover:bg-[#f4f6f5]"
                    onClick={() => setQuantity(String(Number(quantity || 0) + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Unit of Measure*</label>
                <select
                  required
                  className="h-11 w-full rounded-md border border-[#d8dfdb] px-3 text-sm text-[#1c2b25] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Min Level</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-md border border-[#d8dfdb] px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    title={minQuantity ? "Set alert after adding the item" : "Enter a min level first"}
                    disabled={!minQuantity}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#d8dfdb] text-[#5c6b64] hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Price, £</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11 w-full rounded-md border border-[#d8dfdb] px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {totalValue != null ? (
              <p className="mb-4 text-[13px] text-[#6b7c74]">
                Value: <span className="font-medium text-[#1c2b25]">{formatMoney(totalValue)}</span>
              </p>
            ) : null}

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
              className="mb-3 flex min-h-[148px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#cfd6d2] bg-[#fafbfa] px-4 py-6 text-[#9aa6a0] hover:border-primary/50 hover:bg-primary-soft/40"
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
                    <Plus className="absolute -bottom-0.5 -right-1 h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-[12px]">(Max {MAX_PHOTOS} photos, 30 MB Total)</span>
                </>
              )}
            </button>

            <label className="mb-4 flex items-center gap-2 text-sm text-[#4a5c54]">
              <input
                type="checkbox"
                checked={variantsEnabled}
                onChange={(e) => setVariantsEnabled(e.target.checked)}
                className="rounded border-[#cfd6d2]"
              />
              This item has variants
            </label>

            <div className="border-y border-dashed border-[#d8dfdb] py-3">
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
