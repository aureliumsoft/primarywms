import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { deleteCustomField, updateCustomField } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";

const patchSchema = z.object({
  name: z.string().min(1).max(190).optional(),
  placeholder: z.string().max(190).nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  listVisible: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, patchSchema);
    const field = await updateCustomField(user, id, body);
    return ok({ field });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteCustomField(user, id);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
