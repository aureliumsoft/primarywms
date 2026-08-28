import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { restoreItem } from "@/lib/inventory";
import { fail, handleError, ok } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const [items, folders] = await Promise.all([
      prisma.item.findMany({
        where: { organizationId: user.organizationId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        include: { folder: { select: { name: true } } },
      }),
      prisma.folder.findMany({
        where: { organizationId: user.organizationId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
    ]);
    return ok({ items, folders });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    if (body.itemId) {
      await restoreItem(user, body.itemId);
      return ok({ ok: true });
    }
    if (body.folderId) {
      await prisma.folder.update({
        where: { id: body.folderId },
        data: { deletedAt: null, deletedReason: null, deletedNote: null },
      });
      return ok({ ok: true });
    }
    return fail("Specify itemId or folderId");
  } catch (error) {
    return handleError(error);
  }
}
