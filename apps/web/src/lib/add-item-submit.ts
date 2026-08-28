import { api } from "@/lib/api";
import { toCustomValuePayloads, validateFieldValue, type CustomFieldDef } from "@/lib/custom-field-values";

export type CreateItemInput = {
  folderId: string;
  name: string;
  quantity: number;
  unitId: string;
  minQuantity: number | null;
  price: number | null;
  notes: string | null;
  productLink: string | null;
  tags: string[];
  customValues?: ReturnType<typeof toCustomValuePayloads>;
  sid?: string;
  nativeSymbology?: string;
  barcodes?: { value: string; symbology: string }[];
};

export function validateItemCustomFields(fields: CustomFieldDef[], custom: Record<string, string>) {
  for (const field of fields) validateFieldValue(field, custom[field.id] ?? "");
}

export function buildCreateItemBody(
  input: {
    folderId: string;
    name: string;
    quantity: string;
    unitId: string;
    minQuantity: string;
    price: string;
    notes: string;
    productLink: string;
    tags: string[];
    itemFields: CustomFieldDef[];
    custom: Record<string, string>;
    nativeCode: { value: string; symbology: string } | null;
    linkedCode: { value: string; symbology: string } | null;
  },
): CreateItemInput {
  return {
    folderId: input.folderId,
    name: input.name.trim(),
    quantity: Number(input.quantity),
    unitId: input.unitId,
    minQuantity: input.minQuantity === "" ? null : Number(input.minQuantity),
    price: input.price === "" ? null : Number(input.price),
    notes: input.notes.trim() || null,
    productLink: input.productLink.trim() || null,
    tags: input.tags,
    customValues: toCustomValuePayloads(input.itemFields, input.custom),
    sid: input.nativeCode?.value,
    nativeSymbology: input.nativeCode?.symbology,
    barcodes: input.linkedCode ? [input.linkedCode] : [],
  };
}

export async function createItemWithPhotos(body: CreateItemInput, photos: { file: File }[]) {
  const created = await api<{ item: { id: string } }>("/api/v1/items", {
    method: "POST",
    body: JSON.stringify(body),
  });
  for (const { file } of photos) {
    const form = new FormData();
    form.append("file", file);
    form.append("ownerType", "ITEM");
    form.append("ownerId", created.item.id);
    await api("/api/v1/photos", { method: "POST", body: form });
  }
  return created;
}
