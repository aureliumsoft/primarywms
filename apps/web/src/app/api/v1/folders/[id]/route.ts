import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getFolder, moveFolder, softDeleteFolder, updateFolder } from "@/lib/inventory";
import { customValueInputSchema } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  customValues: z.array(customValueInputSchema).optional(),
  parentId: z.string().uuid().optional(),
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

const deleteSchema = z.object({
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const folder = await getFolder(user, id);
    return ok({
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        sid: folder.sid,
        notes: folder.notes,
        kind: folder.kind,
        jobStatus: folder.jobStatus,
        updatedAt: folder.updatedAt.toISOString(),
        photos: folder.photos.map((p) => ({ id: p.id, publicUrl: p.publicUrl })),
        tags: folder.tags.map((row) => ({ tag: { id: row.tag.id, name: row.tag.name } })),
        customValues: folder.customValues,
        barcodes: folder.barcodes,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, patchSchema);
    if (body.parentId) {
      const folder = await moveFolder(user, id, body.parentId, { reason: body.reason, note: body.note });
      return ok({ folder });
    }
    const folder = await updateFolder(user, id, body);
    return ok({ folder });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    let meta: { reason?: string | null; note?: string | null } | undefined;
    try {
      const body = await readJson(request, deleteSchema);
      meta = { reason: body.reason, note: body.note };
    } catch {
      meta = undefined;
    }
    await softDeleteFolder(user, id, meta);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
