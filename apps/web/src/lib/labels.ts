import type { BarcodeSymbology } from "@primarywms/db";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan } from "./auth";
import { allocateUniqueSid } from "./barcodes";
import { sendMail } from "./email";
import type { SavedLabelConfig } from "./saved-label-config";
import { getLabelSize } from "./label-sizes";

export async function createUnlinkedLabels(
  user: AuthUser,
  input: { name: string; count: number; symbology: BarcodeSymbology },
) {
  assertCan(user, "create_label");
  const name = input.name.trim();
  if (!name) throw new Error("Enter a label name");
  const count = Math.floor(input.count);
  if (count < 1) throw new Error("Create at least one label");
  if (count > 1500) throw new Error("You can create at most 1500 labels at a time");

  const rows: { name: string; value: string; symbology: BarcodeSymbology }[] = [];
  for (let i = 0; i < count; i++) {
    const value = await allocateUniqueSid(user.organizationId);
    await prisma.unlinkedLabel.create({
      data: {
        organizationId: user.organizationId,
        name,
        value,
        symbology: input.symbology,
      },
    });
    rows.push({ name, value, symbology: input.symbology });
  }
  return rows;
}

export async function listUnlinkedLabels(user: AuthUser) {
  return prisma.unlinkedLabel.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function emailLabelCopy(user: AuthUser, to: string, summary: string) {
  const email = to.trim();
  if (!email || !email.includes("@")) throw new Error("Enter a valid email");
  await sendMail(
    email,
    `Your Primary WMS labels`,
    `Hi ${user.firstName || "there"},\n\nYour labels are ready. Print at 100% / actual size from the browser print dialog (or Save as PDF).\n\n${summary}\n\nReprinting does not change the stored QR or barcode value.`,
  );
}

export async function saveLinkedLabel(
  user: AuthUser,
  input: {
    itemId?: string;
    folderId?: string;
    name: string;
    codeValue: string;
    kind: string;
    sizeId: string;
    config: SavedLabelConfig;
  },
) {
  assertCan(user, "create_label");
  if (!getLabelSize(input.sizeId)) throw new Error("Unknown label size");
  if (!input.itemId && !input.folderId) throw new Error("Choose an item or folder");
  if (input.itemId && input.folderId) throw new Error("Choose one target");

  return prisma.savedLabel.create({
    data: {
      organizationId: user.organizationId,
      createdById: user.id,
      itemId: input.itemId ?? null,
      folderId: input.folderId ?? null,
      name: input.name.trim(),
      codeValue: input.codeValue.trim(),
      kind: input.kind,
      sizeId: input.sizeId,
      config: input.config,
    },
  });
}

export async function listSavedLabels(user: AuthUser, owner: { itemId?: string; folderId?: string }) {
  if (!owner.itemId && !owner.folderId) return [];
  return prisma.savedLabel.findMany({
    where: {
      organizationId: user.organizationId,
      ...(owner.itemId ? { itemId: owner.itemId } : {}),
      ...(owner.folderId ? { folderId: owner.folderId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
