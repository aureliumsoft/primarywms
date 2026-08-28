import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, assertFolderAccess } from "./auth";

function norm(value: unknown) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim().toLowerCase();
}

export async function mergeCandidates(user: AuthUser, itemId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!item) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, item.folderId, "VIEW");
  const others = await prisma.item.findMany({
    where: {
      organizationId: user.organizationId,
      folderId: item.folderId,
      sid: item.sid,
      deletedAt: null,
      id: { not: item.id },
    },
    include: { unit: true, tags: { include: { tag: true } }, customValues: true },
  });
  return { item, others };
}

export async function mergeItems(user: AuthUser, itemId: string, survivorId: string) {
  assertCan(user, "merge_item");

  return prisma.$transaction(async (tx) => {
    const seed = await tx.item.findFirst({
      where: { id: itemId, organizationId: user.organizationId, deletedAt: null },
    });
    const survivor = await tx.item.findFirst({
      where: { id: survivorId, organizationId: user.organizationId, deletedAt: null },
      include: { tags: { include: { tag: true } }, customValues: { include: { field: true } } },
    });
    if (!seed || !survivor) throw new Error("NOT_FOUND");
    if (seed.sid !== survivor.sid || seed.folderId !== survivor.folderId) {
      throw new Error("Merge is only allowed for the same SID in the same folder");
    }
    await assertFolderAccess(user, survivor.folderId, "EDIT");

    const losers = await tx.item.findMany({
      where: {
        organizationId: user.organizationId,
        folderId: seed.folderId,
        sid: seed.sid,
        deletedAt: null,
        id: { not: survivorId },
      },
      include: { tags: { include: { tag: true } }, customValues: { include: { field: true } } },
    });
    if (!losers.length) throw new Error("Choose a different item to merge into");

    const mismatches = new Set<string>();
    const survivorTags = survivor.tags.map((t) => t.tag.name.toLowerCase()).sort().join(",");
    const survivorCustom = survivor.customValues
      .map((v) => `${v.field.name}:${norm(v.valueText ?? v.valueDate ?? v.valueNum ?? v.valueBool)}`)
      .sort()
      .join("|");
    for (const loser of losers) {
      if (norm(loser.name) !== norm(survivor.name)) mismatches.add("Name");
      if (norm(loser.notes) !== norm(survivor.notes)) mismatches.add("Notes");
      if (norm(loser.price) !== norm(survivor.price)) mismatches.add("Price");
      if (norm(loser.minQuantity) !== norm(survivor.minQuantity)) mismatches.add("Min Level");
      const loserTags = loser.tags.map((t) => t.tag.name.toLowerCase()).sort().join(",");
      if (loserTags !== survivorTags) mismatches.add("Tags");
      const loserCustom = loser.customValues
        .map((v) => `${v.field.name}:${norm(v.valueText ?? v.valueDate ?? v.valueNum ?? v.valueBool)}`)
        .sort()
        .join("|");
      if (loserCustom !== survivorCustom) mismatches.add("Custom fields");
    }

    let qty = Number(survivor.quantity);
    const loserIds = losers.map((row) => row.id);
    for (const loser of losers) {
      qty += Number(loser.quantity);
      await tx.item.update({
        where: { id: loser.id },
        data: { deletedAt: new Date(), deletedReason: "Merged", quantity: 0 },
      });
    }
    await tx.item.update({ where: { id: survivor.id }, data: { quantity: qty, updatedById: user.id } });
    await tx.inventoryTransaction.create({
      data: {
        organizationId: user.organizationId,
        type: "MERGE",
        itemId: survivor.id,
        folderId: survivor.folderId,
        qtyAfter: qty,
        qtyDelta: qty - Number(survivor.quantity),
        userId: user.id,
        payload: { loserIds, survivorId: survivor.id, mismatches: [...mismatches] },
      },
    });
    return { survivorId: survivor.id, quantity: qty, mismatches: [...mismatches] };
  });
}
