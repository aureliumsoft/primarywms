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
        kind: z.enum(["MOVE", "QUANTITY"]),
      }),
    );
    const existing = await prisma.transactionReason.findFirst({
      where: { organizationId: user.organizationId, kind: body.kind, name: { equals: body.name.trim(), mode: "insensitive" } },
    });
    if (existing) return fail("A reason with that name already exists");
    const reason = await prisma.transactionReason.create({
      data: {
        organizationId: user.organizationId,
        name: body.name.trim(),
        kind: body.kind,
        isSystem: false,
        isVisible: true,
      },
    });
    return ok({ reason }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "manage_catalog_settings");
    const body = await readJson(
      request,
      z.object({
        id: z.string().uuid(),
        isVisible: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      }),
    );
    const current = await prisma.transactionReason.findFirst({
      where: { id: body.id, organizationId: user.organizationId },
    });
    if (!current) return fail("Reason not found", 404);
    if (body.isDefault) {
      await prisma.transactionReason.updateMany({
        where: { organizationId: user.organizationId, kind: current.kind, isDefault: true },
        data: { isDefault: false },
      });
    }
    const reason = await prisma.transactionReason.update({
      where: { id: current.id },
      data: {
        ...(body.isVisible === undefined ? {} : { isVisible: body.isVisible }),
        ...(body.isDefault === undefined ? {} : { isDefault: body.isDefault }),
      },
    });
    return ok({ reason });
  } catch (error) {
    return handleError(error);
  }
}
