import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, assertFolderAccess, assertCan } from "@/lib/auth";
import { serializeItem, softDeleteItem } from "@/lib/inventory";
import { writeCustomFieldValues, customValueInputSchema } from "@/lib/custom-fields";
import { fail, handleError, ok, readJson } from "@/lib/http";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  minQuantity: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  unitId: z.string().uuid().optional(),
  productLink: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  customValues: z.array(customValueInputSchema).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const item = await prisma.item.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        unit: true,
        folder: true,
        photos: { orderBy: { sortOrder: "asc" } },
        barcodes: true,
        tags: { include: { tag: true } },
        customValues: { include: { field: true } },
      },
    });
    if (!item) return fail("Not found", 404);
    await assertFolderAccess(user, item.folderId, "VIEW");
    const history = await prisma.inventoryTransaction.findMany({
      where: { itemId: item.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return ok({ item: serializeItem(item), history });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertCan(user, "edit_item");
    const { id } = await params;
    const item = await prisma.item.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!item || item.deletedAt) return fail("Not found", 404);
    await assertFolderAccess(user, item.folderId, "EDIT");
    const body = await readJson(request, patchSchema);
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.item.update({
        where: { id },
        data: {
          name: body.name,
          minQuantity: body.minQuantity === undefined ? undefined : body.minQuantity,
          price: body.price === undefined ? undefined : body.price,
          notes: body.notes,
          unitId: body.unitId,
          productLink: body.productLink,
          updatedById: user.id,
        },
      });
      if (body.tags) {
        await tx.itemTag.deleteMany({ where: { itemId: id } });
        for (const name of body.tags) {
          const tag =
            (await tx.tag.findFirst({
              where: { organizationId: user.organizationId, name: { equals: name.trim(), mode: "insensitive" } },
            })) ?? (await tx.tag.create({ data: { organizationId: user.organizationId, name: name.trim() } }));
          await tx.itemTag.create({ data: { itemId: id, tagId: tag.id } });
        }
      }
      if (body.customValues) {
        await writeCustomFieldValues(tx, user.organizationId, { itemId: id }, body.customValues);
      }
      await tx.inventoryTransaction.create({
        data: {
          organizationId: user.organizationId,
          type: "ITEM_EDITED",
          itemId: id,
          folderId: item.folderId,
          userId: user.id,
          payload: body,
        },
      });
      return next;
    });
    return ok({ item: serializeItem(updated) });
  } catch (error) {
    return handleError(error);
  }
}

const deleteSchema = z.object({
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = deleteSchema.parse(await request.json().catch(() => ({})));
    await softDeleteItem(user, id, body.reason ?? undefined, body.note ?? undefined);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
