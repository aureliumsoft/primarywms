import { NextRequest } from "next/server";
import { z } from "zod";
import { ROLE_DEFAULTS, PERMISSIONS } from "@primarywms/shared";
import type { Prisma } from "@primarywms/db";
import { prisma } from "@/lib/db";
import { requireUser, assertCan } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertCan(user, "manage_users");
    const { id } = await params;
    const body = await readJson(
      request,
      z.object({
        name: z.string().min(1).max(80).optional(),
        hidePrices: z.boolean().optional(),
        permissions: z.record(z.boolean()).optional(),
      }),
    );
    const role = await prisma.role.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!role) return fail("Not found", 404);
    if (role.isSystem && role.kind !== "CUSTOM") {
      return fail("System roles cannot be renamed. Create a custom role to change permissions.");
    }
    const permissions = body.permissions
      ? Object.fromEntries(PERMISSIONS.map((key) => [key, Boolean(body.permissions?.[key] ?? (ROLE_DEFAULTS.TEAM_MEMBER as Record<string, boolean>)[key])]))
      : undefined;
    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        hidePrices: body.hidePrices,
        permissions: permissions as Prisma.InputJsonValue | undefined,
      },
    });
    return ok({ role: updated });
  } catch (error) {
    return handleError(error);
  }
}
