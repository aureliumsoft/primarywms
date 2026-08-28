import { generateSid, MAX_PHOTOS } from "@primarywms/shared";
import type { AlertRecipientKind, BarcodeSymbology, DateOffsetUnit, DateWhen, Prisma, QtyComparator } from "@primarywms/db";
import { prisma } from "./db";
import { serializeDecimal } from "./cn";
import type { AuthUser } from "./auth";
import { assertCan, assertFolderAccess } from "./auth";
import { randomUUID } from "crypto";
import { uploadMedia } from "./storage";
import { writeCustomFieldValues } from "./custom-fields";
import type { CustomValuePayload } from "./custom-field-values";
import { allocateUniqueSid, assertCodesAvailable } from "./barcodes";
import { resolveAlertRecipients } from "./alert-recipients";
import { sendAlertEmail } from "./email";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function lockItem(tx: TxClient, itemId: string) {
  await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${itemId} FOR UPDATE`;
  return tx.item.findUnique({ where: { id: itemId } });
}

/** Blocks edits inside a completed job folder (or any of its subfolders). */
export async function assertNotCompletedJobFolder(organizationId: string, folderId: string) {
  let current = await prisma.folder.findFirst({
    where: { id: folderId, organizationId },
    select: { id: true, parentId: true, kind: true, jobStatus: true },
  });
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.kind === "JOB" && current.jobStatus === "COMPLETED") {
      throw new Error("This job is completed and locked");
    }
    if (!current.parentId) break;
    current = await prisma.folder.findFirst({
      where: { id: current.parentId, organizationId },
      select: { id: true, parentId: true, kind: true, jobStatus: true },
    });
  }
}

export function serializeItem<T extends { quantity: unknown; minQuantity: unknown; price: unknown }>(item: T) {
  const quantity = serializeDecimal(item.quantity) ?? 0;
  const price = serializeDecimal(item.price);
  return {
    ...item,
    quantity,
    minQuantity: serializeDecimal(item.minQuantity),
    price,
    totalValue: quantity * (price ?? 0),
  };
}

async function writeTxn(
  tx: TxClient,
  data: {
    organizationId: string;
    type:
      | "ITEM_CREATED"
      | "ITEM_DELETED"
      | "ITEM_RESTORED"
      | "ITEM_EDITED"
      | "FOLDER_CREATED"
      | "FOLDER_DELETED"
      | "FOLDER_RESTORED"
      | "FOLDER_EDITED"
      | "QTY_ADD"
      | "QTY_SUBTRACT"
      | "QTY_SET"
      | "MOVE"
      | "MERGE"
      | "CLONE"
      | "BULK_EDIT";
    itemId?: string | null;
    folderId?: string | null;
    fromFolderId?: string | null;
    toFolderId?: string | null;
    qtyBefore?: number | null;
    qtyAfter?: number | null;
    qtyDelta?: number | null;
    reason?: string | null;
    note?: string | null;
    userId?: string | null;
    batchId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  return tx.inventoryTransaction.create({
    data: {
      organizationId: data.organizationId,
      type: data.type,
      itemId: data.itemId ?? undefined,
      folderId: data.folderId ?? undefined,
      fromFolderId: data.fromFolderId ?? undefined,
      toFolderId: data.toFolderId ?? undefined,
      qtyBefore: data.qtyBefore ?? undefined,
      qtyAfter: data.qtyAfter ?? undefined,
      qtyDelta: data.qtyDelta ?? undefined,
      reason: data.reason ?? undefined,
      note: data.note ?? undefined,
      userId: data.userId ?? undefined,
      batchId: data.batchId ?? undefined,
      payload: data.payload as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function createItem(
  user: AuthUser,
  input: {
    folderId: string;
    name: string;
    quantity: number;
    unitId: string;
    minQuantity?: number | null;
    price?: number | null;
    notes?: string | null;
    tags?: string[];
    customValues?: CustomValuePayload[];
    keepSid?: string;
    sid?: string;
    productLink?: string | null;
    nativeSymbology?: BarcodeSymbology;
    barcodes?: { value: string; symbology?: string }[];
  },
) {
  assertCan(user, "add_item");
  await assertFolderAccess(user, input.folderId, "EDIT");
  await assertNotCompletedJobFolder(user.organizationId, input.folderId);
  if (!input.name.trim()) throw new Error("Name is required");
  if (input.quantity < 0) throw new Error("Quantity cannot be negative");

  const extras = (input.barcodes ?? [])
    .map((row) => ({ value: row.value.trim(), symbology: row.symbology }))
    .filter((row) => row.value);
  const sid = await allocateUniqueSid(user.organizationId, input.sid || input.keepSid);
  const linked = extras.filter((row) => row.value.toUpperCase() !== sid.toUpperCase()).slice(0, 1);
  await assertCodesAvailable(prisma, user.organizationId, linked.map((row) => row.value));

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.create({
      data: {
        organizationId: user.organizationId,
        folderId: input.folderId,
        sid,
        name: input.name.trim(),
        quantity: input.quantity,
        unitId: input.unitId,
        minQuantity: input.minQuantity ?? undefined,
        price: input.price ?? undefined,
        notes: input.notes ?? undefined,
        productLink: input.productLink ?? undefined,
        createdById: user.id,
        updatedById: user.id,
        barcodes: {
          create: [
            { ownerType: "ITEM", slot: 1, value: sid, symbology: input.nativeSymbology ?? "QR" },
            ...linked.map((row) => ({
              ownerType: "ITEM" as const,
              slot: 2,
              value: row.value,
              symbology: (row.symbology as BarcodeSymbology) || "CODE128",
            })),
          ],
        },
        tags: input.tags?.length
          ? {
              create: await Promise.all(
                input.tags.map(async (name) => {
                  const tag = await upsertTag(tx, user.organizationId, name);
                  return { tagId: tag.id };
                }),
              ),
            }
          : undefined,
      },
    });

    if (input.customValues?.length) {
      await writeCustomFieldValues(tx, user.organizationId, { itemId: item.id }, input.customValues);
    }

    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "ITEM_CREATED",
      itemId: item.id,
      folderId: input.folderId,
      qtyAfter: input.quantity,
      qtyDelta: input.quantity,
      userId: user.id,
    });

    return item;
  });
}

async function upsertTag(tx: TxClient, organizationId: string, rawName: string) {
  const name = rawName.trim();
  const existing = await tx.tag.findFirst({
    where: { organizationId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing;
  return tx.tag.create({ data: { organizationId, name } });
}

export async function createFolder(
  user: AuthUser,
  input: {
    parentId: string;
    name: string;
    notes?: string | null;
    kind?: "ITEM" | "JOB";
    jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
    tags?: string[];
    customValues?: CustomValuePayload[];
    barcodes?: { value: string; symbology?: string }[];
    sid?: string;
    nativeSymbology?: BarcodeSymbology;
    dateAlerts?: {
      fieldId: string;
      dateWhen: DateWhen;
      dateOffset?: number | null;
      dateOffsetUnit?: DateOffsetUnit | null;
      recipientKind?: AlertRecipientKind;
      recipientIds?: string[];
    }[];
  },
) {
  assertCan(user, "add_folder");
  await assertFolderAccess(user, input.parentId, "EDIT");
  await assertNotCompletedJobFolder(user.organizationId, input.parentId);
  if (!input.name.trim()) throw new Error("Folder name is required");

  const ancestors = await getAncestorCount(input.parentId);
  if (ancestors + 1 >= 6) {
    throw new Error("Folders can only nest 6 levels including All Items");
  }

  const kind = input.kind === "JOB" ? "JOB" : "ITEM";
  const jobStatus =
    kind === "JOB" ? input.jobStatus ?? "NOT_STARTED" : null;

  const extras = (input.barcodes ?? [])
    .map((row) => ({ value: row.value.trim(), symbology: row.symbology }))
    .filter((row) => row.value);
  const sid = await allocateUniqueSid(user.organizationId, input.sid);
  const linked = extras.filter((row) => row.value.toUpperCase() !== sid.toUpperCase()).slice(0, 1);
  await assertCodesAvailable(prisma, user.organizationId, linked.map((row) => row.value));

  return prisma.$transaction(async (tx) => {
    const folder = await tx.folder.create({
      data: {
        organizationId: user.organizationId,
        parentId: input.parentId,
        sid,
        name: input.name.trim(),
        notes: input.notes ?? undefined,
        kind,
        jobStatus,
        createdById: user.id,
        barcodes: {
          create: [
            { ownerType: "FOLDER", slot: 1, value: sid, symbology: input.nativeSymbology ?? "QR" },
            ...linked.map((row) => ({
              ownerType: "FOLDER" as const,
              slot: 2,
              value: row.value,
              symbology: (row.symbology as BarcodeSymbology) || "CODE128",
            })),
          ],
        },
      },
    });
    if (input.tags?.length) {
      for (const name of input.tags) {
        const tag = await upsertTag(tx, user.organizationId, name);
        await tx.folderTag.create({ data: { folderId: folder.id, tagId: tag.id } });
      }
    }
    if (input.customValues?.length) {
      await writeCustomFieldValues(tx, user.organizationId, { folderId: folder.id }, input.customValues);
    }
    if (input.dateAlerts?.length) {
      for (const alert of input.dateAlerts) {
        await tx.alert.create({
          data: {
            organizationId: user.organizationId,
            kind: "DATE",
            folderId: folder.id,
            fieldId: alert.fieldId,
            dateWhen: alert.dateWhen,
            dateOffset: alert.dateWhen === "ON" ? null : (alert.dateOffset ?? 1),
            dateOffsetUnit: alert.dateWhen === "ON" ? null : (alert.dateOffsetUnit ?? "DAYS"),
            recipientKind: alert.recipientKind ?? "SELF",
            recipientIds: alert.recipientIds ?? [],
            createdById: user.id,
          },
        });
      }
    }
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "FOLDER_CREATED",
      folderId: folder.id,
      userId: user.id,
    });
    return folder;
  });
}

export async function updateFolder(
  user: AuthUser,
  folderId: string,
  input: {
    name?: string;
    notes?: string | null;
    kind?: "ITEM" | "JOB";
    jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
    tags?: string[];
    customValues?: CustomValuePayload[];
  },
) {
  assertCan(user, "edit_folder");
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!folder) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, folderId, "EDIT");
  if (input.name !== undefined && !input.name.trim()) throw new Error("Folder name is required");

  const nextKind = input.kind ?? folder.kind;
  let nextJobStatus = input.jobStatus !== undefined ? input.jobStatus : folder.jobStatus;
  if (nextKind === "ITEM") nextJobStatus = null;
  else if (nextKind === "JOB" && !nextJobStatus) nextJobStatus = "NOT_STARTED";

  return prisma.$transaction(async (tx) => {
    const updated = await tx.folder.update({
      where: { id: folderId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.kind !== undefined || input.jobStatus !== undefined
          ? { kind: nextKind, jobStatus: nextJobStatus }
          : {}),
      },
    });
    if (input.tags) {
      await tx.folderTag.deleteMany({ where: { folderId } });
      for (const name of input.tags) {
        const tag = await upsertTag(tx, user.organizationId, name);
        await tx.folderTag.create({ data: { folderId, tagId: tag.id } });
      }
    }
    await writeCustomFieldValues(tx, user.organizationId, { folderId }, input.customValues);
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "FOLDER_EDITED",
      folderId,
      userId: user.id,
      payload: JSON.parse(JSON.stringify(input)),
    });
    return updated;
  });
}

async function getAncestorCount(folderId: string) {
  let count = 0;
  let current = await prisma.folder.findUnique({ where: { id: folderId }, select: { parentId: true } });
  const seen = new Set<string>();
  while (current) {
    count += 1;
    if (!current.parentId || seen.has(current.parentId)) break;
    seen.add(current.parentId);
    current = await prisma.folder.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }
  return count;
}

async function descendantIds(organizationId: string, folderId: string) {
  const folders = await prisma.folder.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, parentId: true },
  });
  const kids = new Map<string | null, string[]>();
  for (const folder of folders) {
    const list = kids.get(folder.parentId) ?? [];
    list.push(folder.id);
    kids.set(folder.parentId, list);
  }
  const ids: string[] = [];
  const walk = (id: string) => {
    for (const child of kids.get(id) ?? []) {
      ids.push(child);
      walk(child);
    }
  };
  walk(folderId);
  return ids;
}

export async function validateFolderMove(user: AuthUser, folderId: string, parentId: string) {
  assertCan(user, "edit_folder");
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!folder || !folder.parentId) throw new Error("This folder cannot be moved");
  if (parentId === folderId) throw new Error("A folder cannot be moved into itself");
  const dest = await prisma.folder.findFirst({
    where: { id: parentId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!dest) throw new Error("Destination folder not found");
  await assertFolderAccess(user, folderId, "EDIT");
  await assertFolderAccess(user, parentId, "EDIT");
  const nested = await descendantIds(user.organizationId, folderId);
  if (nested.includes(parentId)) throw new Error("A folder cannot be moved into one of its subfolders");
  if ((await getAncestorCount(parentId)) >= 6) {
    throw new Error("Folders can only nest 6 levels including All Items");
  }
  return folder;
}

export async function moveFolder(user: AuthUser, folderId: string, parentId: string, meta?: { reason?: string | null; note?: string | null }) {
  const folder = await validateFolderMove(user, folderId, parentId);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.folder.update({ where: { id: folderId }, data: { parentId } });
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "FOLDER_EDITED",
      folderId,
      fromFolderId: folder.parentId,
      toFolderId: parentId,
      userId: user.id,
      reason: meta?.reason ?? undefined,
      note: meta?.note ?? undefined,
      payload: { action: "move" },
    });
    return updated;
  });
}

export async function cloneFolder(
  user: AuthUser,
  folderId: string,
  input: { includeContents?: boolean; name?: string; parentId?: string } = {},
) {
  assertCan(user, "edit_folder");
  const original = await prisma.folder.findFirst({
    where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
    include: { tags: true, customValues: true, photos: true },
  });
  if (!original || !original.parentId) throw new Error("This folder cannot be cloned");
  const parentId = input.parentId ?? original.parentId;
  await assertFolderAccess(user, parentId, "EDIT");

  async function copyFolder(tx: TxClient, sourceId: string, destParentId: string, destName: string) {
    const source = await tx.folder.findFirst({
      where: { id: sourceId },
      include: { tags: true, customValues: true, photos: true },
    });
    if (!source) throw new Error("NOT_FOUND");
    const sid = generateSid();
    const clone = await tx.folder.create({
      data: {
        organizationId: user.organizationId,
        parentId: destParentId,
        sid,
        name: destName,
        notes: source.notes,
        kind: source.kind,
        jobStatus: source.kind === "JOB" ? source.jobStatus ?? "NOT_STARTED" : null,
        createdById: user.id,
        barcodes: { create: { ownerType: "FOLDER", slot: 1, value: sid, symbology: "QR" } },
        tags: { create: source.tags.map((row) => ({ tagId: row.tagId })) },
      },
    });
    for (const photo of source.photos) {
      await tx.photo.create({
        data: {
          ownerType: "FOLDER",
          folderId: clone.id,
          sortOrder: photo.sortOrder,
          storageKey: photo.storageKey,
          publicUrl: photo.publicUrl,
          mimeType: photo.mimeType,
        },
      });
    }
    for (const value of source.customValues) {
      await tx.customFieldValue.create({
        data: {
          fieldId: value.fieldId,
          ownerType: "FOLDER",
          folderId: clone.id,
          valueText: value.valueText,
          valueDate: value.valueDate,
          valueNum: value.valueNum,
          valueBool: value.valueBool,
        },
      });
    }
    if (input.includeContents) {
      const items = await tx.item.findMany({
        where: { folderId: source.id, deletedAt: null },
        include: { tags: true, customValues: true, photos: true },
      });
      for (const item of items) {
        const copy = await tx.item.create({
          data: {
            organizationId: user.organizationId,
            folderId: clone.id,
            sid: item.sid,
            name: item.name,
            quantity: item.quantity,
            unitId: item.unitId,
            minQuantity: item.minQuantity,
            price: item.price,
            notes: item.notes,
            productLink: item.productLink,
            createdById: user.id,
            barcodes: { create: { ownerType: "ITEM", slot: 1, value: item.sid, symbology: "QR" } },
            tags: { create: item.tags.map((t) => ({ tagId: t.tagId })) },
          },
        });
        for (const photo of item.photos) {
          await tx.photo.create({
            data: {
              ownerType: "ITEM",
              itemId: copy.id,
              sortOrder: photo.sortOrder,
              storageKey: photo.storageKey,
              publicUrl: photo.publicUrl,
              mimeType: photo.mimeType,
            },
          });
        }
        for (const value of item.customValues) {
          await tx.customFieldValue.create({
            data: {
              fieldId: value.fieldId,
              ownerType: "ITEM",
              itemId: copy.id,
              valueText: value.valueText,
              valueDate: value.valueDate,
              valueNum: value.valueNum,
              valueBool: value.valueBool,
            },
          });
        }
      }
      const children = await tx.folder.findMany({ where: { parentId: source.id, deletedAt: null } });
      for (const child of children) {
        await copyFolder(tx, child.id, clone.id, child.name);
      }
    }
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "CLONE",
      folderId: clone.id,
      userId: user.id,
      payload: { fromFolderId: source.id, includeContents: Boolean(input.includeContents) },
    });
    return clone;
  }

  return prisma.$transaction(async (tx) =>
    copyFolder(tx, original.id, parentId, input.name?.trim() || `${original.name} (Copy)`),
  );
}

export async function softDeleteFolder(user: AuthUser, folderId: string, meta?: { reason?: string | null; note?: string | null }) {
  assertCan(user, "edit_folder");
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!folder || !folder.parentId) throw new Error("The All Items folder cannot be deleted");
  await assertFolderAccess(user, folderId, "EDIT");
  const nested = [folderId, ...(await descendantIds(user.organizationId, folderId))];
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.item.updateMany({
      where: { folderId: { in: nested }, deletedAt: null },
      data: { deletedAt: now },
    });
    await tx.folder.updateMany({
      where: { id: { in: nested }, deletedAt: null },
      data: { deletedAt: now },
    });
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "FOLDER_DELETED",
      folderId,
      userId: user.id,
      reason: meta?.reason ?? undefined,
      note: meta?.note ?? undefined,
    });
    return { ok: true };
  });
}

export async function getFolder(user: AuthUser, folderId: string) {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
      customValues: { include: { field: true } },
      barcodes: true,
    },
  });
  if (!folder) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, folderId, "VIEW");
  return folder;
}

export async function listFolderHistory(user: AuthUser, folderId: string) {
  await assertFolderAccess(user, folderId, "VIEW");
  return prisma.inventoryTransaction.findMany({
    where: { organizationId: user.organizationId, folderId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { firstName: true, lastName: true } } },
  });
}

export async function exportFolderItems(user: AuthUser, folderId: string) {
  assertCan(user, "export");
  await assertFolderAccess(user, folderId, "VIEW");
  const [folder, items] = await Promise.all([
    prisma.folder.findFirst({
      where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
      select: { name: true },
    }),
    prisma.item.findMany({
      where: { organizationId: user.organizationId, folderId, deletedAt: null },
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!folder) throw new Error("NOT_FOUND");
  const header = ["Name", "SID", "Quantity", "Unit", "Min Level", "Price", "Value"];
  const rows = items.map((item) => {
    const qty = Number(item.quantity);
    const price = Number(item.price ?? 0);
    return [
      item.name,
      item.sid,
      String(qty),
      item.unit?.abbreviation ?? "",
      item.minQuantity == null ? "" : String(item.minQuantity),
      String(price),
      String(qty * price),
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  return { csv, filename: `${folder.name.replace(/[^\w.-]+/g, "-") || "folder"}-export.csv` };
}

export async function getFolderPermissions(user: AuthUser, folderId: string) {
  await assertFolderAccess(user, folderId, "EDIT");
  const [people, acls] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: user.organizationId, status: { not: "DEACTIVATED" } },
      select: { id: true, firstName: true, lastName: true, role: { select: { kind: true, name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.folderAcl.findMany({ where: { folderId } }),
  ]);
  const aclByUser = new Map(acls.map((row) => [row.userId, row.grant]));
  const access = [];
  const addable = [];
  for (const person of people) {
    const full = person.role.kind === "SUPER_ADMIN" || person.role.kind === "ADMIN";
    const grant = full ? "EDIT" : aclByUser.get(person.id);
    const row = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      role: person.role,
      grant: grant ?? null,
      locked: full,
    };
    if (grant) access.push(row);
    else addable.push(row);
  }
  return { access, addable };
}

export async function saveFolderPermissions(
  user: AuthUser,
  folderId: string,
  grants: { userId: string; grant: "VIEW" | "EDIT" }[],
) {
  await assertFolderAccess(user, folderId, "EDIT");
  const allowed = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      id: { in: grants.map((row) => row.userId) },
      role: { kind: { notIn: ["SUPER_ADMIN", "ADMIN"] } },
    },
    select: { id: true },
  });
  const allowedIds = new Set(allowed.map((row) => row.id));
  await prisma.$transaction(async (tx) => {
    await tx.folderAcl.deleteMany({ where: { folderId } });
    const rows = grants.filter((row) => allowedIds.has(row.userId));
    if (rows.length) {
      await tx.folderAcl.createMany({
        data: rows.map((row) => ({ folderId, userId: row.userId, grant: row.grant })),
      });
    }
  });
  return getFolderPermissions(user, folderId);
}

export async function listFolderAlerts(user: AuthUser, folderId: string) {
  await assertFolderAccess(user, folderId, "VIEW");
  return prisma.alert.findMany({
    where: { organizationId: user.organizationId, folderId, kind: "DATE" },
    orderBy: { createdAt: "asc" },
  });
}

export async function saveFolderDateAlert(
  user: AuthUser,
  folderId: string,
  alert: {
    fieldId: string;
    dateWhen: DateWhen;
    dateOffset?: number | null;
    dateOffsetUnit?: DateOffsetUnit | null;
    recipientKind?: AlertRecipientKind;
    recipientIds?: string[];
  },
) {
  assertCan(user, "set_alerts");
  await assertFolderAccess(user, folderId, "EDIT");
  await prisma.alert.deleteMany({ where: { folderId, fieldId: alert.fieldId } });
  return prisma.alert.create({
    data: {
      organizationId: user.organizationId,
      kind: "DATE",
      folderId,
      fieldId: alert.fieldId,
      dateWhen: alert.dateWhen,
      dateOffset: alert.dateWhen === "ON" ? null : (alert.dateOffset ?? 1),
      dateOffsetUnit: alert.dateWhen === "ON" ? null : (alert.dateOffsetUnit ?? "DAYS"),
      recipientKind: alert.recipientKind ?? "SELF",
      recipientIds: alert.recipientIds ?? [],
      createdById: user.id,
    },
  });
}

export async function saveItemAlert(
  user: AuthUser,
  itemId: string,
  alert: {
    kind: "QUANTITY" | "DATE";
    qtyComparator?: QtyComparator | null;
    fieldId?: string | null;
    dateWhen?: DateWhen | null;
    dateOffset?: number | null;
    dateOffsetUnit?: DateOffsetUnit | null;
    recipientKind?: AlertRecipientKind;
    recipientIds?: string[];
  },
) {
  assertCan(user, "set_alerts");
  const item = await prisma.item.findFirst({ where: { id: itemId, organizationId: user.organizationId, deletedAt: null } });
  if (!item) throw new Error("Item not found");
  await assertFolderAccess(user, item.folderId, "EDIT");
  if (alert.kind === "QUANTITY") {
    await prisma.alert.deleteMany({ where: { itemId, kind: "QUANTITY" } });
    return prisma.alert.create({
      data: {
        organizationId: user.organizationId,
        kind: "QUANTITY",
        itemId,
        qtyComparator: alert.qtyComparator ?? "AT_OR_BELOW_MIN",
        recipientKind: alert.recipientKind ?? "SELF",
        recipientIds: alert.recipientIds ?? [],
        createdById: user.id,
      },
    });
  }
  if (!alert.fieldId || !alert.dateWhen) throw new Error("Choose a date field and when to alert");
  await prisma.alert.deleteMany({ where: { itemId, fieldId: alert.fieldId } });
  return prisma.alert.create({
    data: {
      organizationId: user.organizationId,
      kind: "DATE",
      itemId,
      fieldId: alert.fieldId,
      dateWhen: alert.dateWhen,
      dateOffset: alert.dateWhen === "ON" ? null : (alert.dateOffset ?? 1),
      dateOffsetUnit: alert.dateWhen === "ON" ? null : (alert.dateOffsetUnit ?? "DAYS"),
      recipientKind: alert.recipientKind ?? "SELF",
      recipientIds: alert.recipientIds ?? [],
      createdById: user.id,
    },
  });
}

export async function updateQuantity(
  user: AuthUser,
  input: { itemId: string; newQuantity: number; reason?: string | null; note?: string | null; mode?: "SET" | "ADD" | "SUBTRACT" },
) {
  assertCan(user, "update_quantity");
  if (input.newQuantity < 0) throw new Error("Quantity cannot go below 0");

  return prisma.$transaction(async (tx) => {
    const item = await lockItem(tx, input.itemId);
    if (!item || item.deletedAt) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, item.folderId, "EDIT");
    await assertNotCompletedJobFolder(user.organizationId, item.folderId);

    const before = Number(item.quantity);
    const after = input.newQuantity;
    const delta = after - before;
    const type = input.mode === "ADD" ? "QTY_ADD" : input.mode === "SUBTRACT" ? "QTY_SUBTRACT" : delta >= 0 ? "QTY_ADD" : "QTY_SUBTRACT";

    const updated = await tx.item.update({
      where: { id: item.id },
      data: { quantity: after, updatedById: user.id },
    });

    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: input.mode === "SET" ? "QTY_SET" : type,
      itemId: item.id,
      folderId: item.folderId,
      qtyBefore: before,
      qtyAfter: after,
      qtyDelta: delta,
      reason: input.reason,
      note: input.note,
      userId: user.id,
    });

    await maybeFireQtyAlert(tx, updated, user.organizationId);
    return updated;
  });
}

export async function moveItemQty(
  user: AuthUser,
  input: {
    itemId: string;
    destinationFolderId: string;
    quantity: number;
    reason?: string | null;
    note?: string | null;
  },
) {
  assertCan(user, "move_item");
  if (input.quantity <= 0) throw new Error("Quantity to move must be greater than 0");

  return prisma.$transaction(async (tx) => {
    const item = await lockItem(tx, input.itemId);
    if (!item || item.deletedAt) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, item.folderId, "EDIT");
    await assertFolderAccess(user, input.destinationFolderId, "EDIT");
    await assertNotCompletedJobFolder(user.organizationId, item.folderId);
    await assertNotCompletedJobFolder(user.organizationId, input.destinationFolderId);
    if (item.folderId === input.destinationFolderId) throw new Error("Item is already in that folder");

    const available = Number(item.quantity);
    if (input.quantity > available) throw new Error("Cannot move more than the quantity on hand");

    let dest = await tx.item.findFirst({
      where: {
        organizationId: user.organizationId,
        folderId: input.destinationFolderId,
        sid: item.sid,
        deletedAt: null,
      },
    });
    if (dest) {
      await lockItem(tx, dest.id);
    }

    const sourceAfter = available - input.quantity;
    await tx.item.update({
      where: { id: item.id },
      data: { quantity: sourceAfter, updatedById: user.id },
    });

    if (!dest) {
      dest = await tx.item.create({
        data: {
          organizationId: user.organizationId,
          folderId: input.destinationFolderId,
          sid: item.sid,
          name: item.name,
          quantity: input.quantity,
          unitId: item.unitId,
          minQuantity: item.minQuantity,
          price: item.price,
          notes: item.notes,
          productLink: item.productLink,
          lastFromFolderId: item.folderId,
          createdById: user.id,
          updatedById: user.id,
          barcodes: {
            create: { ownerType: "ITEM", slot: 1, value: item.sid, symbology: "QR" },
          },
        },
      });
    } else {
      dest = await tx.item.update({
        where: { id: dest.id },
        data: {
          quantity: Number(dest.quantity) + input.quantity,
          lastFromFolderId: item.folderId,
          updatedById: user.id,
        },
      });
    }

    const batchId = randomUUID();
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "MOVE",
      itemId: item.id,
      folderId: item.folderId,
      fromFolderId: item.folderId,
      toFolderId: input.destinationFolderId,
      qtyBefore: available,
      qtyAfter: sourceAfter,
      qtyDelta: -input.quantity,
      reason: input.reason,
      note: input.note,
      userId: user.id,
      batchId,
    });
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "MOVE",
      itemId: dest.id,
      folderId: dest.folderId,
      fromFolderId: item.folderId,
      toFolderId: dest.folderId,
      qtyDelta: input.quantity,
      reason: input.reason,
      note: input.note,
      userId: user.id,
      batchId,
    });

    return { sourceId: item.id, destinationId: dest.id, destinationFolderId: dest.folderId };
  });
}

export async function cloneItem(
  user: AuthUser,
  input: { itemId: string; name?: string; count?: number; newSid?: boolean; folderId?: string },
) {
  assertCan(user, "clone_item");
  const count = Math.min(Math.max(input.count ?? 1, 1), 30);
  const original = await prisma.item.findUnique({
    where: { id: input.itemId },
    include: { tags: true, customValues: true, photos: true },
  });
  if (!original || original.deletedAt) throw new Error("NOT_FOUND");
  const folderId = input.folderId ?? original.folderId;
  await assertFolderAccess(user, folderId, "EDIT");

  const created = [];
  for (let i = 0; i < count; i++) {
    const sid = input.newSid ? generateSid() : original.sid;
    const item = await prisma.$transaction(async (tx) => {
      const clone = await tx.item.create({
        data: {
          organizationId: user.organizationId,
          folderId,
          sid,
          name: input.name?.trim() || `${original.name} (Copy)`,
          quantity: original.quantity,
          unitId: original.unitId,
          minQuantity: original.minQuantity,
          price: original.price,
          notes: original.notes,
          productLink: original.productLink,
          createdById: user.id,
          barcodes: { create: { ownerType: "ITEM", slot: 1, value: sid, symbology: "QR" } },
          tags: { create: original.tags.map((t) => ({ tagId: t.tagId })) },
        },
      });
      for (const photo of original.photos) {
        await tx.photo.create({
          data: {
            ownerType: "ITEM",
            itemId: clone.id,
            sortOrder: photo.sortOrder,
            storageKey: photo.storageKey,
            publicUrl: photo.publicUrl,
            mimeType: photo.mimeType,
          },
        });
      }
      for (const value of original.customValues) {
        await tx.customFieldValue.create({
          data: {
            fieldId: value.fieldId,
            ownerType: "ITEM",
            itemId: clone.id,
            valueText: value.valueText,
            valueDate: value.valueDate,
            valueNum: value.valueNum,
            valueBool: value.valueBool,
          },
        });
      }
      await writeTxn(tx, {
        organizationId: user.organizationId,
        type: "CLONE",
        itemId: clone.id,
        folderId,
        userId: user.id,
        payload: { fromItemId: original.id, keepSid: !input.newSid },
      });
      return clone;
    });
    created.push(item);
  }
  return created;
}

export async function softDeleteItem(user: AuthUser, itemId: string, reason?: string, note?: string) {
  assertCan(user, "delete_item");
  return prisma.$transaction(async (tx) => {
    const item = await lockItem(tx, itemId);
    if (!item || item.deletedAt) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, item.folderId, "EDIT");
    const updated = await tx.item.update({
      where: { id: itemId },
      data: { deletedAt: new Date(), deletedReason: reason, deletedNote: note },
    });
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "ITEM_DELETED",
      itemId,
      folderId: item.folderId,
      reason,
      note,
      userId: user.id,
    });
    return updated;
  });
}

export async function restoreItem(user: AuthUser, itemId: string) {
  assertCan(user, "delete_item");
  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, item.folderId, "EDIT");
    const updated = await tx.item.update({
      where: { id: itemId },
      data: { deletedAt: null, deletedReason: null, deletedNote: null },
    });
    await writeTxn(tx, {
      organizationId: user.organizationId,
      type: "ITEM_RESTORED",
      itemId,
      folderId: item.folderId,
      userId: user.id,
    });
    return updated;
  });
}

async function maybeFireQtyAlert(tx: TxClient, item: { id: string; quantity: unknown; minQuantity: unknown; name: string }, organizationId: string) {
  const qty = Number(item.quantity);
  const min = item.minQuantity == null ? null : Number(item.minQuantity);
  if (min == null) return;
  const alert = await tx.alert.findFirst({
    where: { itemId: item.id, kind: "QUANTITY" },
  });
  if (!alert) return;
  const cmp = alert.qtyComparator ?? "AT_OR_BELOW_MIN";
  const hit =
    cmp === "BELOW_MIN"
      ? qty < min
      : cmp === "ABOVE_MIN"
        ? qty > min
        : cmp === "GREATER_THAN"
          ? qty > min
          : cmp === "WITHOUT_MIN_SET"
            ? false
            : qty <= min;
  if (!hit) return;
  await deliverAlert(tx, organizationId, alert.id, item.id, null, "Low stock", `${item.name} is at or below min level (${qty} / ${min})`);
}

async function deliverAlert(
  tx: TxClient,
  organizationId: string,
  alertId: string,
  itemId: string | null,
  folderId: string | null,
  title: string,
  body: string,
) {
  const alert = await tx.alert.findUnique({ where: { id: alertId } });
  if (!alert) return;
  const recipientIds = await resolveAlertRecipients(tx, organizationId, alert.recipientKind, alert.recipientIds, alert.createdById);
  await tx.alert.update({ where: { id: alert.id }, data: { lastTriggeredAt: new Date() } });
  const users = await tx.user.findMany({
    where: { id: { in: recipientIds }, status: "ACTIVE" },
    select: { id: true, email: true, emailAlerts: true },
  });
  for (const person of users) {
    await tx.notification.create({
      data: { organizationId, userId: person.id, alertId: alert.id, itemId, folderId, title, body },
    });
    if (person.emailAlerts) {
      void sendAlertEmail(person.email, title, body);
    }
  }
}

export async function evaluateDateAlerts(organizationId: string) {
  const alerts = await prisma.alert.findMany({
    where: { organizationId, kind: "DATE" },
    include: { item: { include: { customValues: true } } },
  });
  const now = new Date();
  for (const alert of alerts) {
    if (!alert.fieldId) continue;
    let date: Date | null = null;
    if (alert.itemId) {
      const value = await prisma.customFieldValue.findFirst({ where: { fieldId: alert.fieldId, itemId: alert.itemId } });
      date = value?.valueDate ?? null;
    } else if (alert.folderId) {
      const value = await prisma.customFieldValue.findFirst({ where: { fieldId: alert.fieldId, folderId: alert.folderId } });
      date = value?.valueDate ?? null;
    }
    if (!date) continue;
    const offset = alert.dateOffset ?? 0;
    const unit = alert.dateOffsetUnit ?? "DAYS";
    const ms =
      unit === "YEARS" ? offset * 365 * 86400000 : unit === "MONTHS" ? offset * 30 * 86400000 : unit === "WEEKS" ? offset * 7 * 86400000 : offset * 86400000;
    const when = alert.dateWhen ?? "ON";
    const target = when === "BEFORE" ? new Date(date.getTime() - ms) : when === "AFTER" ? new Date(date.getTime() + ms) : date;
    const sameDay = target.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const already = alert.lastTriggeredAt && alert.lastTriggeredAt.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    if (!sameDay || already) continue;
    const name = alert.item?.name ?? "Folder";
    await prisma.$transaction(async (tx) => {
      await deliverAlert(tx, organizationId, alert.id, alert.itemId, alert.folderId, "Date alert", `${name} has a date alert for today.`);
    });
  }
}

export async function savePhoto(ownerType: "ITEM" | "FOLDER", ownerId: string, file: File) {
  const count = await prisma.photo.count({
    where: ownerType === "ITEM" ? { itemId: ownerId } : { folderId: ownerId },
  });
  if (count >= MAX_PHOTOS) throw new Error("Maximum of 8 photos");
  const buf = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const stored = await uploadMedia({
    folder: "photos",
    filename: `${ownerType.toLowerCase()}-${ownerId}-${id}.${ext}`,
    body: buf,
    contentType: file.type || "image/jpeg",
  });
  const data: {
    ownerType: "ITEM" | "FOLDER";
    sortOrder: number;
    storageKey: string;
    mimeType: string;
    publicUrl?: string;
    itemId?: string;
    folderId?: string;
  } = {
    ownerType,
    sortOrder: count + 1,
    storageKey: stored.storageKey,
    mimeType: file.type || "image/jpeg",
  };
  if (stored.publicUrl) data.publicUrl = stored.publicUrl;
  if (ownerType === "ITEM") data.itemId = ownerId;
  else data.folderId = ownerId;
  return prisma.photo.create({ data });
}
