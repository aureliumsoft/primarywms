import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createFolder } from "@/lib/inventory";
import { getFolderTree, getRootFolder } from "@/lib/catalog";
import { customValueInputSchema } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  parentId: z.string().uuid(),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  customValues: z.array(customValueInputSchema).optional(),
  barcodes: z
    .array(
      z.object({
        value: z.string().min(1),
        symbology: z.string().optional(),
      }),
    )
    .optional(),
  sid: z.string().min(8).optional(),
  nativeSymbology: z.enum(["QR", "CODE128", "CODE39", "EAN13", "EAN8", "UPCE", "CODE93", "I25", "PDF417", "AZTEC", "DATAMATRIX"]).optional(),
  dateAlerts: z
    .array(
      z.object({
        fieldId: z.string().uuid(),
        dateWhen: z.enum(["BEFORE", "ON", "AFTER"]),
        dateOffset: z.number().int().min(1).nullable().optional(),
        dateOffsetUnit: z.enum(["DAYS", "WEEKS", "MONTHS", "YEARS"]).nullable().optional(),
        recipientKind: z.enum(["SELF", "SUPER_ADMINS", "ADMINS", "TEAM_MEMBERS", "CUSTOM_ROLES", "PEOPLE"]).optional(),
        recipientIds: z.array(z.string().min(1).max(80)).optional(),
      }),
    )
    .optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const [tree, root] = await Promise.all([getFolderTree(user), getRootFolder(user.organizationId)]);
    return ok({ tree, rootId: root.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, schema);
    const folder = await createFolder(user, body);
    return ok({ folder }, 201);
  } catch (error) {
    return handleError(error);
  }
}
