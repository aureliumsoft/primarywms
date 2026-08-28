import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertWorkflowAccess, formatUserName, nextDocumentNumber, paginate, type ListQuery } from "./workflows-shared";

function serializeInvoice<
  T extends {
    id: string;
    number: string;
    status: string;
    customerName: string | null;
    customerEmail: string | null;
    dateIssued: Date | null;
    dateDue: Date | null;
    total: { toString(): string };
    updatedAt: Date;
    createdAt: Date;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
    lines?: { id: string }[];
  },
>(row: T) {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customerName: row.customerName ?? "—",
    customerEmail: row.customerEmail,
    dateIssued: row.dateIssued?.toISOString() ?? null,
    dateDue: row.dateDue?.toISOString() ?? null,
    total: Number(row.total),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ? { id: row.createdBy.id, name: formatUserName(row.createdBy) } : null,
    lineCount: row.lines?.length ?? 0,
  };
}

export async function listInvoices(user: AuthUser, query: ListQuery = {}) {
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
            { customerName: { contains: q, mode: "insensitive" as const } },
            { customerEmail: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        lines: { select: { id: true } },
      },
    }),
  ]);
  return { invoices: rows.map(serializeInvoice), total, page, pageSize };
}

export async function createInvoice(user: AuthUser) {
  assertWorkflowAccess(user);
  const number = await nextDocumentNumber(user.organizationId, "IN", "invoice");
  const row = await prisma.invoice.create({
    data: {
      organizationId: user.organizationId,
      number,
      status: "DRAFT",
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { select: { id: true } },
    },
  });
  return serializeInvoice(row);
}

export async function getInvoice(user: AuthUser, id: string) {
  assertWorkflowAccess(user);
  const row = await prisma.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lines: { include: { item: { select: { id: true, name: true, sid: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row) throw new Error("NOT_FOUND");
  return {
    ...serializeInvoice(row),
    subtotal: Number(row.subtotal),
    lines: row.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.item?.name ?? line.description ?? "—",
      itemSid: line.item?.sid ?? null,
      quantity: Number(line.quantity),
      unitRate: Number(line.unitRate),
      amount: Number(line.amount),
    })),
  };
}
