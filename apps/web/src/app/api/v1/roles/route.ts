import { NextRequest } from "next/server";
import { z } from "zod";
import { ROLE_DEFAULTS } from "@primarywms/shared";
import type { Prisma } from "@primarywms/db";
import { prisma } from "@/lib/db";
import { requireUser, assertCan } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const roles = await prisma.role.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return ok({ roles });
  } catch (error) {
    return handleError(error);
  }
}

const postSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "manage_users");
    const body = await readJson(request, postSchema);
    const name = body.name.trim();
    const exists = await prisma.role.findFirst({
      where: { organizationId: user.organizationId, name: { equals: name, mode: "insensitive" } },
    });
    if (exists) return fail("A role with that name already exists");
    const role = await prisma.role.create({
      data: {
        organizationId: user.organizationId,
        kind: "CUSTOM",
        name,
        isSystem: false,
        permissions: ROLE_DEFAULTS.TEAM_MEMBER as Prisma.InputJsonValue,
      },
    });
    return ok({ role }, 201);
  } catch (error) {
    return handleError(error);
  }
}
