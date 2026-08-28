import { generateSid } from "@primarywms/shared";
import type { BarcodeSymbology, Prisma } from "@primarywms/db";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, assertFolderAccess } from "./auth";
import { parseScannedCode } from "./scan-code";

export type CodeMatch = {
  kind: "item" | "folder" | "unlinked";
  id: string;
  name: string;
  sid: string;
  href: string;
};

type Tx = Prisma.TransactionClient | typeof prisma;

export function normalizeCode(raw: string) {
  return parseScannedCode(raw);
}

export function guessSymbology(value: string): BarcodeSymbology {
  const v = value.trim();
  if (/^\d{13}$/.test(v)) return "EAN13";
  if (/^\d{8}$/.test(v)) return "EAN8";
  if (/^\d{12}$/.test(v)) return "CODE128";
  if (/^https?:\/\//i.test(v) || /[^A-Z0-9\-.$/+% ]/i.test(v) || v.length > 48) return "QR";
  return "CODE128";
}

async function codeTaken(db: Tx, organizationId: string, value: string, except?: { itemId?: string; folderId?: string }) {
  const code = normalizeCode(value);
  if (!code) return false;
  const [itemSid, folderSid, barcode] = await Promise.all([
    db.item.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        sid: { equals: code, mode: "insensitive" },
        ...(except?.itemId ? { id: { not: except.itemId } } : {}),
      },
      select: { id: true },
    }),
    db.folder.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        sid: { equals: code, mode: "insensitive" },
        ...(except?.folderId ? { id: { not: except.folderId } } : {}),
      },
      select: { id: true },
    }),
    db.barcode.findFirst({
      where: {
        value: { equals: code, mode: "insensitive" },
        OR: [
          { item: { organizationId, deletedAt: null, ...(except?.itemId ? { id: { not: except.itemId } } : {}) } },
          { folder: { organizationId, deletedAt: null, ...(except?.folderId ? { id: { not: except.folderId } } : {}) } },
        ],
      },
      select: { id: true },
    }),
  ]);
  return Boolean(itemSid || folderSid || barcode);
}

async function unlinkedTaken(db: Tx, organizationId: string, value: string) {
  const row = await db.unlinkedLabel.findFirst({
    where: { organizationId, value: { equals: normalizeCode(value), mode: "insensitive" }, linkedAt: null },
    select: { id: true },
  });
  return Boolean(row);
}

export async function allocateUniqueSid(organizationId: string, preferred?: string | null) {
  if (preferred?.trim()) {
    const sid = preferred.trim();
    if ((await codeTaken(prisma, organizationId, sid)) || (await unlinkedTaken(prisma, organizationId, sid))) {
      throw new Error("That code is already in use");
    }
    return sid;
  }
  for (let i = 0; i < 16; i++) {
    const sid = generateSid();
    if (!(await codeTaken(prisma, organizationId, sid)) && !(await unlinkedTaken(prisma, organizationId, sid))) return sid;
  }
  throw new Error("Could not allocate a unique QR / barcode");
}

export async function assertCodesAvailable(
  db: Tx,
  organizationId: string,
  values: string[],
  except?: { itemId?: string; folderId?: string },
) {
  for (const value of values) {
    const code = normalizeCode(value);
    if (!code) continue;
    if (await codeTaken(db, organizationId, code, except)) {
      throw new Error(`QR / barcode ${code} is already linked to another item or folder`);
    }
  }
}

export async function lookupCode(user: AuthUser, raw: string): Promise<CodeMatch | null> {
  const code = normalizeCode(raw);
  if (!code) return null;
  const organizationId = user.organizationId;

  const [item, folder, barcode, unlinked] = await Promise.all([
    prisma.item.findFirst({
      where: { organizationId, deletedAt: null, sid: { equals: code, mode: "insensitive" } },
      select: { id: true, name: true, sid: true, folderId: true },
    }),
    prisma.folder.findFirst({
      where: { organizationId, deletedAt: null, sid: { equals: code, mode: "insensitive" } },
      select: { id: true, name: true, sid: true, parentId: true },
    }),
    prisma.barcode.findFirst({
      where: {
        value: { equals: code, mode: "insensitive" },
        OR: [
          { item: { organizationId, deletedAt: null } },
          { folder: { organizationId, deletedAt: null } },
        ],
      },
      include: {
        item: { select: { id: true, name: true, sid: true, folderId: true, deletedAt: true } },
        folder: { select: { id: true, name: true, sid: true, parentId: true, deletedAt: true } },
      },
    }),
    prisma.unlinkedLabel.findFirst({
      where: { organizationId, value: { equals: code, mode: "insensitive" }, linkedAt: null },
      select: { id: true, name: true, value: true },
    }),
  ]);

  if (unlinked) {
    return {
      kind: "unlinked",
      id: unlinked.id,
      name: unlinked.name,
      sid: unlinked.value,
      href: "/settings/labels",
    };
  }

  const hit = item
    ? { kind: "item" as const, id: item.id, name: item.name, sid: item.sid, folderId: item.folderId }
    : folder
      ? { kind: "folder" as const, id: folder.id, name: folder.name, sid: folder.sid, folderId: folder.id }
      : barcode?.item && !barcode.item.deletedAt
        ? { kind: "item" as const, id: barcode.item.id, name: barcode.item.name, sid: barcode.item.sid, folderId: barcode.item.folderId }
        : barcode?.folder && !barcode.folder.deletedAt
          ? { kind: "folder" as const, id: barcode.folder.id, name: barcode.folder.name, sid: barcode.folder.sid, folderId: barcode.folder.id }
          : null;

  if (!hit) return null;
  try {
    await assertFolderAccess(user, hit.kind === "item" ? hit.folderId : hit.id, "VIEW");
  } catch {
    return null;
  }
  return {
    kind: hit.kind,
    id: hit.id,
    name: hit.name,
    sid: hit.sid,
    href: hit.kind === "item" ? `/item/${hit.id}` : `/folder/${hit.id}/content`,
  };
}

export async function linkOwnerBarcode(
  user: AuthUser,
  owner: { itemId: string } | { folderId: string },
  input: { value: string; symbology?: string },
) {
  assertCan(user, "link_barcode");
  const value = normalizeCode(input.value);
  if (!value) throw new Error("Scan or enter a code to link");
  const symbology = (input.symbology as BarcodeSymbology) || guessSymbology(value);

  if ("itemId" in owner) {
    const item = await prisma.item.findFirst({ where: { id: owner.itemId, organizationId: user.organizationId } });
    if (!item || item.deletedAt) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, item.folderId, "EDIT");
    if (value.toUpperCase() === item.sid.toUpperCase()) throw new Error("That is already this item's native code");
    await assertCodesAvailable(prisma, user.organizationId, [value], { itemId: item.id });
    const count = await prisma.barcode.count({ where: { itemId: item.id } });
    if (count >= 2) throw new Error("This item already has a native code and a linked code");
    const barcode = await prisma.barcode.create({
      data: { ownerType: "ITEM", itemId: item.id, slot: Math.max(count + 1, 2), value, symbology },
    });
    await markUnlinkedUsed(user.organizationId, value, item.id);
    return barcode;
  }

  const folder = await prisma.folder.findFirst({ where: { id: owner.folderId, organizationId: user.organizationId } });
  if (!folder || folder.deletedAt) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, folder.id, "EDIT");
  if (value.toUpperCase() === folder.sid.toUpperCase()) throw new Error("That is already this folder's native code");
  await assertCodesAvailable(prisma, user.organizationId, [value], { folderId: folder.id });
  const count = await prisma.barcode.count({ where: { folderId: folder.id } });
  if (count >= 2) throw new Error("This folder already has a native code and a linked code");
  const barcode = await prisma.barcode.create({
    data: { ownerType: "FOLDER", folderId: folder.id, slot: Math.max(count + 1, 2), value, symbology },
  });
  await markUnlinkedUsed(user.organizationId, value, null);
  return barcode;
}

async function markUnlinkedUsed(organizationId: string, value: string, linkedItemId: string | null) {
  await prisma.unlinkedLabel.updateMany({
    where: { organizationId, value: { equals: value, mode: "insensitive" }, linkedAt: null },
    data: { linkedAt: new Date(), linkedItemId },
  });
}

export async function setNativeSymbology(
  user: AuthUser,
  owner: { itemId: string } | { folderId: string },
  symbology: BarcodeSymbology,
) {
  if ("itemId" in owner) {
    assertCan(user, "edit_item");
    const item = await prisma.item.findFirst({ where: { id: owner.itemId, organizationId: user.organizationId } });
    if (!item || item.deletedAt) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, item.folderId, "EDIT");
    const native = await prisma.barcode.findFirst({ where: { itemId: item.id, slot: 1 } });
    if (native) return prisma.barcode.update({ where: { id: native.id }, data: { symbology, value: item.sid } });
    return prisma.barcode.create({ data: { ownerType: "ITEM", itemId: item.id, slot: 1, value: item.sid, symbology } });
  }
  assertCan(user, "edit_folder");
  const folder = await prisma.folder.findFirst({ where: { id: owner.folderId, organizationId: user.organizationId } });
  if (!folder || folder.deletedAt) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, folder.id, "EDIT");
  const native = await prisma.barcode.findFirst({ where: { folderId: folder.id, slot: 1 } });
  if (native) return prisma.barcode.update({ where: { id: native.id }, data: { symbology, value: folder.sid } });
  return prisma.barcode.create({ data: { ownerType: "FOLDER", folderId: folder.id, slot: 1, value: folder.sid, symbology } });
}

export async function unlinkExtraBarcode(user: AuthUser, barcodeId: string) {
  const row = await prisma.barcode.findFirst({
    where: { id: barcodeId },
    include: { item: true, folder: true },
  });
  if (!row || row.slot === 1) throw new Error("Native QR / barcode cannot be removed");
  if (row.item) {
    assertCan(user, "edit_item");
    if (row.item.organizationId !== user.organizationId) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, row.item.folderId, "EDIT");
  } else if (row.folder) {
    assertCan(user, "edit_folder");
    if (row.folder.organizationId !== user.organizationId) throw new Error("NOT_FOUND");
    await assertFolderAccess(user, row.folder.id, "EDIT");
  } else {
    throw new Error("NOT_FOUND");
  }
  await prisma.barcode.delete({ where: { id: barcodeId } });
}
