"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ClipboardList,
  FolderTree,
  Minus,
  Plus,
  QrCode,
  ScanLine,
  Search,
  SlidersHorizontal,
  Type,
  X,
} from "lucide-react";
import { formatMoney } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { Button, Input } from "@/components/ui";
import { BulkActionBar } from "@/components/BulkActionBar";
import { BulkDeleteModal } from "@/components/bulk/BulkDeleteModal";
import { BulkMoveModal } from "@/components/bulk/BulkMoveModal";
import { BulkEditModal, CloneItemModal } from "@/components/InventoryActions";
import { BulkUpdateQuantityModal } from "@/components/items/BulkUpdateQuantityModal";
import { RestockModal, AddToModal } from "@/components/items/ItemModals";
import type { ItemActionTarget } from "@/components/items/types";
import { ExportWizard } from "@/components/ExportWizard";
import { CreateLabelWizard, type LabelTarget } from "@/components/CreateLabelWizard";
import { ItemAlertModal } from "@/components/ItemAlertModal";
import type { TreeFolder } from "@/components/FolderPane";
import { dropdownOptions, type CustomFieldDef } from "@/lib/custom-field-values";
import { cn } from "@/lib/cn";

type SearchItem = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  totalValue: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  path: string;
  hidePrices?: boolean;
  unit?: { abbreviation: string; name: string };
  folder?: { id: string; name: string };
  photos?: { id: string; publicUrl?: string | null }[];
  groupedCount?: number;
  groupedQty?: number;
  customFields?: { id: string; name: string; value: string }[];
};

type Facets = {
  names: string[];
  tags: { id: string; name: string }[];
  units: { id: string; name: string; abbreviation: string }[];
  fields: CustomFieldDef[];
};

const EMPTY_HINTS = [
  { icon: FolderTree, title: "Folders", body: "Get a list of items in specific folders." },
  { icon: Plus, title: "Quantity", body: "Filter items based on their stock levels." },
  { icon: Minus, title: "Min Level", body: "Identify items below or above their min levels." },
  { icon: QrCode, title: "Barcode / QR code", body: "Find all items matching specific barcodes or qr codes." },
  { icon: Type, title: "Custom filters", body: "Add filters matching any custom fields in your system." },
  { icon: ClipboardList, title: "Summaries", body: "Group items with the same SID." },
];

export default function SearchPage() {
  const [facets, setFacets] = useState<Facets | null>(null);
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [folderQ, setFolderQ] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [nameQ, setNameQ] = useState("");
  const [unitId, setUnitId] = useState("");
  const [qtyMin, setQtyMin] = useState("");
  const [qtyMax, setQtyMax] = useState("");
  const [qtyExact, setQtyExact] = useState(false);
  const [min, setMin] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [priceExact, setPriceExact] = useState(false);
  const [qtyAlerts, setQtyAlerts] = useState("");
  const [dateAlerts, setDateAlerts] = useState("");
  const [dateAlertFieldId, setDateAlertFieldId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagQ, setTagQ] = useState("");
  const [sid, setSid] = useState("");
  const [barcode, setBarcode] = useState("");
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [extraFieldIds, setExtraFieldIds] = useState<string[]>([]);
  const [sort, setSort] = useState("updatedAt");
  const [group, setGroup] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkQtyOpen, setBulkQtyOpen] = useState(false);
  const [cloneItem, setCloneItem] = useState<SearchItem | null>(null);
  const [restockItem, setRestockItem] = useState<SearchItem | null>(null);
  const [addToItem, setAddToItem] = useState<SearchItem | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const itemFields = (facets?.fields ?? []).filter((field) => field.appliesTo !== "FOLDER");
  const dateFields = itemFields.filter((field) => field.type === "DATE");
  const primaryFields = itemFields.slice(0, 6);
  const extraFields = itemFields.filter((field) => extraFieldIds.includes(field.id) && !primaryFields.some((row) => row.id === field.id));

  useEffect(() => {
    api<Facets>("/api/v1/search?facets=1").then(setFacets).catch(() => setFacets({ names: [], tags: [], units: [], fields: [] }));
    api<{ tree: TreeFolder[] }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.tree.find((f) => !f.parentId)?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!scanning) return;
    barcodeRef.current?.focus();
  }, [scanning]);

  useEffect(() => {
    if (items == null) return;
    void apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, group]);

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((row) => row !== id) : [...list, id];
  }

  function buildParams() {
    const params = new URLSearchParams();
    for (const name of names) params.append("name", name);
    if (sid.trim()) params.set("sid", sid.trim());
    for (const tag of tags) params.append("tag", tag);
    if (barcode.trim()) params.set("barcode", barcode.trim());
    if (notes.trim()) params.set("notes", notes.trim());
    if (min) params.set("min", min);
    if (qtyMin) params.set("qtyMin", qtyMin);
    if (qtyMax && !qtyExact) params.set("qtyMax", qtyMax);
    if (qtyExact) params.set("qtyExact", "1");
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax && !priceExact) params.set("priceMax", priceMax);
    if (priceExact) params.set("priceExact", "1");
    if (unitId) params.set("unitId", unitId);
    if (qtyAlerts) params.set("qtyAlerts", qtyAlerts);
    if (dateAlerts) params.set("dateAlerts", dateAlerts);
    if (dateAlertFieldId) params.set("dateAlertFieldId", dateAlertFieldId);
    params.set("sort", sort);
    if (group) params.set("group", "1");
    for (const id of folderIds) params.append("folderId", id);
    for (const [fieldId, value] of Object.entries(custom)) {
      if (value.trim()) params.set(`cf_${fieldId}`, value.trim());
    }
    return params;
  }

  async function apply() {
    setBusy(true);
    try {
      const data = await api<{ items: SearchItem[] }>(`/api/v1/search?${buildParams()}`);
      setItems(data.items);
      setSelected([]);
      setApplied(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setFolderIds([]);
    setNames([]);
    setUnitId("");
    setQtyMin("");
    setQtyMax("");
    setQtyExact(false);
    setMin("");
    setPriceMin("");
    setPriceMax("");
    setPriceExact(false);
    setQtyAlerts("");
    setDateAlerts("");
    setDateAlertFieldId("");
    setTags([]);
    setSid("");
    setBarcode("");
    setNotes("");
    setCustom({});
    setExtraFieldIds([]);
    setItems(null);
    setApplied(false);
    setSelected([]);
    setGroup(false);
  }

  function markDirty() {
    setApplied(false);
  }

  const shownNames = useMemo(() => {
    const q = nameQ.trim().toLowerCase();
    return (facets?.names ?? []).filter((name) => !q || name.toLowerCase().includes(q)).slice(0, 80);
  }, [facets, nameQ]);
  const shownTags = useMemo(() => {
    const q = tagQ.trim().toLowerCase();
    return (facets?.tags ?? []).filter((tag) => !q || tag.name.toLowerCase().includes(q));
  }, [facets, tagQ]);

  const selectedItems = (items ?? []).filter((item) => selected.includes(item.id));
  const singleSelected = selected.length === 1 ? selectedItems[0] : undefined;
  const labelTargets: LabelTarget[] = selectedItems.map((item) => ({
    kind: "item",
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    photoUrl: item.photos?.[0]?.publicUrl || (item.photos?.[0] ? `/api/v1/photos/${item.photos[0].id}` : null),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Advanced Search"
        actions={
          <button
            type="button"
            onClick={() => setScanning((v) => !v)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm",
              scanning ? "border-primary bg-primary-soft text-primary" : "border-border text-[#4a5c54]",
            )}
          >
            <ScanLine className="h-4 w-4" />
            {scanning ? "Close scanning mode" : "Scan to search"}
          </button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-[#e6ebe8] bg-white">
          <div className="flex items-center justify-between border-b border-[#e6ebe8] px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[#1c2b25]">Filters</h2>
            <button type="button" className="text-[13px] text-primary hover:underline" onClick={clear}>
              Clear
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <FilterBlock title="Folders" defaultOpen search={folderQ} onSearch={setFolderQ} searchPlaceholder="Search folders">
              <button
                type="button"
                onClick={() => {
                  setFolderIds(tree.map((f) => f.id));
                  markDirty();
                }}
                className="mb-2 rounded-full border border-[#d8dfdb] px-2.5 py-0.5 text-[12px] text-[#4a5c54] hover:border-primary"
              >
                All Folders
              </button>
              <FolderChecks
                folders={tree}
                parentId={null}
                selected={folderIds}
                query={folderQ}
                onToggle={(id) => {
                  setFolderIds((ids) => toggleId(ids, id));
                  markDirty();
                }}
              />
            </FilterBlock>

            <FilterBlock title="Name" defaultOpen search={nameQ} onSearch={setNameQ} searchPlaceholder="Search names">
              {shownNames.map((name) => (
                <CheckRow
                  key={name}
                  label={name}
                  checked={names.includes(name)}
                  onChange={() => {
                    setNames((rows) => toggleId(rows, name));
                    markDirty();
                  }}
                />
              ))}
              {!shownNames.length ? <p className="py-2 text-[13px] text-[#8a9a93]">No matching names</p> : null}
            </FilterBlock>

            <FilterBlock title="Quantity" defaultOpen>
              <select
                className="mb-2 h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm"
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value);
                  markDirty();
                }}
              >
                <option value="">Any Units</option>
                {(facets?.units ?? []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Min" value={qtyMin} onChange={(e) => { setQtyMin(e.target.value); markDirty(); }} />
                <Input placeholder="Max" value={qtyExact ? "" : qtyMax} disabled={qtyExact} onChange={(e) => { setQtyMax(e.target.value); markDirty(); }} />
              </div>
              <label className="mt-2 flex items-center justify-between text-[13px] text-[#4a5c54]">
                Exact value
                <Toggle checked={qtyExact} onChange={(v) => { setQtyExact(v); markDirty(); }} />
              </label>
            </FilterBlock>

            <FilterBlock title="Min. Level">
              <select className="h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={min} onChange={(e) => { setMin(e.target.value); markDirty(); }}>
                <option value="">Show Items</option>
                <option value="below">Below Min Level</option>
                <option value="at_or_below">At or Below Min Level</option>
                <option value="above">Above Min Level</option>
                <option value="with">With Min Level set</option>
                <option value="without">Without Min Level set</option>
              </select>
            </FilterBlock>

            <FilterBlock title="Price">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Min" value={priceMin} onChange={(e) => { setPriceMin(e.target.value); markDirty(); }} />
                <Input placeholder="Max" value={priceExact ? "" : priceMax} disabled={priceExact} onChange={(e) => { setPriceMax(e.target.value); markDirty(); }} />
              </div>
              <label className="mt-2 flex items-center justify-between text-[13px] text-[#4a5c54]">
                Exact value
                <Toggle checked={priceExact} onChange={(v) => { setPriceExact(v); markDirty(); }} />
              </label>
            </FilterBlock>

            <FilterBlock title="Quantity Alerts">
              <select className="h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={qtyAlerts} onChange={(e) => { setQtyAlerts(e.target.value); markDirty(); }}>
                <option value="">Any</option>
                <option value="set">Alerts set</option>
                <option value="unset">No quantity alert</option>
              </select>
            </FilterBlock>

            <FilterBlock title="Date Alerts">
              <select className="h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={dateAlerts} onChange={(e) => { setDateAlerts(e.target.value); markDirty(); }}>
                <option value="">Any</option>
                <option value="set">Alerts set</option>
                <option value="unset">No date alert</option>
              </select>
              {dateAlerts === "set" && dateFields.length ? (
                <select className="mt-2 h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={dateAlertFieldId} onChange={(e) => { setDateAlertFieldId(e.target.value); markDirty(); }}>
                  <option value="">Any date field</option>
                  {dateFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </FilterBlock>

            <FilterBlock title="Tags" search={tagQ} onSearch={setTagQ} searchPlaceholder="Search tags">
              {shownTags.map((tag) => (
                <CheckRow
                  key={tag.id}
                  label={tag.name}
                  checked={tags.includes(tag.name)}
                  onChange={() => {
                    setTags((rows) => toggleId(rows, tag.name));
                    markDirty();
                  }}
                />
              ))}
              {!shownTags.length ? <p className="py-2 text-[13px] text-[#8a9a93]">No tags yet</p> : null}
            </FilterBlock>

            <FilterBlock title="SID">
              <Input placeholder="Search SID" value={sid} onChange={(e) => { setSid(e.target.value); markDirty(); }} />
            </FilterBlock>

            <FilterBlock title="Barcode / QR code" defaultOpen>
              <Input
                ref={barcodeRef}
                placeholder="Search Barcode / QR code"
                value={barcode}
                onChange={(e) => { setBarcode(e.target.value); markDirty(); }}
                onFocus={(e) => {
                  if (scanning) e.currentTarget.select();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void apply();
                  }
                }}
              />
            </FilterBlock>

            <FilterBlock title="Notes">
              <Input placeholder="Search notes" value={notes} onChange={(e) => { setNotes(e.target.value); markDirty(); }} />
            </FilterBlock>

            {primaryFields.map((field) => (
              <FilterBlock key={field.id} title={field.name}>
                <CustomFilter field={field} value={custom[field.id] ?? ""} onChange={(value) => { setCustom((prev) => ({ ...prev, [field.id]: value })); markDirty(); }} />
              </FilterBlock>
            ))}
            {extraFields.map((field) => (
              <FilterBlock key={field.id} title={field.name} defaultOpen>
                <CustomFilter field={field} value={custom[field.id] ?? ""} onChange={(value) => { setCustom((prev) => ({ ...prev, [field.id]: value })); markDirty(); }} />
              </FilterBlock>
            ))}
            {itemFields.length > primaryFields.length ? (
              <div className="px-1 py-2">
                <select
                  className="h-10 w-full rounded-md border border-dashed border-[#b7c2bc] px-2 text-sm text-primary"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setExtraFieldIds((ids) => (ids.includes(e.target.value) ? ids : [...ids, e.target.value]));
                    markDirty();
                  }}
                >
                  <option value="">Add custom filter</option>
                  {itemFields
                    .filter((field) => !primaryFields.some((row) => row.id === field.id) && !extraFieldIds.includes(field.id))
                    .map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="border-t border-[#e6ebe8] p-3">
            <Button className="w-full" disabled={busy || applied} onClick={() => void apply()}>
              {applied ? "Filters applied" : busy ? "Searching…" : "Apply Filters"}
            </Button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f4f6f5]">
          {scanning ? (
            <div className="flex items-center justify-between bg-[#e8f4ee] px-6 py-2.5 text-sm text-[#1c2b25]">
              <span>Scanning mode is enabled. Scan a QR / barcode to search for items.</span>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setScanning(false)}>
                Close scanning mode
              </button>
            </div>
          ) : null}
          {selected.length ? (
            <BulkActionBar
              itemCount={selected.length}
              folderCount={0}
              pageTotal={items?.length ?? 0}
              allOnPageSelected={Boolean(items?.length && selected.length === items.length)}
              onSelectAllPage={() => items && setSelected(items.map((i) => i.id))}
              onEdit={() => setEditOpen(true)}
              onUpdateQuantity={() => setBulkQtyOpen(true)}
              onMove={() => setMoveOpen(true)}
              onLabels={() => setLabelOpen(true)}
              onExport={() => setExportOpen(true)}
              onAlerts={() => setAlertOpen(true)}
              onRestock={singleSelected ? () => setRestockItem(singleSelected) : undefined}
              onClone={singleSelected ? () => setCloneItem(singleSelected) : undefined}
              onAddTo={singleSelected ? () => setAddToItem(singleSelected) : undefined}
              onDelete={() => setBulkDeleteOpen(true)}
              onClear={() => setSelected([])}
            />
          ) : null}
          <div className="flex items-center gap-4 border-b border-[#e6ebe8] bg-white px-6 py-2.5 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-[#8a9a93]" />
            <label className="flex items-center gap-2 text-[#4a5c54]">
              Sort by
              <select
                className="h-8 rounded-md border border-[#d8dfdb] px-2"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                }}
              >
                <option value="updatedAt">Updated At</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
                <option value="price">Price</option>
              </select>
            </label>
            <label className="ml-auto flex items-center gap-2 text-[#4a5c54]">
              Group Items
              <Toggle
                checked={group}
                onChange={(v) => {
                  setGroup(v);
                }}
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {items == null ? (
              <div className="mx-auto max-w-3xl pt-8">
                <p className="mb-8 text-center text-sm text-[#6b7c74]">
                  Use filters to create lists across your inventory. Summaries group items that share the same SID.
                </p>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {EMPTY_HINTS.map((hint) => {
                    const Icon = hint.icon;
                    return (
                    <div key={hint.title} className="text-center">
                      <Icon className="mx-auto h-8 w-8 text-primary" strokeWidth={1.6} />
                      <h3 className="mt-3 font-semibold text-[#1c2b25]">{hint.title}</h3>
                      <p className="mt-1 text-[13px] text-[#6b7c74]">{hint.body}</p>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <h2 className="font-medium text-[#1c2b25]">
                    Search results ({items.length} item{items.length === 1 ? "" : "s"})
                  </h2>
                  {items.length && !selected.length ? (
                    <button type="button" className="text-primary hover:underline" onClick={() => setSelected(items.map((i) => i.id))}>
                      Select all items
                    </button>
                  ) : null}
                </div>
                {items.length === 0 ? (
                  <p className="rounded-xl bg-white px-6 py-16 text-center text-sm text-[#8a9a93]">No items match these filters.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <ResultCard
                        key={item.id}
                        item={item}
                        selected={selected.includes(item.id)}
                        onToggle={() => setSelected((ids) => toggleId(ids, item.id))}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {editOpen ? (
        <BulkEditModal itemIds={selected} folderIds={[]} onClose={() => setEditOpen(false)} onDone={() => { setEditOpen(false); void apply(); }} />
      ) : null}
      <ExportWizard open={exportOpen} onClose={() => setExportOpen(false)} itemIds={selected} />
      <CreateLabelWizard open={labelOpen} mode="linked" targets={labelTargets} onClose={() => setLabelOpen(false)} />
      {alertOpen ? (
        <ItemAlertModal
          itemIds={selected}
          fields={itemFields}
          onClose={() => setAlertOpen(false)}
          onDone={() => {
            setAlertOpen(false);
            void apply();
          }}
        />
      ) : null}
      {bulkQtyOpen && selected.length ? (
        <BulkUpdateQuantityModal
          itemIds={selected}
          onClose={() => setBulkQtyOpen(false)}
          onSaved={() => {
            setBulkQtyOpen(false);
            void apply();
          }}
        />
      ) : null}
      {moveOpen ? (
        <BulkMoveModal
          itemIds={selected}
          folderIds={[]}
          tree={tree}
          rootId={rootId}
          onClose={() => setMoveOpen(false)}
          onSaved={() => {
            setMoveOpen(false);
            setSelected([]);
            void apply();
          }}
        />
      ) : null}
      {bulkDeleteOpen ? (
        <BulkDeleteModal
          itemCount={selected.length}
          folderCount={0}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={async (meta) => {
            await api("/api/v1/items/bulk", {
              method: "POST",
              body: JSON.stringify({
                action: "delete",
                itemIds: selected,
                reason: meta.reason || null,
                note: meta.note || null,
              }),
            });
            setBulkDeleteOpen(false);
            setSelected([]);
            void apply();
          }}
        />
      ) : null}
      {cloneItem ? (
        <CloneItemModal
          item={{ id: cloneItem.id, name: cloneItem.name, folderId: cloneItem.folder?.id }}
          tree={tree}
          rootId={rootId}
          onClose={() => setCloneItem(null)}
          onDone={() => {
            setCloneItem(null);
            void apply();
          }}
        />
      ) : null}
      {restockItem ? (
        <RestockModal
          item={searchItemToTarget(restockItem)}
          onClose={() => setRestockItem(null)}
          onDone={(_href) => {
            setRestockItem(null);
            void apply();
          }}
        />
      ) : null}
      {addToItem ? (
        <AddToModal
          item={searchItemToTarget(addToItem)}
          onClose={() => setAddToItem(null)}
          onDone={(_href) => {
            setAddToItem(null);
            void apply();
          }}
        />
      ) : null}
    </div>
  );
}

function searchItemToTarget(item: SearchItem): ItemActionTarget {
  return {
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    folderId: item.folder?.id,
    unit: item.unit,
  };
}

function ResultCard({
  item,
  selected,
  onToggle,
}: {
  item: SearchItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const isNew = Date.now() - new Date(item.createdAt).getTime() < 1000 * 60 * 60 * 24 * 7;
  const qty = item.groupedQty ?? item.quantity;
  const unit = item.unit?.name?.toLowerCase() || item.unit?.abbreviation || "units";
  const href = item.groupedCount && item.groupedCount > 1 ? `/group/${encodeURIComponent(item.sid)}` : `/item/${item.id}`;
  const meta = [
    item.notes ? { label: "Notes", value: item.notes } : null,
    { label: "Updated", value: formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true }) },
    ...(item.customFields ?? [])
      .filter((field) => field.value && field.value !== "—")
      .slice(0, 3)
      .map((field) => ({ label: field.name, value: field.value })),
  ].filter(Boolean) as { label: string; value: string }[];
  const photo = item.photos?.[0];

  return (
    <div className={cn("flex items-stretch gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-border", selected && "ring-primary")}>
      <input type="checkbox" className="mt-3 accent-primary" checked={selected} onChange={onToggle} />
      <Link href={href} className="min-w-0 flex-1">
        <div className="text-[12px] text-[#8a9a93]">{item.path}</div>
        <div className="mt-2 flex gap-4">
          <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-md bg-[#eceeed]">
            {photo ? (
              <img src={photo.publicUrl || `/api/v1/photos/${photo.id}`} alt="" className="h-full w-full object-cover" />
            ) : null}
            {item.groupedCount && item.groupedCount > 1 ? (
              <span className="absolute left-1.5 top-1.5 rounded bg-[#3d4f47] px-1.5 py-0.5 text-[10px] font-bold text-white">{item.groupedCount}</span>
            ) : isNew ? (
              <span className="absolute left-1.5 top-1.5 rounded bg-[#3d4f47] px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <div className="text-[12px] tracking-wide text-[#8a9a93]">{item.sid}</div>
            <div className="text-[16px] font-semibold text-[#1c2b25]">{item.name}</div>
            <div className="mt-1 text-[13px] text-[#4a5c54]">
              {qty} {unit}
              {item.groupedCount && item.groupedCount > 1 ? ` · ${item.groupedCount} locations` : null}
              {item.hidePrices ? null : (
                <>
                  <span className="text-[#c5d0cb]"> | </span>
                  {formatMoney(item.totalValue)}
                </>
              )}
            </div>
          </div>
          <div className="hidden min-w-[220px] border-l border-dashed border-[#e6ebe8] pl-4 text-[13px] lg:block">
            {meta.map((row) => (
              <div key={row.label} className="mb-1.5 last:mb-0">
                <span className="text-[#8a9a93]">{row.label}: </span>
                <span className="text-[#2a3a33]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}

function FilterBlock({
  title,
  children,
  defaultOpen,
  search,
  onSearch,
  searchPlaceholder,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [find, setFind] = useState(false);
  return (
    <section className="border-b border-[#eef2f0] py-1">
      <div className="flex items-center gap-1">
        <button type="button" className="flex h-9 flex-1 items-center justify-between px-1 text-left text-[13px] font-semibold text-[#1c2b25]" onClick={() => setOpen((v) => !v)}>
          {title}
          <ChevronDown className={cn("h-4 w-4 text-[#8a9a93] transition", open ? "rotate-180" : "")} />
        </button>
        {onSearch ? (
          <button type="button" className="rounded p-1 text-[#8a9a93] hover:bg-[#f4f6f5]" onClick={() => setFind((v) => !v)} aria-label={`Search ${title}`}>
            {find ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="px-1 pb-3">
          {find && onSearch ? (
            <Input className="mb-2 h-9" placeholder={searchPlaceholder} value={search} onChange={(e) => onSearch(e.target.value)} />
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function FolderChecks({
  folders,
  parentId,
  selected,
  query,
  onToggle,
  depth = 0,
}: {
  folders: TreeFolder[];
  parentId: string | null;
  selected: string[];
  query: string;
  onToggle: (id: string) => void;
  depth?: number;
}) {
  const q = query.trim().toLowerCase();
  const rows = folders.filter((folder) => {
    if (folder.parentId !== parentId) return false;
    if (!q) return true;
    const self = folder.name.toLowerCase().includes(q);
    const childHit = folders.some((child) => child.parentId === folder.id && child.name.toLowerCase().includes(q));
    return self || childHit;
  });
  return (
    <ul>
      {rows.map((folder) => (
        <li key={folder.id}>
          <label className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-[#2a3a33]" style={{ paddingLeft: depth * 12 }}>
            <input type="checkbox" className="accent-primary" checked={selected.includes(folder.id)} onChange={() => onToggle(folder.id)} />
            <span className="truncate">{folder.name}</span>
          </label>
          <FolderChecks folders={folders} parentId={folder.id} selected={selected} query={query} onToggle={onToggle} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-[#2a3a33]">
      <input type="checkbox" className="accent-primary" checked={checked} onChange={onChange} />
      <span className="truncate">{label}</span>
    </label>
  );
}

function CustomFilter({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "CHECKBOX") {
    return (
      <select className="h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field.type === "DROPDOWN") {
    return (
      <select className="h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {dropdownOptions(field).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "DATE") {
    return <input type="date" className="h-10 w-full rounded-md border border-[#d8dfdb] px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <Input placeholder={field.placeholder || field.name} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-[#c5d0cb]")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition", checked ? "left-4" : "left-0.5")} />
    </button>
  );
}
