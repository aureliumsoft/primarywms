import { Prisma, type TransactionType } from "@primarywms/db";
import * as XLSX from "xlsx";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { can, getFolderAccessMap } from "./auth";
import { subtreeIds } from "./folder-path";
import { toCsv } from "./csv";

export type ReportType =
  | "activity"
  | "inventory-summary"
  | "low-stock"
  | "transactions"
  | "item-flow"
  | "move-summary"
  | "user-activity"
  | "quantity-change";

export type ReportQuery = {
  type: ReportType;
  q?: string;
  from?: string;
  to?: string;
  action?: string;
  userId?: string;
  sid?: string;
  itemId?: string;
  folderId?: string;
  sourceFolderId?: string;
  destFolderId?: string;
  tag?: string;
  barcode?: string;
  group?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: "ASC" | "DESC";
  format?: "csv" | "xlsx";
};

type Access = Awaited<ReturnType<typeof getFolderAccessMap>>;

const EXPORT_CAP = 10_000;
const QTY_TYPES = ["QTY_ADD", "QTY_SUBTRACT", "QTY_SET"] as const;
const TXN_LEDGER = ["QTY_ADD", "QTY_SUBTRACT", "QTY_SET", "MOVE", "MERGE", "ITEM_CREATED"] as const;
const FLOW_TYPES = ["QTY_ADD", "QTY_SUBTRACT", "QTY_SET", "MOVE", "MERGE"] as const;

const ACTION_GROUPS: Record<string, readonly string[]> = {
  moved: ["MOVE"],
  edited: ["ITEM_EDITED", "FOLDER_EDITED", "BULK_EDIT"],
  deleted: ["ITEM_DELETED", "FOLDER_DELETED"],
  created: ["ITEM_CREATED", "FOLDER_CREATED", "CLONE"],
  restored: ["ITEM_RESTORED", "FOLDER_RESTORED"],
  quantity: QTY_TYPES,
  merged: ["MERGE"],
};

const TXN_GROUPS: Record<string, readonly string[]> = {
  move: ["MOVE"],
  quantity: QTY_TYPES,
  create: ["ITEM_CREATED"],
  delete: ["ITEM_DELETED"],
  merge: ["MERGE"],
};

function txnTypes(types: readonly string[]): TransactionType[] {
  return types as unknown as TransactionType[];
}

export function assertReports(user: AuthUser) {
  if (!can(user, "reports")) throw new Error("FORBIDDEN");
}

function folderIds(access: Access) {
  if (access === "all") return null;
  return [...access.keys()];
}

function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
  };
}

function txnAccessWhere(ids: string[] | null): Prisma.InventoryTransactionWhereInput {
  if (!ids) return {};
  return {
    OR: [{ folderId: { in: ids } }, { fromFolderId: { in: ids } }, { toFolderId: { in: ids } }, { item: { folderId: { in: ids } } }],
  };
}

function itemAccessWhere(ids: string[] | null): Prisma.ItemWhereInput {
  if (!ids) return {};
  return { folderId: { in: ids } };
}

async function expandFolder(organizationId: string, folderId?: string) {
  if (!folderId) return null;
  const folders = await prisma.folder.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, parentId: true },
  });
  return subtreeIds(folders, folderId);
}

function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total, page, pageSize };
}

function sortDir(dir?: "ASC" | "DESC") {
  return dir === "ASC" ? 1 : -1;
}

function cmp(a: string | number | null | undefined, b: string | number | null | undefined, dir: number) {
  const av = a ?? "";
  const bv = b ?? "";
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * dir;
}

function who(user?: { firstName: string; lastName: string } | null) {
  if (!user) return "Someone";
  return `${user.firstName} ${user.lastName}`.trim() || "Someone";
}

function itemLabel(item?: { name: string; sid: string } | null) {
  if (!item) return "an item";
  return item.sid || item.name;
}

export function activityTypeLabel(type: string) {
  const map: Record<string, string> = {
    ITEM_CREATED: "Create Item",
    ITEM_DELETED: "Delete Item",
    ITEM_RESTORED: "Restore Item",
    ITEM_EDITED: "Edit Item",
    FOLDER_CREATED: "Create Folder",
    FOLDER_DELETED: "Delete Folder",
    FOLDER_RESTORED: "Restore Folder",
    FOLDER_EDITED: "Edit Folder",
    QTY_ADD: "Update Quantity",
    QTY_SUBTRACT: "Update Quantity",
    QTY_SET: "Update Quantity",
    MOVE: "Move Item",
    MERGE: "Merge Item",
    CLONE: "Clone Item",
    BULK_EDIT: "Edit Item",
  };
  return map[type] ?? type.replaceAll("_", " ");
}

export function activitySentence(row: {
  type: string;
  qtyDelta?: number | null;
  item?: { name: string; sid: string } | null;
  folder?: { name: string } | null;
  fromFolder?: { name: string } | null;
  toFolder?: { name: string } | null;
  user?: { firstName: string; lastName: string } | null;
  reason?: string | null;
}) {
  const actor = who(row.user);
  const target = row.item ? itemLabel(row.item) : row.folder?.name ?? "a folder";
  const qty = Math.abs(Number(row.qtyDelta ?? 0));
  switch (row.type) {
    case "MOVE":
      return `${actor} moved ${qty || ""} ${qty ? "units of " : ""}${target} from ${row.fromFolder?.name ?? "a folder"} to ${row.toFolder?.name ?? "a folder"}`.replace(
        "  ",
        " ",
      );
    case "QTY_ADD":
      return `${actor} added ${qty} to ${target}`;
    case "QTY_SUBTRACT":
      return `${actor} subtracted ${qty} from ${target}`;
    case "QTY_SET":
      return `${actor} set quantity of ${target}`;
    case "ITEM_CREATED":
    case "FOLDER_CREATED":
      return `${actor} created ${target}`;
    case "ITEM_DELETED":
    case "FOLDER_DELETED":
      return `${actor} deleted ${target}`;
    case "ITEM_RESTORED":
    case "FOLDER_RESTORED":
      return `${actor} restored ${target}`;
    case "ITEM_EDITED":
    case "FOLDER_EDITED":
    case "BULK_EDIT":
      return `${actor} updated ${target}`;
    case "CLONE":
      return `${actor} cloned ${target}`;
    case "MERGE":
      return `${actor} merged ${target}`;
    default:
      return `${actor} ${activityTypeLabel(row.type).toLowerCase()} ${target}`;
  }
}

function txnTypeLabel(type: string) {
  if (type === "MOVE") return "Move";
  if (type.startsWith("QTY_")) return "Update Quantity";
  if (type === "ITEM_CREATED") return "Create";
  if (type === "ITEM_DELETED") return "Delete";
  if (type === "MERGE") return "Merge";
  return activityTypeLabel(type);
}

export async function runReport(user: AuthUser, query: ReportQuery) {
  assertReports(user);
  const access = await getFolderAccessMap(user);
  const ids = folderIds(access);
  const hidePrices = user.role.hidePrices;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.format ? EXPORT_CAP : Math.min(100, Math.max(1, query.pageSize ?? 20));
  const createdAt = dateRange(query.from, query.to);
  const q = query.q?.trim() ?? "";
  const folderScope = await expandFolder(user.organizationId, query.folderId);

  switch (query.type) {
    case "inventory-summary":
    case "low-stock":
      return inventorySummary(user, { ...query, page, pageSize, ids, folderScope, hidePrices, lowStock: query.type === "low-stock" });
    case "item-flow":
      return itemFlow(user, { ...query, page, pageSize, ids, createdAt, folderScope, hidePrices });
    case "quantity-change":
      return quantityChange(user, { ...query, page, pageSize, ids, createdAt, folderScope });
    case "move-summary":
      return moveSummary(user, { ...query, page, pageSize, ids, createdAt, hidePrices });
    case "user-activity":
      return userActivity(user, { ...query, page, pageSize, ids, createdAt });
    case "transactions":
      return transactions(user, { ...query, page, pageSize, ids, createdAt, folderScope, hidePrices, q });
    default:
      return activityHistory(user, { ...query, page, pageSize, ids, createdAt, folderScope, q });
  }
}

export function reportFile(headers: string[], rows: Array<Array<string | number | null | undefined>>, filename: string, format: "csv" | "xlsx") {
  if (format === "csv") {
    return { bytes: Buffer.from(toCsv([headers, ...rows]), "utf8"), filename: `${filename}.csv`, mime: "text/csv;charset=utf-8" };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), "Report");
  return {
    bytes: Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer),
    filename: `${filename}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

async function activityHistory(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; createdAt?: Prisma.DateTimeFilter; folderScope: string[] | null; q: string; page: number; pageSize: number },
) {
  const types = ACTION_GROUPS[query.action ?? ""] ?? (query.action ? [query.action as TransactionType] : undefined);
  const extra: Prisma.InventoryTransactionWhereInput[] = [];
  if (query.folderScope) extra.push({ OR: [{ folderId: { in: query.folderScope } }, { item: { folderId: { in: query.folderScope } } }] });
  if (query.q) {
    extra.push({
      OR: [
        { item: { name: { contains: query.q, mode: "insensitive" } } },
        { item: { sid: { contains: query.q, mode: "insensitive" } } },
        { folder: { name: { contains: query.q, mode: "insensitive" } } },
        { reason: { contains: query.q, mode: "insensitive" } },
        { user: { firstName: { contains: query.q, mode: "insensitive" } } },
        { user: { lastName: { contains: query.q, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.InventoryTransactionWhereInput = {
    organizationId: user.organizationId,
    ...txnAccessWhere(query.ids),
    ...(types ? { type: { in: txnTypes(types) } } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.sid ? { item: { sid: { contains: query.sid, mode: "insensitive" } } } : {}),
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.createdAt ? { createdAt: query.createdAt } : {}),
    ...(extra.length ? { AND: extra } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: query.dir === "ASC" ? "asc" : "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        item: { select: { id: true, name: true, sid: true } },
        folder: { select: { id: true, name: true } },
        fromFolder: { select: { name: true } },
        toFolder: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      type: row.type,
      typeLabel: activityTypeLabel(row.type),
      activity: activitySentence({
        ...row,
        qtyDelta: row.qtyDelta == null ? null : Number(row.qtyDelta),
      }),
      qtyDelta: row.qtyDelta == null ? null : Number(row.qtyDelta),
      qtyMoved: row.type === "MOVE" && row.qtyDelta != null ? Math.abs(Number(row.qtyDelta)) : null,
      qtyBefore: row.qtyBefore == null ? null : Number(row.qtyBefore),
      qtyAfter: row.qtyAfter == null ? null : Number(row.qtyAfter),
      reason: row.reason,
      note: row.note,
      item: row.item,
      folder: row.folder,
      fromFolder: row.fromFolder,
      toFolder: row.toFolder,
      user: row.user,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

async function transactions(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; createdAt?: Prisma.DateTimeFilter; folderScope: string[] | null; hidePrices: boolean; q: string; page: number; pageSize: number },
) {
  const types = TXN_GROUPS[query.action ?? ""] ?? (query.action ? [query.action as TransactionType] : TXN_LEDGER);
  const extra: Prisma.InventoryTransactionWhereInput[] = [];
  if (query.folderScope) extra.push({ OR: [{ folderId: { in: query.folderScope } }, { item: { folderId: { in: query.folderScope } } }] });
  if (query.tag) extra.push({ item: { tags: { some: { tag: { name: { equals: query.tag, mode: "insensitive" } } } } } });
  if (query.barcode) {
    extra.push({
      item: {
        OR: [
          { sid: { contains: query.barcode, mode: "insensitive" } },
          { barcodes: { some: { value: { contains: query.barcode, mode: "insensitive" } } } },
        ],
      },
    });
  }
  if (query.q) {
    extra.push({
      OR: [
        { item: { name: { contains: query.q, mode: "insensitive" } } },
        { item: { sid: { contains: query.q, mode: "insensitive" } } },
        { item: { barcodes: { some: { value: { contains: query.q, mode: "insensitive" } } } } },
        { folder: { name: { contains: query.q, mode: "insensitive" } } },
        { note: { contains: query.q, mode: "insensitive" } },
        { reason: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.InventoryTransactionWhereInput = {
    organizationId: user.organizationId,
    type: { in: txnTypes(types) },
    ...txnAccessWhere(query.ids),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.sid ? { item: { sid: { contains: query.sid, mode: "insensitive" } } } : {}),
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.createdAt ? { createdAt: query.createdAt } : {}),
    ...(extra.length ? { AND: extra } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: query.dir === "ASC" ? "asc" : "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sid: true,
            price: true,
            productLink: true,
            unit: { select: { name: true, abbreviation: true } },
          },
        },
        folder: { select: { id: true, name: true } },
        fromFolder: { select: { name: true } },
        toFolder: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);
  return {
    hidePrices: query.hidePrices,
    rows: rows.map((row) => {
      const qty = row.qtyDelta == null ? null : Number(row.qtyDelta);
      const price = query.hidePrices ? null : row.item?.price == null ? null : Number(row.item.price);
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        type: row.type,
        typeLabel: txnTypeLabel(row.type),
        qtyDelta: qty,
        reason: row.reason,
        note: row.note,
        item: row.item ? { id: row.item.id, name: row.item.name, sid: row.item.sid, productLink: row.item.productLink } : null,
        unit: row.item?.unit ?? null,
        folder: row.folder,
        fromFolder: row.fromFolder,
        toFolder: row.toFolder,
        user: row.user,
        price,
        value: query.hidePrices || qty == null || price == null ? null : Math.abs(qty) * price,
      };
    }),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

async function inventorySummary(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; folderScope: string[] | null; hidePrices: boolean; page: number; pageSize: number; lowStock?: boolean },
) {
  const where: Prisma.ItemWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    ...itemAccessWhere(query.ids),
    ...(query.folderScope ? { folderId: { in: query.folderScope } } : {}),
    ...(query.tag ? { tags: { some: { tag: { name: { equals: query.tag, mode: "insensitive" } } } } } : {}),
    ...(query.sid ? { sid: { contains: query.sid, mode: "insensitive" } } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { sid: { contains: query.q, mode: "insensitive" } },
            { barcodes: { some: { value: { contains: query.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(query.lowStock ? { minQuantity: { not: null } } : {}),
  };
  const items = await prisma.item.findMany({
    where,
    include: {
      unit: { select: { name: true, abbreviation: true } },
      folder: { select: { id: true, name: true } },
    },
  });
  let rows = items
    .map((item) => {
      const quantity = Number(item.quantity);
      const minQuantity = item.minQuantity == null ? null : Number(item.minQuantity);
      const price = query.hidePrices ? null : item.price == null ? null : Number(item.price);
      return {
        id: item.id,
        name: item.name,
        sid: item.sid,
        quantity,
        minQuantity,
        price,
        totalValue: query.hidePrices ? 0 : quantity * (price ?? 0),
        folder: item.folder,
        unit: item.unit,
        locations: 1,
      };
    })
    .filter((row) => (query.lowStock ? row.minQuantity != null && row.quantity <= row.minQuantity : true));

  if (query.group) {
    const map = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const cur = map.get(row.sid);
      if (!cur) {
        map.set(row.sid, { ...row, locations: 1 });
        continue;
      }
      cur.quantity += row.quantity;
      cur.totalValue += row.totalValue;
      cur.locations += 1;
      if (cur.minQuantity != null && row.minQuantity != null) cur.minQuantity += row.minQuantity;
    }
    rows = [...map.values()].map((row) => ({
      ...row,
      folder: row.locations > 1 ? { id: "", name: `${row.locations} locations` } : row.folder,
    }));
  }

  const dir = sortDir(query.dir);
  const sort = query.sort || "name";
  rows.sort((a, b) => {
    if (sort === "quantity") return cmp(a.quantity, b.quantity, dir);
    if (sort === "minQuantity") return cmp(a.minQuantity, b.minQuantity, dir);
    if (sort === "price") return cmp(a.price, b.price, dir);
    if (sort === "totalValue") return cmp(a.totalValue, b.totalValue, dir);
    if (sort === "folder") return cmp(a.folder.name, b.folder.name, dir);
    return cmp(a.name, b.name, dir);
  });

  const paged = paginate(rows, query.page, query.pageSize);
  return { ...paged, hidePrices: query.hidePrices, grouped: Boolean(query.group) };
}

async function itemFlow(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; createdAt?: Prisma.DateTimeFilter; folderScope: string[] | null; hidePrices: boolean; page: number; pageSize: number },
) {
  const extra: Prisma.InventoryTransactionWhereInput[] = [];
  if (query.folderScope) extra.push({ OR: [{ folderId: { in: query.folderScope } }, { item: { folderId: { in: query.folderScope } } }] });
  if (query.q) {
    extra.push({
      OR: [{ item: { name: { contains: query.q, mode: "insensitive" } } }, { item: { sid: { contains: query.q, mode: "insensitive" } } }],
    });
  }
  const rows = await prisma.inventoryTransaction.findMany({
    where: {
      organizationId: user.organizationId,
      type: { in: txnTypes(FLOW_TYPES) },
      ...txnAccessWhere(query.ids),
      ...(query.createdAt ? { createdAt: query.createdAt } : {}),
      ...(query.sid ? { item: { sid: { contains: query.sid, mode: "insensitive" } } } : {}),
    ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(extra.length ? { AND: extra } : {}),
    },
    include: { item: { select: { id: true, name: true, sid: true, folder: { select: { id: true, name: true } } } } },
  });
  const map = new Map<
    string,
    { itemId: string; name: string; sid: string; folder: string; folderId: string; increases: number; decreases: number; net: number; count: number; locations: Set<string> }
  >();
  for (const row of rows) {
    if (!row.item) continue;
    const key = query.group ? row.item.sid : row.item.id;
    const cur = map.get(key) ?? {
      itemId: row.item.id,
      name: row.item.name,
      sid: row.item.sid,
      folder: row.item.folder.name,
      folderId: row.item.folder.id,
      increases: 0,
      decreases: 0,
      net: 0,
      count: 0,
      locations: new Set<string>(),
    };
    const delta = Number(row.qtyDelta ?? 0);
    if (delta > 0) cur.increases += delta;
    if (delta < 0) cur.decreases += delta;
    cur.net += delta;
    cur.count += 1;
    cur.locations.add(row.item.folder.id);
    map.set(key, cur);
  }
  let list = [...map.values()].map((row) => ({
    itemId: row.itemId,
    name: row.name,
    sid: row.sid,
    folder: row.locations.size > 1 ? `${row.locations.size} locations` : row.folder,
    folderId: row.locations.size > 1 ? "" : row.folderId,
    increases: row.increases,
    decreases: row.decreases,
    net: row.net,
    count: row.count,
    locations: row.locations.size,
  }));
  const dir = sortDir(query.dir);
  const sort = query.sort || "net";
  list.sort((a, b) => {
    if (sort === "name") return cmp(a.name, b.name, dir);
    if (sort === "folder") return cmp(a.folder, b.folder, dir);
    if (sort === "increases") return cmp(a.increases, b.increases, dir);
    if (sort === "decreases") return cmp(a.decreases, b.decreases, dir);
    if (sort === "count") return cmp(a.count, b.count, dir);
    return cmp(Math.abs(a.net), Math.abs(b.net), dir);
  });
  return paginate(list, query.page, query.pageSize);
}

async function quantityChange(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; createdAt?: Prisma.DateTimeFilter; folderScope: string[] | null; page: number; pageSize: number },
) {
  const flow = await itemFlow(user, { ...query, group: true, hidePrices: true });
  return {
    ...flow,
    rows: flow.rows.map((row) => ({ itemId: row.itemId, name: row.name, sid: row.sid, delta: row.net, count: row.count })),
  };
}

async function moveSummary(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; createdAt?: Prisma.DateTimeFilter; hidePrices: boolean; page: number; pageSize: number },
) {
  const sourceScope = await expandFolder(user.organizationId, query.sourceFolderId);
  const destScope = await expandFolder(user.organizationId, query.destFolderId);
  const rows = await prisma.inventoryTransaction.findMany({
    where: {
      organizationId: user.organizationId,
      type: "MOVE",
      qtyDelta: { lt: 0 },
      ...txnAccessWhere(query.ids),
      ...(query.createdAt ? { createdAt: query.createdAt } : {}),
      ...(sourceScope ? { fromFolderId: { in: sourceScope } } : {}),
      ...(destScope ? { toFolderId: { in: destScope } } : {}),
      ...(query.q
        ? {
            OR: [
              { fromFolder: { name: { contains: query.q, mode: "insensitive" } } },
              { toFolder: { name: { contains: query.q, mode: "insensitive" } } },
              { item: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      item: { select: { id: true, price: true } },
      fromFolder: { select: { id: true, name: true } },
      toFolder: { select: { id: true, name: true } },
    },
  });
  const map = new Map<
    string,
    { fromId: string; from: string; destinations: Record<string, { name: string; qty: number; items: number }>; items: Set<string>; qty: number; count: number; value: number }
  >();
  for (const row of rows) {
    const fromId = row.fromFolderId ?? "unknown";
    const fromName = row.fromFolder?.name ?? "Unknown";
    const toName = row.toFolder?.name ?? "Unknown";
    const qty = Math.abs(Number(row.qtyDelta ?? 0));
    const cur = map.get(fromId) ?? {
      fromId,
      from: fromName,
      destinations: {},
      items: new Set<string>(),
      qty: 0,
      count: 0,
      value: 0,
    };
    cur.destinations[toName] = cur.destinations[toName] ?? { name: toName, qty: 0, items: 0 };
    cur.destinations[toName].qty += qty;
    cur.destinations[toName].items += 1;
    if (row.itemId) cur.items.add(row.itemId);
    cur.qty += qty;
    cur.count += 1;
    cur.value += query.hidePrices ? 0 : qty * Number(row.item?.price ?? 0);
    map.set(fromId, cur);
  }
  let list = [...map.values()].map((row) => {
    const dests = Object.values(row.destinations);
    return {
      fromId: row.fromId,
      from: row.from,
      destCount: dests.length,
      destLabel: dests.length === 1 ? dests[0].name : `${dests.length} destinations`,
      destinations: dests,
      items: row.items.size,
      qty: row.qty,
      count: row.count,
      value: query.hidePrices ? 0 : row.value,
    };
  });
  const dir = sortDir(query.dir);
  const sort = query.sort || "items";
  list.sort((a, b) => {
    if (sort === "from") return cmp(a.from, b.from, dir);
    if (sort === "qty") return cmp(a.qty, b.qty, dir);
    if (sort === "value") return cmp(a.value, b.value, dir);
    return cmp(a.items, b.items, dir);
  });
  const stats = {
    sources: list.length,
    destinations: new Set(list.flatMap((row) => row.destinations.map((d) => d.name))).size,
    items: list.reduce((s, r) => s + r.items, 0),
    quantity: list.reduce((s, r) => s + r.qty, 0),
    value: query.hidePrices ? 0 : list.reduce((s, r) => s + r.value, 0),
  };
  return { ...paginate(list, query.page, query.pageSize), stats, hidePrices: query.hidePrices };
}

async function userActivity(
  user: AuthUser,
  query: ReportQuery & { ids: string[] | null; createdAt?: Prisma.DateTimeFilter; page: number; pageSize: number },
) {
  const rows = await prisma.inventoryTransaction.findMany({
    where: {
      organizationId: user.organizationId,
      ...txnAccessWhere(query.ids),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.createdAt ? { createdAt: query.createdAt } : {}),
      ...(query.q
        ? {
            OR: [
              { user: { firstName: { contains: query.q, mode: "insensitive" } } },
              { user: { lastName: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
  const map = new Map<
    string,
    { userId: string; name: string; moves: number; updates: number; creates: number; deletes: number; restores: number; clones: number; merges: number; total: number }
  >();
  for (const row of rows) {
    const id = row.user?.id ?? "system";
    const name = row.user ? `${row.user.firstName} ${row.user.lastName}`.trim() : "System";
    const cur = map.get(id) ?? {
      userId: id,
      name,
      moves: 0,
      updates: 0,
      creates: 0,
      deletes: 0,
      restores: 0,
      clones: 0,
      merges: 0,
      total: 0,
    };
    if (row.type === "MOVE") cur.moves += 1;
    else if (row.type.startsWith("QTY_") || row.type === "ITEM_EDITED" || row.type === "FOLDER_EDITED" || row.type === "BULK_EDIT") cur.updates += 1;
    else if (row.type === "ITEM_CREATED" || row.type === "FOLDER_CREATED") cur.creates += 1;
    else if (row.type.includes("DELETED")) cur.deletes += 1;
    else if (row.type.includes("RESTORED")) cur.restores += 1;
    else if (row.type === "CLONE") cur.clones += 1;
    else if (row.type === "MERGE") cur.merges += 1;
    cur.total += 1;
    map.set(id, cur);
  }
  let list = [...map.values()];
  if (query.q) {
    const needle = query.q.toLowerCase();
    list = list.filter((row) => row.name.toLowerCase().includes(needle));
  }
  const dir = sortDir(query.dir);
  const sort = query.sort || "total";
  list.sort((a, b) => cmp((a as never)[sort] ?? a.total, (b as never)[sort] ?? b.total, dir));
  const stats = {
    users: list.length,
    moved: list.reduce((s, r) => s + r.moves, 0),
    updated: list.reduce((s, r) => s + r.updates, 0),
    created: list.reduce((s, r) => s + r.creates, 0),
    deleted: list.reduce((s, r) => s + r.deletes, 0),
    restored: list.reduce((s, r) => s + r.restores, 0),
    cloned: list.reduce((s, r) => s + r.clones, 0),
    merged: list.reduce((s, r) => s + r.merges, 0),
  };
  return { ...paginate(list, query.page, query.pageSize), stats };
}

type Cell = string | number | null | undefined;

export function tableForExport(type: ReportType, data: Record<string, unknown>, hidePrices: boolean): { headers: string[]; rows: Cell[][]; filename: string } {
  const rows = (data.rows as Record<string, unknown>[]) ?? [];
  if (type === "activity") {
    return {
      filename: "activity-history",
      headers: ["When", "Activity type", "Activity", "SID", "Folder", "User", "Qty", "Reason"],
      rows: rows.map((r) => [
        String(r.createdAt ?? ""),
        String(r.typeLabel ?? r.type ?? ""),
        String(r.activity ?? ""),
        (r.item as { sid?: string } | null)?.sid,
        (r.folder as { name?: string } | null)?.name,
        r.user ? `${(r.user as { firstName: string }).firstName} ${(r.user as { lastName: string }).lastName}` : "",
        r.qtyDelta as number | null,
        r.reason as string | null,
      ]),
    };
  }
  if (type === "transactions") {
    return {
      filename: "transactions",
      headers: hidePrices
        ? ["When", "Name", "SID", "Qty change", "Type", "Folder", "User", "Reason", "Notes"]
        : ["When", "Name", "SID", "Qty change", "Type", "Folder", "User", "Price", "Value", "Reason", "Notes"],
      rows: rows.map((r) => {
        const item = r.item as { name?: string; sid?: string } | null;
        const base: Cell[] = [
          String(r.createdAt ?? ""),
          item?.name,
          item?.sid,
          r.qtyDelta as number | null,
          String(r.typeLabel ?? ""),
          (r.folder as { name?: string } | null)?.name,
          r.user ? `${(r.user as { firstName: string }).firstName} ${(r.user as { lastName: string }).lastName}` : "",
        ];
        if (!hidePrices) base.push(r.price as number | null, r.value as number | null);
        base.push(r.reason as string | null, r.note as string | null);
        return base;
      }),
    };
  }
  if (type === "inventory-summary" || type === "low-stock") {
    return {
      filename: type,
      headers: hidePrices ? ["Name", "SID", "Folder", "Qty", "Min"] : ["Name", "SID", "Folder", "Qty", "Min", "Price", "Value"],
      rows: rows.map((r) => {
        const line: Cell[] = [r.name as string, r.sid as string, (r.folder as { name?: string })?.name, r.quantity as number, r.minQuantity as number | null];
        if (!hidePrices) line.push(r.price as number | null, r.totalValue as number);
        return line;
      }),
    };
  }
  if (type === "item-flow") {
    return {
      filename: "item-flow",
      headers: ["Name", "SID", "Folder", "Qty decrease", "Qty increase", "Net", "Transactions"],
      rows: rows.map((r) => [r.name as string, r.sid as string, r.folder as string, r.decreases as number, r.increases as number, r.net as number, r.count as number]),
    };
  }
  if (type === "quantity-change") {
    return {
      filename: "quantity-change",
      headers: ["Name", "SID", "Net change", "Transactions"],
      rows: rows.map((r) => [r.name as string, r.sid as string, r.delta as number, r.count as number]),
    };
  }
  if (type === "move-summary") {
    return {
      filename: "move-summary",
      headers: hidePrices
        ? ["Source", "Destination", "Items moved", "Quantity moved"]
        : ["Source", "Destination", "Items moved", "Quantity moved", "Value"],
      rows: rows.map((r) => {
        const line: Cell[] = [r.from as string, r.destLabel as string, r.items as number, r.qty as number];
        if (!hidePrices) line.push(r.value as number);
        return line;
      }),
    };
  }
  return {
    filename: "user-activity",
    headers: ["User", "Moves", "Updates", "Creates", "Deletes", "Restores", "Clones", "Merges", "Total"],
    rows: rows.map((r) => [
      r.name as string,
      r.moves as number,
      r.updates as number,
      r.creates as number,
      r.deletes as number,
      r.restores as number,
      r.clones as number,
      r.merges as number,
      r.total as number,
    ]),
  };
}
