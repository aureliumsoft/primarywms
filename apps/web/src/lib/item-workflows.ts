import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertFolderAccess } from "./auth";
import { assertWorkflowAccess, nextDocumentNumber } from "./workflows-shared";

export async function getItemOrders(user: AuthUser, itemId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true, folderId: true },
  });
  if (!item) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, item.folderId, "VIEW");

  const lines = await prisma.purchaseOrderLine.findMany({
    where: { itemId, purchaseOrder: { organizationId: user.organizationId } },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          number: true,
          status: true,
          vendorName: true,
          dateOrdered: true,
          dateExpected: true,
          dateReceived: true,
          updatedAt: true,
          total: true,
        },
      },
    },
    orderBy: { purchaseOrder: { updatedAt: "desc" } },
  });

  type OrderRow = {
    lineId: string;
    purchaseOrderId: string;
    number: string;
    status: string;
    vendorName: string | null;
    quantity: number;
    quantityReceived: number;
    unitCost: number | null;
    dateOrdered: string | null;
    dateExpected: string | null;
    dateReceived: string | null;
    updatedAt: string;
    orderTotal: number;
  };
  const open: OrderRow[] = [];
  const closed: OrderRow[] = [];
  const orders: OrderRow[] = lines.map((line) => ({
    lineId: line.id,
    purchaseOrderId: line.purchaseOrder.id,
    number: line.purchaseOrder.number,
    status: line.purchaseOrder.status,
    vendorName: line.purchaseOrder.vendorName,
    quantity: Number(line.quantity),
    quantityReceived: Number(line.quantityReceived),
    unitCost: line.unitCost == null ? null : Number(line.unitCost),
    dateOrdered: line.purchaseOrder.dateOrdered?.toISOString() ?? null,
    dateExpected: line.expectedDate?.toISOString() ?? line.purchaseOrder.dateExpected?.toISOString() ?? null,
    dateReceived: line.purchaseOrder.dateReceived?.toISOString() ?? null,
    updatedAt: line.purchaseOrder.updatedAt.toISOString(),
    orderTotal: Number(line.purchaseOrder.total),
  }));

  for (const row of orders) {
    if (row.status === "RECEIVED" || row.status === "CANCELLED") closed.push(row);
    else open.push(row);
  }

  return { open, closed };
}

export async function addItemToWorkflow(
  user: AuthUser,
  itemId: string,
  input: { kind: "pick-list" | "purchase-order" | "stock-count"; documentId?: string; quantity?: number },
) {
  assertWorkflowAccess(user);
  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true, folderId: true, quantity: true },
  });
  if (!item) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, item.folderId, "EDIT");

  if (input.kind === "pick-list") {
    const qty = input.quantity ?? 1;
    const pickListId =
      input.documentId ??
      (
        await prisma.pickList.create({
          data: {
            organizationId: user.organizationId,
            number: await nextDocumentNumber(user.organizationId, "PL", "pickList"),
            status: "DRAFT",
            createdById: user.id,
          },
        })
      ).id;

    const pickList = await prisma.pickList.findFirst({
      where: { id: pickListId, organizationId: user.organizationId, status: "DRAFT" },
      include: { lines: { select: { sortOrder: true } } },
    });
    if (!pickList) throw new Error("Pick list not found or not editable");

    const existing = await prisma.pickListLine.findFirst({ where: { pickListId, itemId } });
    if (existing) {
      await prisma.pickListLine.update({
        where: { id: existing.id },
        data: { quantityToPick: { increment: qty } },
      });
    } else {
      const sortOrder = pickList.lines.reduce((max, line) => Math.max(max, line.sortOrder), -1) + 1;
      await prisma.pickListLine.create({
        data: { pickListId, itemId, quantityToPick: qty, sortOrder },
      });
    }
    await prisma.pickList.update({ where: { id: pickListId }, data: { updatedAt: new Date() } });
    return { kind: input.kind, documentId: pickListId, href: `/pick-lists/${pickListId}` };
  }

  if (input.kind === "purchase-order") {
    const qty = input.quantity ?? 1;
    const purchaseOrderId =
      input.documentId ??
      (
        await prisma.purchaseOrder.create({
          data: {
            organizationId: user.organizationId,
            number: await nextDocumentNumber(user.organizationId, "PO", "purchaseOrder"),
            status: "DRAFT",
            createdById: user.id,
          },
        })
      ).id;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId: user.organizationId, status: "DRAFT" },
      include: { lines: { select: { sortOrder: true } } },
    });
    if (!po) throw new Error("Purchase order not found or not editable");

    const existing = await prisma.purchaseOrderLine.findFirst({ where: { purchaseOrderId, itemId } });
    if (existing) {
      await prisma.purchaseOrderLine.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
      });
    } else {
      const sortOrder = po.lines.reduce((max, line) => Math.max(max, line.sortOrder), -1) + 1;
      await prisma.purchaseOrderLine.create({
        data: { purchaseOrderId, itemId, quantity: qty, sortOrder },
      });
    }
    await prisma.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { updatedAt: new Date() } });
    return { kind: input.kind, documentId: purchaseOrderId, href: `/purchase-orders/${purchaseOrderId}` };
  }

  const stockCountId =
    input.documentId ??
    (
      await prisma.stockCount.create({
        data: {
          organizationId: user.organizationId,
          number: await nextDocumentNumber(user.organizationId, "SC", "stockCount"),
          status: "DRAFT",
          createdById: user.id,
        },
      })
    ).id;

  const sc = await prisma.stockCount.findFirst({
    where: { id: stockCountId, organizationId: user.organizationId, status: "DRAFT" },
    include: { lines: { select: { sortOrder: true } } },
  });
  if (!sc) throw new Error("Stock count not found or not editable");

  const existing = await prisma.stockCountLine.findFirst({ where: { stockCountId, itemId } });
  if (!existing) {
    const sortOrder = sc.lines.reduce((max, line) => Math.max(max, line.sortOrder), -1) + 1;
    await prisma.stockCountLine.create({
      data: { stockCountId, itemId, expectedQty: item.quantity, sortOrder },
    });
    await prisma.stockCount.update({ where: { id: stockCountId }, data: { updatedAt: new Date() } });
  }

  return { kind: input.kind, documentId: stockCountId, href: `/stock-counts/${stockCountId}` };
}

export async function listDraftWorkflows(user: AuthUser) {
  assertWorkflowAccess(user);
  const [pickLists, purchaseOrders, stockCounts] = await Promise.all([
    prisma.pickList.findMany({
      where: { organizationId: user.organizationId, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, number: true, updatedAt: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { organizationId: user.organizationId, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, number: true, updatedAt: true },
    }),
    prisma.stockCount.findMany({
      where: { organizationId: user.organizationId, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, number: true, updatedAt: true },
    }),
  ]);
  return {
    pickLists: pickLists.map((row) => ({ id: row.id, number: row.number, updatedAt: row.updatedAt.toISOString() })),
    purchaseOrders: purchaseOrders.map((row) => ({ id: row.id, number: row.number, updatedAt: row.updatedAt.toISOString() })),
    stockCounts: stockCounts.map((row) => ({ id: row.id, number: row.number, updatedAt: row.updatedAt.toISOString() })),
  };
}
