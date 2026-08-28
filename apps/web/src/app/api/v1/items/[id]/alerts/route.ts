import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { saveItemAlert } from "@/lib/inventory";
import { handleError, ok, readJson } from "@/lib/http";

const postSchema = z.object({
  kind: z.enum(["QUANTITY", "DATE"]),
  qtyComparator: z.enum(["AT_OR_BELOW_MIN", "BELOW_MIN", "ABOVE_MIN", "GREATER_THAN", "WITH_MIN_SET", "WITHOUT_MIN_SET"]).optional(),
  fieldId: z.string().uuid().optional(),
  dateWhen: z.enum(["BEFORE", "ON", "AFTER"]).optional(),
  dateOffset: z.number().int().min(1).nullable().optional(),
  dateOffsetUnit: z.enum(["DAYS", "WEEKS", "MONTHS", "YEARS"]).nullable().optional(),
  recipientKind: z.enum(["SELF", "SUPER_ADMINS", "ADMINS", "TEAM_MEMBERS", "CUSTOM_ROLES", "PEOPLE"]).optional(),
  recipientIds: z.array(z.string().min(1).max(80)).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, postSchema);
    const alert = await saveItemAlert(user, id, body);
    return ok({ alert }, 201);
  } catch (error) {
    return handleError(error);
  }
}
