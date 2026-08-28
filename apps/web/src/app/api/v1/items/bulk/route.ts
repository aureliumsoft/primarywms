import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { customValueInputSchema } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";
import { bulkDeleteItems, bulkEditFolders, bulkEditItems, bulkMoveItems, bulkMoveSelection } from "@/lib/bulk";

const schema = z.object({
  action: z.enum(["edit", "move", "move-selection", "delete", "edit-folders"]),
  itemIds: z.array(z.string().uuid()).optional(),
  folderIds: z.array(z.string().uuid()).optional(),
  destinationFolderId: z.string().uuid().optional(),
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  name: z.string().optional(),
  minQuantity: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  unitId: z.string().uuid().optional(),
  tags: z.object({ mode: z.enum(["add", "remove", "replace"]), names: z.array(z.string()) }).optional(),
  quantity: z.object({ newQuantity: z.number(), reason: z.string().nullable().optional(), note: z.string().nullable().optional() }).optional(),
  quantityDelta: z.object({ delta: z.number(), reason: z.string().nullable().optional(), note: z.string().nullable().optional() }).optional(),
  customValues: z.array(customValueInputSchema).optional(),
  applyToItems: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, schema);
    if (body.action === "edit") {
      return ok(await bulkEditItems(user, { itemIds: body.itemIds ?? [], ...body }));
    }
    if (body.action === "move") {
      if (!body.destinationFolderId) throw new Error("Choose a destination folder");
      return ok(await bulkMoveItems(user, { itemIds: body.itemIds ?? [], destinationFolderId: body.destinationFolderId, reason: body.reason, note: body.note }));
    }
    if (body.action === "move-selection") {
      if (!body.destinationFolderId) throw new Error("Choose a destination folder");
      return ok(
        await bulkMoveSelection(user, {
          itemIds: body.itemIds ?? [],
          folderIds: body.folderIds ?? [],
          destinationFolderId: body.destinationFolderId,
          reason: body.reason,
          note: body.note,
        }),
      );
    }
    if (body.action === "delete") {
      return ok(
        await bulkDeleteItems(user, body.itemIds ?? [], { reason: body.reason, note: body.note }),
      );
    }
    return ok(
      await bulkEditFolders(user, {
        folderIds: body.folderIds ?? [],
        name: body.name,
        notes: body.notes,
        tags: body.tags?.names,
        applyToItems: body.applyToItems,
        customValues: body.customValues,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
