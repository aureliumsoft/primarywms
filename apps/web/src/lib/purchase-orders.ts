import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertWorkflowAccess, formatAddress, formatUserName, nextDocumentNumber, paginate, type ListQuery } from "./workflows-shared";

function serializePO<
  T extends {
    id: string;
    number: string;
    status: string;
    vendorName: string | null;
    shipTo: unknown;
    total: { toString(): string };
    dateOrdered: Date | null;
    dateExpected: Date | null;
    dateReceived: Date | null;
    updatedAt: Date;
    createdAt: Date;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
    submittedBy?: { id: string; firstName: string; lastName: string } | null;
    lines?: { id: string }[];
  },
>(row: T) {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    vendorName: row.vendorName ?? "—",
    shipToLabel: formatAddress(row.shipTo),
    orderTotal: Number(row.total),
    dateOrdered: row.dateOrdered?.toISOString() ?? null,
    dateExpected: row.dateExpected?.toISOString() ?? null,
    dateReceived: row.dateReceived?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ? { id: row.createdBy.id, name: formatUserName(row.createdBy) } : null,
    submittedBy: row.submittedBy ? { id: row.submittedBy.id, name: formatUserName(row.submittedBy) } : null,
    lineCount: row.lines?.length ?? 0,
  };
}

export async function listPurchaseOrders(user: AuthUser, query: ListQuery = {}) {
  assertWorkflowAccess(user);
  const { page, pageSize, skip, take } = paginate(query.page, query.pageSize);
  const q = query.q?.trim();
  const where = {
    organizationId: user.organizationId,
    ...(query.status ? { status: query.status as never } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { vendorName: { contains: q, mode: "insensitive" as const } },
            { notes: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        lines: { select: { id: true } },
      },
    }),
  ]);
  return { purchaseOrders: rows.map(serializePO), total, page, pageSize };
}

export async function createPurchaseOrder(user: AuthUser) {
  assertWorkflowAccess(user);
  const number = await nextDocumentNumber(user.organizationId, "PO", "purchaseOrder");
  const row = await prisma.purchaseOrder.create({
    data: {
      organizationId: user.organizationId,
      number,
      status: "DRAFT",
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      submittedBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { select: { id: true } },
    },
  });
  return serializePO(row);
}

export async function getPurchaseOrder(user: AuthUser, id: string) {
  assertWorkflowAccess(user);
  const row = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      submittedBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { include: { item: { select: { id: true, name: true, sid: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row) throw new Error("NOT_FOUND");
  return {
    ...serializePO(row),
    notes: row.notes,
    shipTo: row.shipTo,
    billTo: row.billTo,
    subtotal: Number(row.subtotal),
    version: row.version,
    lines: row.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      itemSid: line.item.sid,
      quantity: Number(line.quantity),
      quantityReceived: Number(line.quantityReceived),
      unitCost: line.unitCost == null ? null : Number(line.unitCost),
      expectedDate: line.expectedDate?.toISOString() ?? null,
    })),
  };
}
