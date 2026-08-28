import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getFolderPermissions, saveFolderPermissions } from "@/lib/inventory";
import { handleError, ok, readJson } from "@/lib/http";

const putSchema = z.object({
  grants: z.array(
    z.object({
      userId: z.string().uuid(),
      grant: z.enum(["VIEW", "EDIT"]),
    }),
  ),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const permissions = await getFolderPermissions(user, id);
    return ok(permissions);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, putSchema);
    const permissions = await saveFolderPermissions(user, id, body.grants);
    return ok(permissions);
  } catch (error) {
    return handleError(error);
  }
}
