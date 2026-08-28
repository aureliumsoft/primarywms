import { Prisma } from "@primarywms/db";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { getFolderAccessMap } from "./auth";
import { serializeItem } from "./inventory";
import { ancestors, subtreeIds } from "./folder-path";
import { formatCustomValue } from "./custom-field-values";

export type SearchInput = {
  names?: string[];
  sid?: string;
  tags?: string[];
  barcode?: string;
  notes?: string;
  minMode?: string;
  qtyMin?: string;
  qtyMax?: string;
  qtyExact?: boolean;
  priceMin?: string;
  priceMax?: string;
  priceExact?: boolean;
  unitId?: string;
  qtyAlerts?: string;
  dateAlerts?: string;
  dateAlertFieldId?: string;
  folderIds?: string[];
  sort?: string;
  group?: boolean;
  custom?: { fieldId: string; value: string }[];
};

type FolderNode = { id: string; parentId: string | null; name: string };

function num(value?: string) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function customClause(fieldId: string, raw: string): Prisma.CustomFieldValueWhereInput | null {
  const value = raw.trim();
  if (!value) return null;
  if (value === "true" || value === "false") {
    return { fieldId, valueBool: value === "true" };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { fieldId, valueDate: new Date(`${value}T00:00:00.000Z`) };
  }
  const n = Number(value);
  if (value !== "" && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(value)) {
    return {
      fieldId,
      OR: [{ valueNum: n }, { valueText: { contains: value, mode: "insensitive" } }],
    };
  }
  return { fieldId, valueText: { contains: value, mode: "insensitive" } };
}

export async function searchFacets(user: AuthUser) {
  const access = await getFolderAccessMap(user);
  const folderFilter = access === "all" ? {} : { folderId: { in: [...access.keys()] } };
  const [nameRows, tags, units, fields] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, ...folderFilter },
      distinct: ["name"],
      select: { name: true },
      orderBy: { name: "asc" },
      take: 800,
    }),
    prisma.tag.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, abbreviation: true },
    }),
    prisma.customField.findMany({
      where: { organizationId: user.organizationId, appliesTo: { in: ["ITEM", "BOTH"] } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return {
    names: nameRows.map((row) => row.name),
    tags,
    units,
    fields,
  };
}

export async function runAdvancedSearch(user: AuthUser, input: SearchInput) {
  const access = await getFolderAccessMap(user);
  const folders = await prisma.folder.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    select: { id: true, parentId: true, name: true },
  });
  const and: Prisma.ItemWhereInput[] = [];
  if (access !== "all") and.push({ folderId: { in: [...access.keys()] } });

  if (input.folderIds?.length) {
    const expanded = new Set<string>();
    for (const id of input.folderIds) {
      for (const child of subtreeIds(folders, id)) expanded.add(child);
    }
    const allowed = access === "all" ? [...expanded] : [...expanded].filter((id) => access.has(id));
    if (allowed.length) and.push({ folderId: { in: allowed } });
  }

  if (input.names?.length) {
    and.push({
      OR: input.names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
    });
  }
  if (input.sid?.trim()) {
    and.push({ sid: { contains: input.sid.trim(), mode: "insensitive" } });
  }
  if (input.notes?.trim()) {
    and.push({ notes: { contains: input.notes.trim(), mode: "insensitive" } });
  }
  if (input.barcode?.trim()) {
    const code = input.barcode.trim();
    and.push({
      OR: [
        { sid: { contains: code, mode: "insensitive" } },
        { barcodes: { some: { value: { contains: code, mode: "insensitive" } } } },
      ],
    });
  }
  if (input.tags?.length) {
    and.push({
      AND: input.tags.map((tag) => ({
        tags: { some: { tag: { name: { equals: tag, mode: "insensitive" } } } },
      })),
    });
  }
  if (input.unitId) and.push({ unitId: input.unitId });
  if (input.qtyAlerts === "set") and.push({ alerts: { some: { kind: "QUANTITY" } } });
  if (input.qtyAlerts === "unset") and.push({ alerts: { none: { kind: "QUANTITY" } } });
  if (input.dateAlerts === "set") {
    and.push({
      alerts: {
        some: {
          kind: "DATE",
          ...(input.dateAlertFieldId ? { fieldId: input.dateAlertFieldId } : {}),
        },
      },
    });
  }
  if (input.dateAlerts === "unset") and.push({ alerts: { none: { kind: "DATE" } } });
  for (const row of input.custom ?? []) {
    const clause = customClause(row.fieldId, row.value);
    if (clause) and.push({ customValues: { some: clause } });
  }

  const where: Prisma.ItemWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    ...(and.length ? { AND: and } : {}),
  };

  const orderBy: Prisma.ItemOrderByWithRelationInput =
    input.sort === "name"
      ? { name: "asc" }
      : input.sort === "quantity"
        ? { quantity: "desc" }
        : input.sort === "price"
          ? { price: "desc" }
          : { updatedAt: "desc" };

  const items = await prisma.item.findMany({
    where,
    take: 2000,
    orderBy,
    include: {
      unit: true,
      folder: { select: { id: true, name: true, parentId: true } },
      photos: { take: 1, orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
      customValues: { include: { field: true } },
      barcodes: { orderBy: { slot: "asc" } },
    },
  });

  const qtyMin = num(input.qtyMin);
  const qtyMax = num(input.qtyMax);
  const priceMin = num(input.priceMin);
  const priceMax = num(input.priceMax);

  const filtered = items.filter((item) => {
    const qty = Number(item.quantity);
    const price = Number(item.price ?? 0);
    if (input.qtyExact && qtyMin != null && qty !== qtyMin) return false;
    if (!input.qtyExact) {
      if (qtyMin != null && qty < qtyMin) return false;
      if (qtyMax != null && qty > qtyMax) return false;
    }
    if (input.priceExact && priceMin != null && price !== priceMin) return false;
    if (!input.priceExact) {
      if (priceMin != null && price < priceMin) return false;
      if (priceMax != null && price > priceMax) return false;
    }
    if (input.minMode === "below") return item.minQuantity != null && qty < Number(item.minQuantity);
    if (input.minMode === "at_or_below") return item.minQuantity != null && qty <= Number(item.minQuantity);
    if (input.minMode === "above") return item.minQuantity != null && qty > Number(item.minQuantity);
    if (input.minMode === "with") return item.minQuantity != null;
    if (input.minMode === "without") return item.minQuantity == null;
    return true;
  });

  const hidePrices = user.role.hidePrices;
  const mapped = filtered.map((item) => serializeSearchItem(item, folders, hidePrices));

  if (!input.group) return { items: mapped, total: mapped.length, grouped: false };

  const groups = new Map<string, typeof mapped>();
  for (const item of mapped) {
    const list = groups.get(item.sid) ?? [];
    list.push(item);
    groups.set(item.sid, list);
  }
  const grouped = [...groups.values()].map((members) => {
    const representative = members[0];
    const groupedQty = members.reduce((sum, row) => sum + row.quantity, 0);
    const groupedValue = members.reduce((sum, row) => sum + row.totalValue, 0);
    return {
      ...representative,
      groupedCount: members.length,
      groupedQty,
      totalValue: hidePrices ? 0 : groupedValue,
      path: members.length > 1 ? `${members.length} locations` : representative.path,
    };
  });
  return { items: grouped, total: grouped.length, grouped: true };
}

function serializeSearchItem(
  item: {
    id: string;
    name: string;
    sid: string;
    quantity: unknown;
    minQuantity: unknown;
    price: unknown;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    folderId: string;
    unit: { name: string; abbreviation: string } | null;
    folder: { id: string; name: string; parentId: string | null };
    photos: { id: string; publicUrl?: string | null }[];
    tags: { tag: { name: string } }[];
    customValues: {
      fieldId: string;
      valueText: string | null;
      valueDate: Date | null;
      valueBool: boolean | null;
      valueNum: unknown;
      field: { id: string; name: string; type: string };
    }[];
  },
  folders: FolderNode[],
  hidePrices: boolean,
) {
  const row = serializeItem(item);
  const path = ancestors(folders, item.folderId)
    .map((folder) => folder.name)
    .join(" › ");
  return {
    ...row,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    folder: item.folder,
    path,
    totalValue: hidePrices ? 0 : row.totalValue,
    price: hidePrices ? null : row.price,
    hidePrices,
    customFields: item.customValues.map((value) => ({
      id: value.field.id,
      name: value.field.name,
      value: formatCustomValue(value.field, {
        fieldId: value.fieldId,
        valueText: value.valueText,
        valueDate: value.valueDate,
        valueBool: value.valueBool,
        valueNum: value.valueNum == null ? null : Number(value.valueNum),
      }),
    })),
  };
}
