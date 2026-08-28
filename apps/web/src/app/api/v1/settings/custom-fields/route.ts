import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createCustomField, reorderCustomFields } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";

const TYPES = [
  "SMALL_TEXT",
  "LARGE_TEXT",
  "WHOLE_NUMBER",
  "DECIMAL",
  "CHECKBOX",
  "DROPDOWN",
  "DATE",
  "SCANNER",
  "PHONE",
  "WEB_LINK",
  "EMAIL",
  "FILE",
] as const;

const schema = z.object({
  name: z.string().min(1).max(190),
  type: z.enum(TYPES),
  appliesTo: z.enum(["ITEM", "FOLDER", "BOTH"]),
  placeholder: z.string().max(190).nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  options: z.array(z.string().max(190)).max(250).optional(),
  applyDefault: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, schema);
    const field = await createCustomField(user, body);
    return ok({ field }, 201);
  } catch (error) {
    return handleError(error);
  }
}

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, reorderSchema);
    await reorderCustomFields(user, body.order);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
