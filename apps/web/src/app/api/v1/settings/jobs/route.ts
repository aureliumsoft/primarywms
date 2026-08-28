import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";
import { getJobSettings, updateJobSettings } from "@/lib/jobs";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  defaultSubfolders: z.array(z.string().min(1).max(120)).max(50).optional(),
  extraFieldIds: z.array(z.string().uuid()).max(100).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getJobSettings(user.organizationId);
    const fields = await prisma.customField.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [{ appliesTo: "FOLDER" }, { appliesTo: "BOTH" }],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        appliesTo: true,
        placeholder: true,
        defaultValue: true,
        options: true,
        listVisible: true,
      },
    });
    return ok({
      ...settings,
      extraFields: fields.filter((field) => settings.extraFieldIds.includes(field.id)),
      availableFields: fields,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, patchSchema);
    const settings = await updateJobSettings(user, body);
    return ok(settings);
  } catch (error) {
    return handleError(error);
  }
}
