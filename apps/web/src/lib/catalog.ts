import { PAGE_SIZE_DEFAULT } from "@primarywms/shared";
import { Prisma } from "@primarywms/db";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { getFolderAccessMap } from "./auth";
import { serializeItem } from "./inventory";
import { subtreeIds } from "./folder-path";

export type CatalogQuery = {
  folderId?: string | null;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: "ASC" | "DESC";
  groupItems?: boolean;
  view?: "GRID" | "LIST" | "TABLE";
};

export async function getRootFolder(organizationId: string) {
  const root = await prisma.folder.findFirst({
    where: { organizationId, parentId: null, deletedAt: null },
  });
  if (!root) throw new Error("All Items folder is missing");
  return root;
}

export async function getFolderTree(user: AuthUser) {
  const access = await getFolderAccessMap(user);
  const folders = await prisma.folder.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      parentId: true,
      name: true,
      sid: true,
      kind: true,
      jobStatus: true,
      updatedAt: true,
      job: { select: { id: true } },
      _count: { select: { items: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } } },
    },
  });
  const visible = access === "all" ? folders : folders.filter((f) => access.has(f.id));
  return visible.map((folder) => ({
    id: folder.id,
    parentId: folder.parentId,
    name: folder.name,
    sid: folder.sid,
    kind: folder.kind ?? "ITEM",
    jobStatus: folder.kind === "JOB" ? folder.jobStatus : null,
    jobId: folder.job?.id ?? null,
    updatedAt: folder.updatedAt.toISOString(),
    _count: folder._count,
  }));
}

function itemOrderBy(sort?: string, dir: "asc" | "desc" = "desc"): Prisma.ItemOrderByWithRelationInput {
  switch (sort) {
    case "NAME":
      return { name: dir };
    case "QUANTITY":
      return { quantity: dir };
    case "MIN_LEVEL":
      return { minQuantity: dir };
    case "PRICE":
      return { price: dir };
    default:
      return { updatedAt: dir };
  }
}

type SortableEntry = {
  kind: "folder" | "item";
  updatedAt: Date;
  data: {
    name?: string;
    quantity?: number;
    groupedQty?: number;
    minQuantity?: number | null;
    price?: number | null;
    totalValue?: number;
    value?: number;
    notes?: string | null;
    customValues?: {
      fieldId: string;
      field?: { name?: string } | null;
      valueText?: string | null;
      valueDate?: Date | string | null;
      valueNum?: unknown;
      valueBool?: boolean | null;
    }[];
  };
};

function fieldSortValue(entry: SortableEntry, sort: string): string | number {
  const row = entry.data.customValues?.find((value) => value.fieldId === sort || value.field?.name === sort);
  if (!row) return "";
  if (row.valueDate) return new Date(row.valueDate).getTime();
  if (row.valueNum != null && row.valueNum !== "") {
    const num = Number(row.valueNum);
    return Number.isFinite(num) ? num : "";
  }
  if (row.valueBool != null) return row.valueBool ? 1 : 0;
  return (row.valueText ?? "").toLowerCase();
}

function catalogSortValue(entry: SortableEntry, sort?: string): string | number {
  switch (sort || "UPDATED_AT") {
    case "NAME":
      return (entry.data.name ?? "").toLowerCase();
    case "QUANTITY":
      return Number(entry.kind === "item" ? (entry.data.groupedQty ?? entry.data.quantity ?? 0) : (entry.data.quantity ?? 0));
    case "MIN_LEVEL":
      return entry.kind === "folder" ? Number.NEGATIVE_INFINITY : Number(entry.data.minQuantity ?? 0);
    case "PRICE":
      return entry.kind === "folder" ? Number.NEGATIVE_INFINITY : Number(entry.data.price ?? 0);
    case "NOTES":
      return (entry.data.notes ?? "").toLowerCase();
    case "TOTAL_VALUE":
      return Number(entry.kind === "folder" ? (entry.data.value ?? 0) : (entry.data.totalValue ?? 0));
    case "UPDATED_AT":
      return new Date(entry.updatedAt).getTime();
    default:
      return fieldSortValue(entry, sort || "");
  }
}

function sortCatalogEntries<T extends SortableEntry>(entries: T[], sort?: string, dir: "asc" | "desc" = "desc"): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    const av = catalogSortValue(a, sort);
    const bv = catalogSortValue(b, sort);
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
    if (cmp !== 0) return cmp * sign;
    const nameCmp = (a.data.name ?? "").localeCompare(b.data.name ?? "", undefined, { sensitivity: "base" });
    if (nameCmp !== 0) return nameCmp;
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return 0;
  });
}

const groupedItemInclude = {
  unit: true,
  folder: { select: { id: true, name: true, parentId: true } },
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  tags: { include: { tag: true } },
  customValues: { include: { field: true } },
};

function canSeeFolder(access: Awaited<ReturnType<typeof getFolderAccessMap>>, folderId: string) {
  return access === "all" || access.has(folderId);
}

function summarizeSidGroup<T extends { quantity: unknown; price: unknown; updatedAt: Date; folderId: string; photos: { id: string; publicUrl?: string | null }[] }>(
  pack: T[],
  preferredFolderId?: string | null,
) {
  const local = preferredFolderId ? pack.filter((row) => row.folderId === preferredFolderId) : pack;
  const representative = (local.length ? local : pack).reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
  const photos = pack.flatMap((row) => row.photos).slice(0, 3);
  return {
    representative,
    photos: photos.length ? photos : representative.photos,
    groupedCount: pack.length,
    groupedQty: pack.reduce((sum, row) => sum + Number(row.quantity), 0),
    totalValue: pack.reduce((sum, row) => sum + Number(row.quantity) * Number(row.price ?? 0), 0),
    updatedAt: pack.reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), representative.updatedAt),
  };
}

async function loadSidMembers(organizationId: string, sids: string[]) {
  if (!sids.length) return [];
  return prisma.item.findMany({
    where: { organizationId, sid: { in: sids }, deletedAt: null },
    include: groupedItemInclude,
  });
}

async function groupCatalogItems<T extends { kind: "folder" | "item"; data: { sid?: string }; updatedAt: Date }>(
  user: AuthUser,
  folderId: string,
  combined: T[],
  access: Awaited<ReturnType<typeof getFolderAccessMap>>,
): Promise<T[]> {
  const sids = [...new Set(combined.filter((entry) => entry.kind === "item").map((entry) => String((entry.data as { sid: string }).sid)))];
  const members = await loadSidMembers(user.organizationId, sids);
  const bySid = new Map<string, typeof members>();
  for (const row of members) {
    if (!canSeeFolder(access, row.folderId)) continue;
    const list = bySid.get(row.sid) ?? [];
    list.push(row);
    bySid.set(row.sid, list);
  }

  const grouped: T[] = [];
  const seen = new Set<string>();
  for (const entry of combined) {
    if (entry.kind !== "item") {
      grouped.push(entry);
      continue;
    }
    const sid = String((entry.data as { sid: string }).sid);
    if (seen.has(sid)) continue;
    seen.add(sid);
    const pack = bySid.get(sid) ?? [];
    if (!pack.length) {
      grouped.push(entry);
      continue;
    }
    const summary = summarizeSidGroup(pack, folderId);
    grouped.push({
      ...entry,
      data: {
        ...serializeItem(summary.representative),
        photos: summary.photos,
        groupedCount: summary.groupedCount,
        groupedQty: summary.groupedQty,
        totalValue: summary.totalValue,
      },
      updatedAt: summary.updatedAt,
    } as T);
  }
  return grouped;
}

export async function getSidGroup(user: AuthUser, sid: string) {
  const access = await getFolderAccessMap(user);
  const members = (await loadSidMembers(user.organizationId, [sid])).filter((row) => canSeeFolder(access, row.folderId));
  if (!members.length) return null;
  const summary = summarizeSidGroup(members);
  return {
    sid,
    name: summary.representative.name,
    groupedCount: summary.groupedCount,
    groupedQty: summary.groupedQty,
    totalValue: summary.totalValue,
    unit: summary.representative.unit,
    members: members
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((row) => serializeItem(row)),
  };
}

function matchSearchTerm(term: string) {
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" as const } },
      { sid: { equals: term, mode: "insensitive" as const } },
      { sid: { contains: term, mode: "insensitive" as const } },
      { barcodes: { some: { value: { equals: term, mode: "insensitive" as const } } } },
      { barcodes: { some: { value: { contains: term, mode: "insensitive" as const } } } },
    ],
  };
}

function tokenizeSearch(input: string) {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    const token = (match[1] ?? match[2]).trim();
    if (token && token.toUpperCase() !== "AND" && token.toUpperCase() !== "OR") tokens.push(token);
  }
  return tokens;
}

export function catalogSearchWhere(q?: string | null) {
  const raw = q?.trim() ?? "";
  if (raw.length < 3) return undefined;
  const orGroups = raw
    .split(/\s+OR\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((group) => {
      const terms = group
        .split(/\s+AND\s+/i)
        .flatMap((part) => tokenizeSearch(part.trim()))
        .filter(Boolean);
      const clauses = terms.map(matchSearchTerm);
      if (!clauses.length) return undefined;
      return clauses.length === 1 ? clauses[0] : { AND: clauses };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (!orGroups.length) return undefined;
  return orGroups.length === 1 ? orGroups[0] : { OR: orGroups };
}

export async function getCatalog(user: AuthUser, query: CatalogQuery) {
  const root = await getRootFolder(user.organizationId);
  const folderId = query.folderId || root.id;
  const access = await getFolderAccessMap(user);
  if (access !== "all" && !access.has(folderId)) throw new Error("FORBIDDEN");

  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? PAGE_SIZE_DEFAULT;
  const dir = (query.dir ?? "DESC").toLowerCase() as "asc" | "desc";
  const orderBy = itemOrderBy(query.sort, dir);

  const q = query.q?.trim();
  const search = catalogSearchWhere(q);

  const tree = search
    ? await prisma.folder.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        select: { id: true, parentId: true },
      })
    : [];
  const searchScope = search
    ? subtreeIds(tree, folderId).filter((id) => access === "all" || access.has(id))
    : [folderId];

  const itemWhere: Prisma.ItemWhereInput = {
    organizationId: user.organizationId,
    folderId: search ? { in: searchScope } : folderId,
    deletedAt: null,
    ...(search ?? {}),
  };

  const folderWhere: Prisma.FolderWhereInput = search
    ? {
        organizationId: user.organizationId,
        deletedAt: null,
        id: { in: searchScope.filter((id) => id !== folderId) },
        ...(search ?? {}),
      }
    : {
        organizationId: user.organizationId,
        parentId: folderId,
        deletedAt: null,
      };

  const [folder, folders, items, itemCount, unitTotals, subtree, fields] = await Promise.all([
    prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
        customValues: { include: { field: true } },
        barcodes: { orderBy: { slot: "asc" } },
        job: true,
      },
    }),
    prisma.folder.findMany({
      where: folderWhere,
      orderBy: { name: "asc" },
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 3 },
        barcodes: { orderBy: { slot: "asc" } },
        customValues: { include: { field: true } },
        job: { select: { id: true } },
        _count: { select: { items: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } } },
      },
    }),
    prisma.item.findMany({
      where: itemWhere,
      orderBy,
      take: search ? 2000 : undefined,
      include: {
        unit: true,
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        tags: { include: { tag: true } },
        customValues: { include: { field: true } },
        barcodes: { orderBy: { slot: "asc" } },
      },
    }),
    prisma.item.count({ where: itemWhere }),
    prisma.item.aggregate({
      where: { organizationId: user.organizationId, folderId, deletedAt: null },
      _sum: { quantity: true, price: true },
    }),
    folderStats(user.organizationId, folderId, access),
    prisma.customField.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        appliesTo: true,
        listVisible: true,
        placeholder: true,
        defaultValue: true,
        options: true,
        maxLength: true,
      },
    }),
  ]);

  const folderTotals = new Map<string, number>();
  const folderQty = new Map<string, number>();
  if (folders.length) {
    const folderItemRows = await prisma.item.findMany({
      where: {
        organizationId: user.organizationId,
        folderId: { in: folders.map((folder) => folder.id) },
        deletedAt: null,
      },
      select: { folderId: true, quantity: true, price: true },
    });
    for (const row of folderItemRows) {
      folderTotals.set(
        row.folderId,
        (folderTotals.get(row.folderId) ?? 0) + Number(row.quantity) * Number(row.price ?? 0),
      );
      folderQty.set(row.folderId, (folderQty.get(row.folderId) ?? 0) + Number(row.quantity));
    }
  }

  const combined = [
    ...folders.map((f) => ({
      kind: "folder" as const,
      data: {
        ...f,
        jobId: f.job?.id ?? null,
        value: folderTotals.get(f.id) ?? 0,
        quantity: folderQty.get(f.id) ?? 0,
      },
      updatedAt: f.updatedAt,
    })),
    ...items.map((i) => ({ kind: "item" as const, data: serializeItem(i), updatedAt: i.updatedAt })),
  ];

  let entries = combined;
  if (query.groupItems) {
    entries = await groupCatalogItems(user, folderId, combined, access);
  }

  entries = sortCatalogEntries(entries, query.sort, dir);

  const totalEntries = entries.length;
  const pageEntries = entries.slice((page - 1) * pageSize, page * pageSize);

  const ancestors = await breadcrumb(folderId);

  const folderPayload = folder
    ? {
        ...folder,
        job: folder.job
          ? {
              id: folder.job.id,
              number: folder.job.number,
              startDate: folder.job.startDate?.toISOString() ?? null,
              endDate: folder.job.endDate?.toISOString() ?? null,
              notes: folder.job.notes,
              externalLink: folder.job.externalLink,
              status: folder.job.status,
              completedAt: folder.job.completedAt?.toISOString() ?? null,
            }
          : null,
      }
    : null;

  return {
    folder: folderPayload,
    breadcrumb: ancestors,
    entries: pageEntries,
    page,
    pageSize,
    total: totalEntries,
    itemCount,
    folderCount: folders.length,
    stats: subtree,
    unitSum: Number(unitTotals._sum.quantity ?? 0),
    fields,
    listFields: fields.filter((field) => field.listVisible && field.appliesTo !== "FOLDER"),
  };
}

async function breadcrumb(folderId: string) {
  const path: { id: string; name: string }[] = [];
  let current = await prisma.folder.findUnique({ where: { id: folderId }, select: { id: true, name: true, parentId: true } });
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift({ id: current.id, name: current.name });
    if (!current.parentId) break;
    current = await prisma.folder.findUnique({
      where: { id: current.parentId },
      select: { id: true, name: true, parentId: true },
    });
  }
  return path;
}

async function folderStats(organizationId: string, folderId: string, access: Awaited<ReturnType<typeof getFolderAccessMap>>) {
  const folders = await prisma.folder.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, parentId: true },
  });
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const allowed = access === "all" ? ids : new Set([...ids].filter((id) => access.has(id)));
  const [folderCount, itemAgg] = await Promise.all([
    prisma.folder.count({ where: { id: { in: [...allowed] }, deletedAt: null, NOT: { id: folderId } } }),
    prisma.item.aggregate({
      where: { folderId: { in: [...allowed] }, deletedAt: null },
      _count: true,
      _sum: { quantity: true },
    }),
  ]);
  const items = await prisma.item.findMany({
    where: { folderId: { in: [...allowed] }, deletedAt: null },
    select: { quantity: true, price: true },
  });
  const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.price ?? 0), 0);
  return {
    folders: folderCount,
    items: itemAgg._count,
    quantity: Number(itemAgg._sum.quantity ?? 0),
    value: totalValue,
  };
}

async function expandFolderIds(organizationId: string, ids: string[]) {
  if (!ids.length) return [];
  const folders = await prisma.folder.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, parentId: true },
  });
  const set = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && set.has(folder.parentId) && !set.has(folder.id)) {
        set.add(folder.id);
        grew = true;
      }
    }
  }
  return [...set];
}

export async function getDashboard(user: AuthUser, selectedFolderIds?: string[]) {
  const access = await getFolderAccessMap(user);
  const org = await prisma.organization.findFirst({
    where: { id: user.organizationId },
    select: { currency: true },
  });

  let scopedIds: string[] | null = null;
  if (selectedFolderIds?.length) {
    const expanded = await expandFolderIds(user.organizationId, selectedFolderIds);
    scopedIds = access === "all" ? expanded : expanded.filter((id) => access.has(id));
  } else if (access !== "all") {
    scopedIds = [...access.keys()];
  }

  const itemScope = scopedIds ? { folderId: { in: scopedIds } } : {};
  const txnScope = scopedIds ? { folderId: { in: scopedIds } } : {};
  const folderScope = scopedIds ? { id: { in: scopedIds } } : {};

  const photoInclude = {
    unit: true,
    folder: { select: { id: true, name: true } },
    photos: { take: 1, orderBy: { sortOrder: "asc" as const } },
  };

  const [items, folders, recent, lowStock, added] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, ...itemScope },
      select: { id: true, sid: true, quantity: true, price: true },
    }),
    prisma.folder.count({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        parentId: { not: null },
        ...folderScope,
      },
    }),
    prisma.inventoryTransaction.findMany({
      where: { organizationId: user.organizationId, ...txnScope },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        item: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } },
        toFolder: { select: { id: true, name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.item.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        minQuantity: { not: null },
        ...itemScope,
      },
      include: photoInclude,
      take: 80,
    }),
    prisma.item.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, ...itemScope },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: photoInclude,
    }),
  ]);

  const low = lowStock.filter((i) => Number(i.quantity) <= Number(i.minQuantity ?? 0));
  const hidePrices = user.role.hidePrices;
  const totalValue = hidePrices ? 0 : items.reduce((s, i) => s + Number(i.quantity) * Number(i.price ?? 0), 0);
  const totalQty = items.reduce((s, i) => s + Number(i.quantity), 0);

  return {
    uniqueItems: new Set(items.map((i) => i.sid)).size,
    itemRows: items.length,
    folders,
    totalQty,
    totalValue,
    currency: org?.currency ?? "GBP",
    hidePrices,
    recent: recent.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt,
      qtyDelta: row.qtyDelta == null ? null : Number(row.qtyDelta),
      note: row.note,
      payload: row.payload,
      item: row.item,
      folder: row.folder,
      toFolder: row.toFolder,
      user: row.user,
    })),
    lowStock: low.slice(0, 12).map(serializeItem),
    lowStockCount: low.length,
    recentlyAdded: added.map(serializeItem),
  };
}
