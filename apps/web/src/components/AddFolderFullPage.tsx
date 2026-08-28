"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Barcode,
  Bell,
  BellDot,
  ChevronDown,
  CirclePlus,
  Copy,
  Folder,
  List,
  Plus,
  ScanBarcode,
  X,
} from "lucide-react";
import { MAX_PHOTOS, MAX_PHOTO_TOTAL_BYTES } from "@primarywms/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { clearAddFolderDraft, readAddFolderDraft } from "@/lib/add-folder-draft";
import type { TreeFolder } from "./FolderPane";
import { AddQrBarcodeModal } from "./AddQrBarcodeModal";
import { BarcodeMark } from "./BarcodeMark";
import { CreateCustomFieldModal } from "./CreateCustomFieldModal";
import { DateAlertPanel, DEFAULT_DATE_ALERT, recipientIdsFromDraft, recipientKindFromDraft, type DateAlertDraft } from "./DateAlertPanel";
import { PhotoGallery } from "./PhotoGallery";
import { SelectFolderModal } from "./SelectFolderModal";
import { CustomFieldControl } from "./CustomFieldControl";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";
import { TagInput } from "./TagInput";
import { defaultsFromFields, toCustomValuePayloads, validateFieldValue, type CustomFieldDef } from "@/lib/custom-field-values";

type CustomField = CustomFieldDef;
type CodeMark = { value: string; symbology: string };

export function AddFolderFullPage() {
  const router = useRouter();
  const search = useSearchParams();
  const parentFromUrl = search.get("parentId") || "";
  const fromParam = search.get("from") || "";

  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [destId, setDestId] = useState(parentFromUrl);
  const [folderOpen, setFolderOpen] = useState(false);
  const [nativeCode, setNativeCode] = useState<CodeMark | null>(null);
  const [linkedCode, setLinkedCode] = useState<CodeMark | null>(null);
  const [addMenu, setAddMenu] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState(fromParam || "/items");
  const [createFieldOpen, setCreateFieldOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrStartOnLink, setQrStartOnLink] = useState(false);
  const [dateAlerts, setDateAlerts] = useState<Record<string, DateAlertDraft>>({});
  const [alertFieldId, setAlertFieldId] = useState<string | null>(null);
  const nameFilled = Boolean(name.trim());

  useEffect(() => {
    const draft = readAddFolderDraft();
    if (draft) {
      setName(draft.name);
      setNotes(draft.notes);
      setTags(draft.tags);
      setCustom(draft.custom);
      if (draft.destId) setDestId(draft.destId);
      if (draft.returnTo) setReturnTo(draft.returnTo);
      clearAddFolderDraft();
    }
    api<{ tree: TreeFolder[]; rootId: string }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.rootId);
      setDestId((current) => current || parentFromUrl || d.rootId);
    });
    api<{ fields: CustomField[] }>("/api/v1/settings/lookups")
      .then((d) => {
        const folderFields = d.fields.filter((f) => f.appliesTo !== "ITEM");
        setFields(folderFields);
        setCustom((prev) => ({ ...defaultsFromFields(folderFields), ...prev }));
      })
      .catch(() => null);
  }, [parentFromUrl]);

  const canAdd = name.trim().length > 0;
  const dest = tree.find((f) => f.id === destId) ?? tree.find((f) => f.id === rootId);

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

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  }

  function replacePhoto(index: number, file: File) {
    const url = URL.createObjectURL(file);
    setPhotos((prev) => {
      const next = [...prev];
      const current = next[index];
      const total = next.reduce((sum, item, i) => sum + (i === index ? file.size : item.file.size), 0);
      if (total > MAX_PHOTO_TOTAL_BYTES) {
        URL.revokeObjectURL(url);
        setError("Photos must be 30 MB or less in total");
        return prev;
      }
      if (current) URL.revokeObjectURL(current.url);
      next[index] = { file, url };
      setError("");
      return next;
    });
  }

  function goBack() {
    router.push(returnTo || (destId && destId !== rootId ? `/folder/${destId}/content` : "/items"));
  }

  function resetForm() {
    setName("");
    setNameError(false);
    setNotes("");
    setTags([]);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setCustom(defaultsFromFields(fields));
    setNativeCode(null);
    setLinkedCode(null);
    setDateAlerts({});
    setAlertFieldId(null);
    setError("");
  }

  async function submit(mode: "close" | "another") {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    try {
      for (const field of fields) validateFieldValue(field, custom[field.id] ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check custom fields");
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
          customValues: toCustomValuePayloads(fields, custom),
          sid: nativeCode?.value,
          nativeSymbology: nativeCode?.symbology,
          barcodes: linkedCode ? [linkedCode] : [],
          dateAlerts: Object.entries(dateAlerts)
            .filter(([fieldId]) => Boolean(custom[fieldId]?.trim()))
            .map(([fieldId, draft]) => ({
              fieldId,
              dateWhen: draft.dateWhen,
              dateOffset: draft.dateWhen === "ON" ? null : draft.dateOffset,
              dateOffsetUnit: draft.dateWhen === "ON" ? null : draft.dateOffsetUnit,
              recipientKind: recipientKindFromDraft(draft),
              recipientIds: recipientIdsFromDraft(draft),
            })),
        }),
      });
      for (const { file } of photos) {
        const form = new FormData();
        form.append("file", file);
        form.append("ownerType", "FOLDER");
        form.append("ownerId", created.folder.id);
        await api("/api/v1/photos", { method: "POST", body: form });
      }
      if (mode === "close") goBack();
      else resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add folder");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 scrollbar-thin">
        <div className="mb-4 flex items-center gap-2 text-[15px] text-[#3d4f47]">
          <Folder className="h-4 w-4 text-[#9aa6a0]" />
          <span className="font-medium">Add Folder</span>
          <span className="text-[#c5cdd0]">›</span>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError(false);
          }}
          placeholder="Folder name*"
          className="w-full border-0 border-b border-[#cfd6d2] bg-transparent py-2 text-[22px] text-[#1c2b25] outline-none placeholder:text-[#9aa6a0] focus:border-b-2 focus:border-primary"
        />
        {nameError ? <p className="mt-1.5 text-sm text-[#e24b4b]">Name can&apos;t be blank</p> : null}

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Folder details</h2>
              <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Tags</label>
              <div className="mb-4">
                <TagInput value={tags} onChange={setTags} />
              </div>
              <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="min-h-[96px] w-full resize-y rounded-md border border-[#d8dfdb] px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </section>

            <section>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">QR / Barcodes</h2>
              {nativeCode || linkedCode ? (
                <div className="flex flex-wrap gap-3">
                  {nativeCode ? (
                    <CodeTile
                      code={nativeCode}
                      label={nativeCode.symbology === "QR" ? "QR code" : "Barcode"}
                      onRemove={() => setNativeCode(null)}
                    />
                  ) : null}
                  {linkedCode ? (
                    <CodeTile code={linkedCode} label="Linked code" onRemove={() => setLinkedCode(null)} />
                  ) : (
                    <button
                      type="button"
                      disabled={!nameFilled}
                      onClick={() => {
                        setQrStartOnLink(true);
                        setQrOpen(true);
                      }}
                      className="flex min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-[#d8dfdb] bg-[#f7f8f8] px-4 py-3.5 text-left hover:bg-[#eef1ef] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ScanBarcode className="h-7 w-7 shrink-0 text-[#5c6b64]" strokeWidth={1.75} />
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#5c6b64]">Link QR / Barcode</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!nameFilled}
                  onClick={() => {
                    setQrStartOnLink(false);
                    setQrOpen(true);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] font-bold uppercase tracking-wide",
                    nameFilled
                      ? "border-[#d8dfdb] bg-[#eef1ef] text-[#5c6b64] hover:bg-[#e6ebe8]"
                      : "cursor-not-allowed border-[#ecefee] bg-[#f4f6f5] text-[#c0cbc6]",
                  )}
                >
                  <span className="relative">
                    <Barcode className="h-4 w-4" />
                    <Plus className="absolute -bottom-1 -right-1 h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  Add QR / Barcode
                </button>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Custom fields</h2>
              <div className="space-y-4">
                {fields.map((field) => {
                  const dateValue = custom[field.id] ?? "";
                  const datePicked = field.type === "DATE" && Boolean(dateValue.trim());
                  const alertOn = Boolean(dateAlerts[field.id]);
                  const BellIcon = alertOn ? BellDot : Bell;
                  return (
                    <div key={field.id}>
                      <label className="mb-1.5 block text-[13px] text-[#6b7c74]">{field.name}</label>
                      <CustomFieldControl
                        field={field}
                        value={dateValue}
                        onChange={(next) => {
                          setCustom((c) => ({ ...c, [field.id]: next }));
                          if (field.type === "DATE" && !next.trim()) {
                            setDateAlerts((prev) => {
                              const copy = { ...prev };
                              delete copy[field.id];
                              return copy;
                            });
                            if (alertFieldId === field.id) setAlertFieldId(null);
                          }
                        }}
                        rightSlot={
                          field.type === "DATE" ? (
                            <button
                              type="button"
                              disabled={!datePicked}
                              aria-label={datePicked ? `Set alert for ${field.name}` : `Pick ${field.name} first`}
                              onClick={() => {
                                if (!datePicked) return;
                                setDateAlerts((prev) => (prev[field.id] ? prev : { ...prev, [field.id]: { ...DEFAULT_DATE_ALERT } }));
                                setAlertFieldId((id) => (id === field.id ? null : field.id));
                              }}
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border",
                                !datePicked
                                  ? "cursor-not-allowed border-[#ecefee] text-[#c0cbc6]"
                                  : alertOn
                                    ? "border-primary bg-primary-soft text-primary"
                                    : "border-[#d8dfdb] text-[#5c6b64] hover:border-primary hover:text-primary",
                              )}
                            >
                              <BellIcon className="h-4 w-4" />
                            </button>
                          ) : undefined
                        }
                      />
                      {field.type === "DATE" && alertFieldId === field.id && datePicked ? (
                        <DateAlertPanel
                          fieldName={field.name}
                          dateLabel={dateValue}
                          value={dateAlerts[field.id] ?? DEFAULT_DATE_ALERT}
                          onChange={(next) => setDateAlerts((prev) => ({ ...prev, [field.id]: next }))}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-5 text-[12px] font-bold uppercase tracking-wide text-primary">
                <button type="button" onClick={() => setCreateFieldOpen(true)} className="inline-flex items-center gap-1.5 hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add new field
                </button>
                <a
                  href="/manage-custom-attributes/node"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <List className="h-3.5 w-3.5" /> Manage custom fields
                </a>
              </div>
            </section>
          </div>

          <section>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Photos</h2>
            <PhotoGallery photos={photos} onAdd={addPhotos} onRemove={removePhoto} onReplace={replacePhoto} onReorder={setPhotos} />
          </section>
        </div>
        {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      </div>

      <footer className="flex items-end justify-between gap-4 border-t border-[#ecefee] bg-white px-8 py-4">
        <div className="relative min-w-0 max-w-md flex-1">
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
              root={Boolean(dest && dest.id === rootId)}
              kind={dest?.kind === "JOB" ? "JOB" : "ITEM"}
              populated={dest ? isFolderPopulated(dest) : true}
            />
            <span className="min-w-0 flex-1 truncate">{dest?.name ?? "All Items"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#9aa6a0]" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} className="text-[13px] font-bold uppercase tracking-wide text-[#6b7c74] hover:text-[#2a3a33]">
            Cancel
          </button>
          <div className="relative">
            <div className="flex overflow-hidden rounded-md">
              <button
                type="button"
                disabled={pending || !canAdd}
                onClick={() => void submit("close")}
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
                  <CirclePlus className="h-4.5 w-4.5 text-[#6b7c74]" strokeWidth={1.75} />
                  Add
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] text-[#2a3a33] hover:bg-[#f4f6f5]"
                  onClick={() => void submit("another")}
                >
                  <span className="relative h-4.5 w-4.5 text-[#6b7c74]">
                    <Copy className="h-4.5 w-4.5" strokeWidth={1.75} />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white">
                      <ArrowRight className="h-2 w-2" strokeWidth={3} />
                    </span>
                  </span>
                  Add &amp; New
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </footer>
      <CreateCustomFieldModal
        open={createFieldOpen}
        defaultFolders
        onClose={() => setCreateFieldOpen(false)}
        onCreated={(field) => {
          if (field.appliesTo !== "ITEM") {
            setFields((prev) => [...prev, field]);
            setCustom((prev) => ({
              ...prev,
              ...(field.defaultValue || field.type === "CHECKBOX" ? defaultsFromFields([field]) : {}),
            }));
          }
        }}
      />
      <AddQrBarcodeModal
        open={qrOpen}
        startOnLink={qrStartOnLink}
        existingSid={nativeCode?.value}
        onClose={() => setQrOpen(false)}
        onAdd={(code) => {
          if (code.role === "native") setNativeCode({ value: code.value, symbology: code.symbology });
          else setLinkedCode({ value: code.value, symbology: code.symbology });
        }}
      />
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

function CodeTile({ code, label, onRemove }: { code: CodeMark; label: string; onRemove: () => void }) {
  return (
    <div className="relative min-w-[220px] flex-1 rounded-lg border border-[#d8dfdb] bg-white px-4 py-3">
      <button
        type="button"
        aria-label={`Remove ${label}`}
        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#e24b4b] text-white shadow-sm hover:bg-[#d13d3d]"
        onClick={onRemove}
      >
        <X className="h-3 w-3" strokeWidth={3} />
      </button>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7c74]">{label}</p>
      <BarcodeMark value={code.value} symbology={code.symbology} />
    </div>
  );
}
