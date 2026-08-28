import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, assertCan } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "manage_catalog_settings");
    const body = await readJson(
      request,
      z.object({
        name: z.string().min(1).max(80),
        abbreviation: z.string().min(1).max(16),
        type: z.enum(["COUNT", "WEIGHT", "LENGTH", "VOLUME"]).default("COUNT"),
      }),
    );
    const existing = await prisma.unit.findFirst({
      where: { organizationId: user.organizationId, name: { equals: body.name.trim(), mode: "insensitive" } },
    });
    if (existing) return fail("A unit with that name already exists");
    const unit = await prisma.unit.create({
      data: {
        organizationId: user.organizationId,
        name: body.name.trim(),
        abbreviation: body.abbreviation.trim(),
        type: body.type ?? "COUNT",
        isSystem: false,
      },
    });
    return ok({ unit }, 201);
  } catch (error) {
    return handleError(error);
  }
}
