import { Prisma } from "@primarywms/db";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, getFolderAccessMap } from "./auth";
import { serializeItem } from "./inventory";

export const TAG_NAME_TAKEN = "A tag with that name already exists";

type Access = Awaited<ReturnType<typeof getFolderAccessMap>>;

function folderIds(access: Access) {
  if (access === "all") return null;
  return [...access.keys()];
}

async function assertUniqueName(organizationId: string, name: string, excludeId?: string) {
  const exists = await prisma.tag.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (exists) throw new Error(TAG_NAME_TAKEN);
}

export async function listTags(user: AuthUser) {
  const access = await getFolderAccessMap(user);
  const ids = folderIds(access);
  const itemScope: Prisma.ItemTagWhereInput =
    ids === null ? { item: { deletedAt: null } } : { item: { deletedAt: null, folderId: { in: ids } } };
  const folderScope: Prisma.FolderTagWhereInput =
    ids === null ? { folder: { deletedAt: null } } : { folder: { deletedAt: null, id: { in: ids } } };

  return prisma.tag.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          items: { where: itemScope },
          folders: { where: folderScope },
        },
      },
    },
  });
}

export async function createTag(user: AuthUser, rawName: string) {
  assertCan(user, "edit_item");
  const name = rawName.trim();
  if (!name) throw new Error("Name is required");
  await assertUniqueName(user.organizationId, name);
  return prisma.tag.create({ data: { organizationId: user.organizationId, name } });
}

export async function renameTag(user: AuthUser, tagId: string, rawName: string) {
  assertCan(user, "edit_item");
  const name = rawName.trim();
  if (!name) throw new Error("Name is required");
  const tag = await prisma.tag.findFirst({ where: { id: tagId, organizationId: user.organizationId } });
  if (!tag) throw new Error("NOT_FOUND");
  if (tag.name !== name) await assertUniqueName(user.organizationId, name, tagId);
  return prisma.tag.update({ where: { id: tagId }, data: { name } });
}

export async function deleteTag(user: AuthUser, tagId: string) {
  assertCan(user, "edit_item");
  const result = await prisma.tag.deleteMany({ where: { id: tagId, organizationId: user.organizationId } });
  if (!result.count) throw new Error("NOT_FOUND");
  return { ok: true as const };
}

export async function getTagInventory(
  user: AuthUser,
  tagId: string,
  query: { q?: string; sort?: string; dir?: "ASC" | "DESC" } = {},
) {
  const tag = await prisma.tag.findFirst({ where: { id: tagId, organizationId: user.organizationId } });
  if (!tag) throw new Error("NOT_FOUND");

  const access = await getFolderAccessMap(user);
  const ids = folderIds(access);
  const hidePrices = user.role.hidePrices;
  const q = query.q?.trim() ?? "";
  const dir = query.dir === "ASC" ? "asc" : "desc";
  const sort = (query.sort || "UPDATED_AT").toUpperCase();

  const itemBase: Prisma.ItemWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    tags: { some: { tagId } },
    ...(ids === null ? {} : { folderId: { in: ids } }),
  };
  const folderBase: Prisma.FolderWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    tags: { some: { tagId } },
    ...(ids === null ? {} : { id: { in: ids } }),
  };
  const itemWhere: Prisma.ItemWhereInput = q
    ? {
        ...itemBase,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sid: { contains: q, mode: "insensitive" } },
          { barcodes: { some: { value: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : itemBase;
  const folderWhere: Prisma.FolderWhereInput = q
    ? { ...folderBase, name: { contains: q, mode: "insensitive" } }
    : folderBase;

  const [items, folders, statItems, folderCount] = await Promise.all([
    prisma.item.findMany({
      where: itemWhere,
      include: {
        unit: true,
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
      },
      take: 500,
    }),
    prisma.folder.findMany({
      where: folderWhere,
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 3 },
        tags: { include: { tag: true } },
        _count: {
          select: {
            items: { where: { deletedAt: null } },
            children: { where: { deletedAt: null } },
          },
        },
      },
      take: 200,
    }),
    prisma.item.findMany({
      where: itemBase,
      select: { quantity: true, price: true },
    }),
    prisma.folder.count({ where: folderBase }),
  ]);

  const quantity = statItems.reduce((sum, row) => sum + Number(row.quantity), 0);
  const value = hidePrices ? 0 : statItems.reduce((sum, row) => sum + Number(row.quantity) * Number(row.price ?? 0), 0);

  const folderValueRows = folders.length
    ? await prisma.item.findMany({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          folderId: { in: folders.map((folder) => folder.id) },
        },
        select: { folderId: true, quantity: true, price: true },
      })
    : [];
  const folderTotals = new Map<string, { value: number; quantity: number }>();
  for (const row of folderValueRows) {
    const current = folderTotals.get(row.folderId) ?? { value: 0, quantity: 0 };
    current.quantity += Number(row.quantity);
    current.value += Number(row.quantity) * Number(row.price ?? 0);
    folderTotals.set(row.folderId, current);
  }

  const entries = [
    ...folders.map((folder) => {
      const totals = folderTotals.get(folder.id) ?? { value: 0, quantity: 0 };
      return {
        kind: "folder" as const,
        updatedAt: folder.updatedAt,
        name: folder.name,
        quantity: totals.quantity,
        data: {
          ...folder,
          updatedAt: folder.updatedAt.toISOString(),
          value: hidePrices ? 0 : totals.value,
          quantity: totals.quantity,
        },
      };
    }),
    ...items.map((item) => {
      const row = serializeItem(item);
      return {
        kind: "item" as const,
        updatedAt: item.updatedAt,
        name: item.name,
        quantity: row.quantity,
        data: {
          ...row,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          price: hidePrices ? null : row.price,
          totalValue: hidePrices ? 0 : row.totalValue,
        },
      };
    }),
  ];

  entries.sort((a, b) => {
    let cmp = 0;
    if (sort === "NAME") cmp = a.name.localeCompare(b.name);
    else if (sort === "QUANTITY") cmp = a.quantity - b.quantity;
    else cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
    if (cmp === 0) cmp = a.name.localeCompare(b.name);
    return dir === "asc" ? cmp : -cmp;
  });

  return {
    tag: { id: tag.id, name: tag.name },
    entries: entries.map(({ kind, data }) => ({ kind, data })),
    stats: {
      folders: folderCount,
      items: statItems.length,
      quantity,
      value,
    },
    hidePrices,
  };
}
