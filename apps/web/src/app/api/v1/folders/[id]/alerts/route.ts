import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listFolderAlerts, saveFolderDateAlert } from "@/lib/inventory";
import { handleError, ok, readJson } from "@/lib/http";

const postSchema = z.object({
  fieldId: z.string().uuid(),
  dateWhen: z.enum(["BEFORE", "ON", "AFTER"]),
  dateOffset: z.number().int().min(1).nullable().optional(),
  dateOffsetUnit: z.enum(["DAYS", "WEEKS", "MONTHS", "YEARS"]).nullable().optional(),
  recipientKind: z.enum(["SELF", "SUPER_ADMINS", "ADMINS", "TEAM_MEMBERS", "CUSTOM_ROLES", "PEOPLE"]).optional(),
  recipientIds: z.array(z.string().min(1).max(80)).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const alerts = await listFolderAlerts(user, id);
    return ok({ alerts });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, postSchema);
    const alert = await saveFolderDateAlert(user, id, body);
    return ok({ alert }, 201);
  } catch (error) {
    return handleError(error);
  }
}
