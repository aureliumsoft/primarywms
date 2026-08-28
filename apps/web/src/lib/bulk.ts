import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, assertFolderAccess } from "./auth";
import { moveFolder, moveItemQty, softDeleteItem, updateQuantity, validateFolderMove } from "./inventory";
import { writeCustomFieldValues } from "./custom-fields";
import { randomUUID } from "crypto";

export async function bulkEditItems(
  user: AuthUser,
  input: {
    itemIds: string[];
    name?: string;
    minQuantity?: number | null;
    price?: number | null;
    notes?: string | null;
    unitId?: string;
    tags?: { mode: "add" | "remove" | "replace"; names: string[] };
    quantity?: { newQuantity: number; reason?: string | null; note?: string | null };
    quantityDelta?: { delta: number; reason?: string | null; note?: string | null };
    customValues?: Array<{
      fieldId: string;
      valueText?: string | null;
      valueDate?: string | null;
      valueBool?: boolean | null;
      valueNum?: number | null;
    }>;
  },
) {
  assertCan(user, "bulk_edit");
  const items = await prisma.item.findMany({
    where: { id: { in: input.itemIds }, organizationId: user.organizationId, deletedAt: null },
  });
  const batchId = randomUUID();
  let updated = 0;
  for (const item of items) {
    await assertFolderAccess(user, item.folderId, "EDIT");
    if (input.quantityDelta) {
      const next = Number(item.quantity) + input.quantityDelta.delta;
      if (next < 0) throw new Error("Quantity cannot go below zero");
      await updateQuantity(user, {
        itemId: item.id,
        newQuantity: next,
        reason: input.quantityDelta.reason,
        note: input.quantityDelta.note,
        mode: "SET",
      });
    } else if (input.quantity) {
      await updateQuantity(user, { itemId: item.id, ...input.quantity, mode: "SET" });
    }
    await prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: item.id },
        data: {
          name: input.name?.trim() || undefined,
          minQuantity: input.minQuantity === undefined ? undefined : input.minQuantity,
          price: input.price === undefined ? undefined : input.price,
          notes: input.notes === undefined ? undefined : input.notes,
          unitId: input.unitId,
          updatedById: user.id,
        },
      });
      if (input.tags) {
        const names = input.tags.names.map((n) => n.trim()).filter(Boolean);
        if (input.tags.mode === "replace") {
          await tx.itemTag.deleteMany({ where: { itemId: item.id } });
        }
        for (const name of names) {
          const tag =
            (await tx.tag.findFirst({
              where: { organizationId: user.organizationId, name: { equals: name, mode: "insensitive" } },
            })) ?? (await tx.tag.create({ data: { organizationId: user.organizationId, name } }));
          if (input.tags.mode === "remove") {
            await tx.itemTag.deleteMany({ where: { itemId: item.id, tagId: tag.id } });
          } else {
            await tx.itemTag.upsert({
              where: { itemId_tagId: { itemId: item.id, tagId: tag.id } },
              create: { itemId: item.id, tagId: tag.id },
              update: {},
            });
          }
        }
      }
      if (input.customValues?.length) {
        await writeCustomFieldValues(tx, user.organizationId, { itemId: item.id }, input.customValues);
      }
      await tx.inventoryTransaction.create({
        data: {
          organizationId: user.organizationId,
          type: "BULK_EDIT",
          itemId: item.id,
          folderId: item.folderId,
          userId: user.id,
          batchId,
        },
      });
    });
    updated += 1;
  }
  return { updated, batchId };
}

export async function bulkMoveItems(
  user: AuthUser,
  input: { itemIds: string[]; destinationFolderId: string; reason?: string | null; note?: string | null },
) {
  assertCan(user, "move_item");
  const items = await prisma.item.findMany({
    where: { id: { in: input.itemIds }, organizationId: user.organizationId, deletedAt: null },
  });
  for (const item of items) {
    await assertFolderAccess(user, item.folderId, "EDIT");
    await assertFolderAccess(user, input.destinationFolderId, "EDIT");
    if (item.folderId === input.destinationFolderId) {
      throw new Error(`${item.name} is already in the destination folder`);
    }
  }
  const results = [];
  for (const item of items) {
    results.push(
      await moveItemQty(user, {
        itemId: item.id,
        destinationFolderId: input.destinationFolderId,
        quantity: Number(item.quantity),
        reason: input.reason,
        note: input.note,
      }),
    );
  }
  return { moved: results.length, destinationFolderId: input.destinationFolderId };
}

export async function bulkMoveSelection(
  user: AuthUser,
  input: {
    itemIds: string[];
    folderIds: string[];
    destinationFolderId: string;
    reason?: string | null;
    note?: string | null;
  },
) {
  const folderIds = input.folderIds.filter((id) => id !== input.destinationFolderId);
  for (const folderId of folderIds) {
    await validateFolderMove(user, folderId, input.destinationFolderId);
  }
  const folderIdSet = new Set(folderIds);
  let movedFolders = 0;
  for (const folderId of folderIds) {
    await moveFolder(user, folderId, input.destinationFolderId, { reason: input.reason, note: input.note });
    movedFolders += 1;
  }
  let movedItems = 0;
  if (input.itemIds.length) {
    const items = await prisma.item.findMany({
      where: { id: { in: input.itemIds }, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, folderId: true },
    });
    const standaloneItemIds = items.filter((item) => !folderIdSet.has(item.folderId)).map((item) => item.id);
    if (standaloneItemIds.length) {
      await bulkMoveItems(user, {
        itemIds: standaloneItemIds,
        destinationFolderId: input.destinationFolderId,
        reason: input.reason,
        note: input.note,
      });
      movedItems = standaloneItemIds.length;
    }
  }
  return {
    movedItems,
    movedFolders,
    destinationFolderId: input.destinationFolderId,
  };
}

export async function bulkDeleteItems(
  user: AuthUser,
  itemIds: string[],
  meta?: { reason?: string | null; note?: string | null },
) {
  assertCan(user, "delete_item");
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, organizationId: user.organizationId, deletedAt: null },
    select: { id: true, folderId: true },
  });
  for (const item of items) {
    await assertFolderAccess(user, item.folderId, "EDIT");
  }
  let deleted = 0;
  for (const item of items) {
    await softDeleteItem(user, item.id, meta?.reason ?? undefined, meta?.note ?? undefined);
    deleted += 1;
  }
  return { deleted };
}

export async function bulkEditFolders(
  user: AuthUser,
  input: {
    folderIds: string[];
    name?: string;
    notes?: string | null;
    tags?: string[];
    applyToItems?: boolean;
    customValues?: Array<{
      fieldId: string;
      valueText?: string | null;
      valueDate?: string | null;
      valueBool?: boolean | null;
      valueNum?: number | null;
    }>;
  },
) {
  assertCan(user, "edit_folder");
  let updated = 0;
  for (const id of input.folderIds) {
    await assertFolderAccess(user, id, "EDIT");
    await prisma.$transaction(async (tx) => {
      await tx.folder.update({
        where: { id },
        data: { name: input.name?.trim() || undefined, notes: input.notes === undefined ? undefined : input.notes },
      });
      if (input.customValues?.length) {
        await writeCustomFieldValues(tx, user.organizationId, { folderId: id }, input.customValues);
      }
    });
    if (input.tags) {
      await prisma.folderTag.deleteMany({ where: { folderId: id } });
      for (const name of input.tags) {
        const tag =
          (await prisma.tag.findFirst({
            where: { organizationId: user.organizationId, name: { equals: name.trim(), mode: "insensitive" } },
          })) ?? (await prisma.tag.create({ data: { organizationId: user.organizationId, name: name.trim() } }));
        await prisma.folderTag.create({ data: { folderId: id, tagId: tag.id } });
      }
    }
    if (
      input.applyToItems &&
      (input.name?.trim() || input.notes !== undefined || (input.tags && input.tags.length))
    ) {
      const items = await prisma.item.findMany({
        where: { folderId: id, organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      for (const item of items) {
        await prisma.item.update({
          where: { id: item.id },
          data: {
            name: input.name?.trim() || undefined,
            notes: input.notes === undefined ? undefined : input.notes,
            updatedById: user.id,
          },
        });
        if (input.tags) {
          await prisma.itemTag.deleteMany({ where: { itemId: item.id } });
          for (const name of input.tags) {
            const tag =
              (await prisma.tag.findFirst({
                where: { organizationId: user.organizationId, name: { equals: name.trim(), mode: "insensitive" } },
              })) ?? (await prisma.tag.create({ data: { organizationId: user.organizationId, name: name.trim() } }));
            await prisma.itemTag.create({ data: { itemId: item.id, tagId: tag.id } });
          }
        }
      }
    }
    updated += 1;
  }
  return { updated };
}
