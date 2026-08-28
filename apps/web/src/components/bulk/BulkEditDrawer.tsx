"use client";

import { useEffect, useState } from "react";
import { api, toast } from "@/lib/api";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { TagInput } from "@/components/TagInput";
import { CustomFieldControl } from "@/components/CustomFieldControl";
import {
  toCustomValuePayloads,
  validateFieldValue,
  type CustomFieldDef,
} from "@/lib/custom-field-values";

export function BulkEditDrawer({
  itemIds,
  folderIds,
  onClose,
  onDone,
}: {
  itemIds: string[];
  folderIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const hasItems = itemIds.length > 0;
  const hasFolders = folderIds.length > 0;
  const [name, setName] = useState("");
  const [minQuantity, setMin] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tagMode, setTagMode] = useState<"add" | "remove" | "replace">("add");
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [applyToItems, setApplyToItems] = useState(false);
  const [units, setUnits] = useState<{ id: string; name: string; abbreviation: string }[]>([]);
  const [itemFields, setItemFields] = useState<CustomFieldDef[]>([]);
  const [folderFields, setFolderFields] = useState<CustomFieldDef[]>([]);
  const [itemCustom, setItemCustom] = useState<Record<string, string>>({});
  const [folderCustom, setFolderCustom] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ fields: CustomFieldDef[]; units: { id: string; name: string; abbreviation: string }[] }>(
      "/api/v1/settings/lookups",
    ).then((d) => {
      setUnits(d.units);
      setItemFields(d.fields.filter((f) => f.appliesTo !== "FOLDER"));
      setFolderFields(d.fields.filter((f) => f.appliesTo !== "ITEM"));
    });
  }, []);

  async function apply() {
    setBusy(true);
    try {
      if (hasItems) {
        for (const field of itemFields) {
          const value = itemCustom[field.id] ?? "";
          if (value) validateFieldValue(field, value);
        }
        await api("/api/v1/items/bulk", {
          method: "POST",
          body: JSON.stringify({
            action: "edit",
            itemIds,
            name: name.trim() || undefined,
            minQuantity: minQuantity === "" ? undefined : Number(minQuantity),
            price: price === "" ? undefined : Number(price),
            notes: notes === "" ? undefined : notes,
            unitId: unitId || undefined,
            tags: tagNames.length ? { mode: tagMode, names: tagNames } : undefined,
            customValues: toCustomValuePayloads(itemFields, itemCustom).length
              ? toCustomValuePayloads(itemFields, itemCustom)
              : undefined,
          }),
          toast: false,
        });
      }
      if (hasFolders) {
        for (const field of folderFields) {
          const value = folderCustom[field.id] ?? "";
          if (value) validateFieldValue(field, value);
        }
        await api("/api/v1/items/bulk", {
          method: "POST",
          body: JSON.stringify({
            action: "edit-folders",
            folderIds,
            name: name.trim() || undefined,
            notes: notes === "" ? undefined : notes,
            tags: tagNames.length ? { mode: "replace", names: tagNames } : undefined,
            applyToItems: applyToItems || undefined,
            customValues: toCustomValuePayloads(folderFields, folderCustom).length
              ? toCustomValuePayloads(folderFields, folderCustom)
              : undefined,
          }),
          toast: false,
        });
      }
      toast.success("Bulk edit applied");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk edit failed");
    } finally {
      setBusy(false);
    }
  }

  const countLabel = [
    hasItems ? `${itemIds.length} item${itemIds.length === 1 ? "" : "s"}` : null,
    hasFolders ? `${folderIds.length} folder${folderIds.length === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <>
      <button type="button" className="fixed inset-0 z-[60] bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="border-b border-[#e6ebe8] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1c2b25]">Bulk Edit</h2>
          <p className="mt-1 text-sm text-[#6b7c74]">
            {countLabel}. Empty fields are left unchanged.
          </p>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank to keep current" />
            </Field>
            {hasItems ? (
              <>
                <Field label="Min Level">
                  <Input value={minQuantity} onChange={(e) => setMin(e.target.value)} />
                </Field>
                <Field label="Price">
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
                <Field label="Unit of Measure">
                  <select
                    className="h-11 w-full rounded-lg border border-[#d8dfdb] px-3 text-sm"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                  >
                    <option value="">Leave unchanged</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
            <Field label="Tags">
              <TagInput value={tagNames} onChange={setTagNames} />
            </Field>
            {hasItems ? (
              <Field label="Tag action">
                <select
                  className="h-11 w-full rounded-lg border border-[#d8dfdb] px-3 text-sm"
                  value={tagMode}
                  onChange={(e) => setTagMode(e.target.value as typeof tagMode)}
                >
                  <option value="add">Add tags</option>
                  <option value="remove">Remove tags</option>
                  <option value="replace">Replace tags</option>
                </select>
              </Field>
            ) : hasFolders && tagNames.length ? (
              <p className="text-[13px] text-[#6b7c74]">Folder tags will replace existing tags on selected folders.</p>
            ) : null}
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Leave blank to keep current" />
            </Field>
            {hasItems
              ? itemFields.map((field) => (
                  <Field key={field.id} label={field.name}>
                    <CustomFieldControl
                      field={field}
                      value={itemCustom[field.id] ?? ""}
                      onChange={(next) => setItemCustom((c) => ({ ...c, [field.id]: next }))}
                    />
                  </Field>
                ))
              : null}
            {hasFolders
              ? folderFields.map((field) => (
                  <Field key={field.id} label={field.name}>
                    <CustomFieldControl
                      field={field}
                      value={folderCustom[field.id] ?? ""}
                      onChange={(next) => setFolderCustom((c) => ({ ...c, [field.id]: next }))}
                    />
                  </Field>
                ))
              : null}
            {hasFolders ? (
              <label className="flex items-start gap-2 text-sm text-[#4a5c54]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={applyToItems}
                  onChange={(e) => setApplyToItems(e.target.checked)}
                />
                Also apply name, notes, and tags to items inside selected folders
              </label>
            ) : null}
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#e6ebe8] px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void apply()} disabled={busy}>
            {busy ? "Applying…" : "Apply"}
          </Button>
        </footer>
      </aside>
    </>
  );
}
