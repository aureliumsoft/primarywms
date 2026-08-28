import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertWorkflowAccess, formatAddress, formatUserName, nextDocumentNumber, paginate, type ListQuery } from "./workflows-shared";

function serializePickList<
  T extends {
    id: string;
    number: string;
    status: string;
    dueDate: Date | null;
    itemOutcome: string | null;
    shipTo: unknown;
    assignedAt: Date | null;
    pickedAt: Date | null;
    updatedAt: Date;
    createdAt: Date;
    assignedTo?: { id: string; firstName: string; lastName: string } | null;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
    lines?: { id: string }[];
  },
>(row: T) {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    dueDate: row.dueDate?.toISOString() ?? null,
    itemOutcome: row.itemOutcome,
    shipToLabel: formatAddress(row.shipTo),
    assignedAt: row.assignedAt?.toISOString() ?? null,
    pickedAt: row.pickedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    assignedTo: row.assignedTo ? { id: row.assignedTo.id, name: formatUserName(row.assignedTo) } : null,
    createdBy: row.createdBy ? { id: row.createdBy.id, name: formatUserName(row.createdBy) } : null,
    lineCount: row.lines?.length ?? 0,
  };
}

export async function listPickLists(user: AuthUser, query: ListQuery = {}) {
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
    prisma.pickList.count({ where }),
    prisma.pickList.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        lines: { select: { id: true } },
      },
    }),
  ]);
  return { pickLists: rows.map(serializePickList), total, page, pageSize };
}

export async function createPickList(user: AuthUser) {
  assertWorkflowAccess(user);
  const number = await nextDocumentNumber(user.organizationId, "PL", "pickList");
  const row = await prisma.pickList.create({
    data: {
      organizationId: user.organizationId,
      number,
      status: "DRAFT",
      createdById: user.id,
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { select: { id: true } },
    },
  });
  return serializePickList(row);
}

export async function getPickList(user: AuthUser, id: string) {
  assertWorkflowAccess(user);
  const row = await prisma.pickList.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { include: { item: { select: { id: true, name: true, sid: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row) throw new Error("NOT_FOUND");
  return {
    ...serializePickList(row),
    notes: row.notes,
    shipTo: row.shipTo,
    lines: row.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      itemSid: line.item.sid,
      quantityToPick: Number(line.quantityToPick),
      quantityPicked: Number(line.quantityPicked),
    })),
  };
}
