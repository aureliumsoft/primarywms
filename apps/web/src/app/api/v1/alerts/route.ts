import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleError, ok, readJson, fail } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "set_alerts");
    const kind = request.nextUrl.searchParams.get("kind");
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const alerts = await prisma.alert.findMany({
      where: {
        organizationId: user.organizationId,
        ...(kind === "QUANTITY" || kind === "DATE" ? { kind } : {}),
        ...(q
          ? {
              OR: [
                { item: { name: { contains: q, mode: "insensitive" } } },
                { item: { sid: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        item: { select: { id: true, name: true, sid: true, folder: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const folderIds = [...new Set(alerts.map((a) => a.folderId).filter((id): id is string => Boolean(id)))];
    const folders = folderIds.length
      ? await prisma.folder.findMany({ where: { id: { in: folderIds } }, select: { id: true, name: true } })
      : [];
    const folderName = new Map(folders.map((f) => [f.id, f.name]));
    return ok({
      alerts: alerts.map((a) => ({
        ...a,
        folder: a.folderId ? { id: a.folderId, name: folderName.get(a.folderId) ?? "Folder" } : a.item?.folder ?? null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "set_alerts");
    const body = await readJson(
      request,
      z.object({
        ids: z.array(z.string().uuid()),
        recipientKind: z.enum(["SELF", "SUPER_ADMINS", "ADMINS", "TEAM_MEMBERS", "CUSTOM_ROLES", "PEOPLE"]).optional(),
        recipientIds: z.array(z.string()).optional(),
        delete: z.boolean().optional(),
      }),
    );
    if (body.delete) {
      await prisma.alert.deleteMany({ where: { id: { in: body.ids }, organizationId: user.organizationId } });
      return ok({ deleted: body.ids.length });
    }
    await prisma.alert.updateMany({
      where: { id: { in: body.ids }, organizationId: user.organizationId },
      data: {
        ...(body.recipientKind !== undefined ? { recipientKind: body.recipientKind } : {}),
        ...(body.recipientIds !== undefined ? { recipientIds: body.recipientIds } : {}),
      },
    });
    return ok({ updated: body.ids.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "set_alerts");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return fail("id required");
    await prisma.alert.deleteMany({ where: { id, organizationId: user.organizationId } });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
