import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertWorkflowAccess, formatUserName, nextDocumentNumber, paginate, type ListQuery } from "./workflows-shared";

function lineStats(lines: { expectedQty: { toString(): string } | null; countedQty: { toString(): string } | null; variance: { toString(): string } | null }[]) {
  let discrepant = 0;
  let resolved = 0;
  for (const line of lines) {
    const variance = line.variance != null ? Number(line.variance) : line.countedQty != null && line.expectedQty != null ? Number(line.countedQty) - Number(line.expectedQty) : null;
    if (variance != null && variance !== 0) discrepant += 1;
    if (line.countedQty != null) resolved += 1;
  }
  return { itemCount: lines.length, discrepantItems: discrepant, resolvedItems: resolved };
}

function serializeStockCount<
  T extends {
    id: string;
    number: string;
    status: string;
    dueDate: Date | null;
    startedAt: Date | null;
    updatedAt: Date;
    createdAt: Date;
    assignedTo?: { id: string; firstName: string; lastName: string } | null;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
    lines?: { expectedQty: { toString(): string } | null; countedQty: { toString(): string } | null; variance: { toString(): string } | null }[];
  },
>(row: T) {
  const stats = lineStats(row.lines ?? []);
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    dueDate: row.dueDate?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    assignedTo: row.assignedTo ? { id: row.assignedTo.id, name: formatUserName(row.assignedTo) } : null,
    createdBy: row.createdBy ? { id: row.createdBy.id, name: formatUserName(row.createdBy) } : null,
    ...stats,
  };
}

export async function listStockCounts(user: AuthUser, query: ListQuery = {}) {
  assertWorkflowAccess(user);
  const { page, pageSize, skip, take } = paginate(query.page, query.pageSize);
  const q = query.q?.trim();
  const where = {
    organizationId: user.organizationId,
    ...(query.status ? { status: query.status as never } : {}),
    ...(q
      ? {
          OR: [{ number: { contains: q, mode: "insensitive" as const } }, { notes: { contains: q, mode: "insensitive" as const } }],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.stockCount.count({ where }),
    prisma.stockCount.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        lines: { select: { expectedQty: true, countedQty: true, variance: true } },
      },
    }),
  ]);
  return { stockCounts: rows.map(serializeStockCount), total, page, pageSize };
}

export async function createStockCount(user: AuthUser) {
  assertWorkflowAccess(user);
  const number = await nextDocumentNumber(user.organizationId, "SC", "stockCount");
  const row = await prisma.stockCount.create({
    data: {
      organizationId: user.organizationId,
      number,
      status: "DRAFT",
      createdById: user.id,
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { select: { expectedQty: true, countedQty: true, variance: true } },
    },
  });
  return serializeStockCount(row);
}

export async function getStockCount(user: AuthUser, id: string) {
  assertWorkflowAccess(user);
  const row = await prisma.stockCount.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { include: { item: { select: { id: true, name: true, sid: true, quantity: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row) throw new Error("NOT_FOUND");
  return {
    ...serializeStockCount(row),
    notes: row.notes,
    lines: row.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      itemSid: line.item.sid,
      expectedQty: line.expectedQty == null ? Number(line.item.quantity) : Number(line.expectedQty),
      countedQty: line.countedQty == null ? null : Number(line.countedQty),
      variance: line.variance == null ? null : Number(line.variance),
      locked: line.locked,
    })),
  };
}
