import { Prisma } from "@primarywms/db";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { evaluateDateAlerts } from "./inventory";

export type NotificationKind = "QUANTITY" | "DATE";
export type NotificationStatus = "unread" | "read" | "all";

export type NotificationQuery = {
  q?: string;
  kind?: NotificationKind | "";
  status?: NotificationStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  dir?: "ASC" | "DESC";
};

function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
  };
}

export async function unreadNotificationCount(user: AuthUser) {
  return prisma.notification.count({ where: { userId: user.id, readAt: null } });
}

export async function listNotifications(user: AuthUser, query: NotificationQuery) {
  await evaluateDateAlerts(user.organizationId);
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const q = query.q?.trim() ?? "";
  const createdAt = dateRange(query.from, query.to);
  const kind = query.kind === "QUANTITY" || query.kind === "DATE" ? query.kind : undefined;
  const extra: Prisma.NotificationWhereInput[] = [];
  if (q) {
    const matchingItems = await prisma.item.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { sid: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true },
      take: 200,
    });
    extra.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        ...(matchingItems.length ? [{ itemId: { in: matchingItems.map((item) => item.id) } }] : []),
      ],
    });
  }
  const where: Prisma.NotificationWhereInput = {
    userId: user.id,
    organizationId: user.organizationId,
    ...(query.status === "unread" ? { readAt: null } : {}),
    ...(query.status === "read" ? { readAt: { not: null } } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(kind ? { alert: { kind } } : {}),
    ...(extra.length ? { AND: extra } : {}),
  };
  const [total, unread, rows] = await Promise.all([
    prisma.notification.count({ where }),
    unreadNotificationCount(user),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: query.dir === "ASC" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { alert: { select: { id: true, kind: true } } },
    }),
  ]);
  const itemIds = [...new Set(rows.map((row) => row.itemId).filter((id): id is string => Boolean(id)))];
  const folderIds = [...new Set(rows.map((row) => row.folderId).filter((id): id is string => Boolean(id)))];
  const [items, folders] = await Promise.all([
    itemIds.length
      ? prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, sid: true } })
      : [],
    folderIds.length
      ? prisma.folder.findMany({ where: { id: { in: folderIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  return {
    rows: rows.map((row) => {
      const item = row.itemId ? itemMap.get(row.itemId) ?? null : null;
      const folder = row.folderId ? folderMap.get(row.folderId) ?? null : null;
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        kind: row.alert?.kind ?? (row.title.toLowerCase().includes("date") ? "DATE" : "QUANTITY"),
        item,
        folder,
        href: item ? `/item/${item.id}` : folder ? `/folder/${folder.id}/content` : null,
      };
    }),
    total,
    unread,
    page,
    pageSize,
  };
}

export async function markNotificationsRead(user: AuthUser, ids?: string[]) {
  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
