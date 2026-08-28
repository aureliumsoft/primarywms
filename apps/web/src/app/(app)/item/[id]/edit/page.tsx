"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { CustomFieldControl } from "@/components/CustomFieldControl";
import { AddQrBarcodeModal } from "@/components/AddQrBarcodeModal";
import { BarcodeMark } from "@/components/BarcodeMark";
import { TagInput } from "@/components/TagInput";
import {
  toCustomValuePayloads,
  validateFieldValue,
  valuesFromStored,
  type CustomFieldDef,
  type StoredCustomValue,
} from "@/lib/custom-field-values";
import { ItemDetailSkeleton } from "@/components/skeletons";
import { ItemPageShell, ItemPrimaryButton, ItemSecondaryButton } from "@/components/items/ui";
import { UpdateQuantityModal } from "@/components/items/ItemModals";
import type { ItemActionTarget } from "@/components/items/types";

type ItemPayload = {
  item: {
    id: string;
    name: string;
    sid: string;
    quantity: number;
    minQuantity: number | null;
    price: number | null;
    notes: string | null;
    updatedAt: string;
    productLink: string | null;
    unitId?: string;
    folder: { id: string; name: string };
    unit: { id?: string; name: string; abbreviation: string };
    barcodes: { id: string; value: string; symbology: string; slot: number }[];
    tags: { tag: { id: string; name: string } }[];
    customValues: (StoredCustomValue & { field: { name: string; type: string } })[];
  };
};

export default function ItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ItemPayload | null>(null);
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [unitId, setUnitId] = useState("");
  const [productLink, setProductLink] = useState("");
  const [itemTags, setItemTags] = useState<string[]>([]);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [qtyOpen, setQtyOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api<ItemPayload>(`/api/v1/items/${id}`),
      api<{ fields: CustomFieldDef[]; units: { id: string; name: string }[] }>("/api/v1/settings/lookups"),
    ])
      .then(([d, lookups]) => {
        const itemFields = lookups.fields.filter((field) => field.appliesTo !== "FOLDER");
        setData(d);
        setFields(itemFields);
        setUnits(lookups.units);
        setName(d.item.name);
        setNotes(d.item.notes ?? "");
        setMinQuantity(d.item.minQuantity == null ? "" : String(d.item.minQuantity));
        setPrice(d.item.price == null ? "" : String(d.item.price));
        setUnitId(d.item.unitId ?? d.item.unit.id ?? lookups.units[0]?.id ?? "");
        setProductLink(d.item.productLink ?? "");
        setItemTags(d.item.tags.map((row) => row.tag.name));
        setCustom(valuesFromStored(itemFields, d.item.customValues));
        setLoadError("");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load item"));
  }, [id]);

  if (loadError && !data) return <div className="p-8 text-danger">{loadError}</div>;
  if (!data) return <ItemDetailSkeleton />;

  const { item } = data;
  const actionTarget: ItemActionTarget = {
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    price: item.price,
    productLink: item.productLink,
    unit: item.unit,
  };

  async function save() {
    setSaveError("");
    setPending(true);
    try {
      for (const field of fields) validateFieldValue(field, custom[field.id] ?? "");
      await api(`/api/v1/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          notes,
          minQuantity: minQuantity === "" ? null : Number(minQuantity),
          price: price === "" ? null : Number(price),
          unitId: unitId || undefined,
          productLink: productLink.trim() || null,
          tags: itemTags,
          customValues: toCustomValuePayloads(fields, custom),
        }),
        toast: "Item saved",
      });
      router.push(`/item/${id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save item");
    } finally {
      setPending(false);
    }
  }

  async function reloadItem() {
    const d = await api<ItemPayload>(`/api/v1/items/${id}`);
    setData(d);
  }

  return (
    <ItemPageShell>
      <header className="border-b border-[#e6ebe8] bg-white px-6 py-5 lg:px-8">
        <div className="text-[13px] text-[#8a9a93]">
          <Link href="/items" className="hover:text-primary">
            All Items
          </Link>
          <span className="mx-1.5">›</span>
          <Link href={`/folder/${item.folder.id}/content`} className="hover:text-primary">
            {item.folder.name}
          </Link>
          <span className="mx-1.5">›</span>
          <Link href={`/item/${item.id}`} className="hover:text-primary">
            {item.name}
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[12px] text-[#8a9a93]">
              {item.sid} · Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
            </div>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#1c2b25]">Edit Item</h1>
          </div>
          <div className="flex gap-2">
            <ItemSecondaryButton onClick={() => router.push(`/item/${id}`)}>Cancel</ItemSecondaryButton>
            <ItemPrimaryButton onClick={() => void save()} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </ItemPrimaryButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 p-6 lg:p-8">
        <section className="rounded-xl border border-[#e6ebe8] bg-white p-5 shadow-sm">
          <Field label="Name *">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Quantity">
              <div className="flex items-center gap-2">
                <Input readOnly value={`${item.quantity} ${item.unit.abbreviation}`} />
                <Button type="button" variant="secondary" size="sm" onClick={() => setQtyOpen(true)}>
                  Update
                </Button>
              </div>
            </Field>
            <Field label="Unit of Measure">
              <select className="h-11 w-full rounded-lg border border-[#d8dfdb] px-3 text-sm" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Min Level">
              <Input type="number" min={0} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
            </Field>
            <Field label="Price">
              <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-[#e6ebe8] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-semibold text-[#1c2b25]">Product Information</h2>
          <div className="space-y-4">
            <Field label="Tags">
              <TagInput value={itemTags} onChange={setItemTags} />
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[#8a9a93]">QR & Barcode</p>
              <div className="flex flex-wrap gap-3">
                {(item.barcodes.length ? item.barcodes : [{ id: "sid", value: item.sid, symbology: "QR", slot: 1 }]).map((code) => (
                  <div key={code.id} className="rounded-lg border border-[#e6ebe8] px-3 py-2">
                    <BarcodeMark value={code.value} symbology={code.symbology} height={40} />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setQrOpen(true)} className="mt-2 text-sm font-semibold text-primary hover:underline">
                Add QR / Barcode
              </button>
            </div>
            <Field label="Product Link">
              <Input placeholder="Add link here" value={productLink} onChange={(e) => setProductLink(e.target.value)} />
            </Field>
            {fields.map((field) => (
              <Field key={field.id} label={field.name}>
                <CustomFieldControl field={field} value={custom[field.id] ?? ""} onChange={(next) => setCustom((c) => ({ ...c, [field.id]: next }))} />
              </Field>
            ))}
          </div>
          {saveError ? <p className="mt-4 text-sm text-danger">{saveError}</p> : null}
        </section>
      </div>

      <AddQrBarcodeModal
        open={qrOpen}
        startOnLink={item.barcodes.some((row) => row.slot === 1)}
        existingSid={item.sid}
        onClose={() => setQrOpen(false)}
        onAdd={async (code) => {
          if (code.role === "native") {
            await api("/api/v1/barcodes", {
              method: "POST",
              body: JSON.stringify({ action: "native", itemId: item.id, symbology: code.symbology }),
              toast: "QR / barcode added",
            });
          } else {
            await api("/api/v1/barcodes", {
              method: "POST",
              body: JSON.stringify({ action: "link", itemId: item.id, value: code.value, symbology: code.symbology }),
              toast: "QR / barcode linked",
            });
          }
          setQrOpen(false);
          await reloadItem();
        }}
      />
      {qtyOpen ? (
        <UpdateQuantityModal
          item={actionTarget}
          onClose={() => setQtyOpen(false)}
          onSaved={async () => {
            setQtyOpen(false);
            await reloadItem();
          }}
        />
      ) : null}
    </ItemPageShell>
  );
}
