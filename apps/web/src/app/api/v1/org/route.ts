import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, assertCan, can } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const org = await prisma.organization.findFirst({ where: { id: user.organizationId } });
    return ok({ organization: org });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(
      request,
      z.object({
        name: z.string().min(1).max(120).optional(),
        initials: z.string().min(1).max(4).optional(),
        accentColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
        industry: z.string().max(80).nullable().optional(),
        country: z.string().max(80).optional(),
        currency: z.string().max(8).optional(),
        timezone: z.string().max(80).optional(),
        dateFormat: z.string().max(32).optional(),
        returnToOriginEnabled: z.boolean().optional(),
        requireQtyReason: z.boolean().optional(),
        requireMoveReason: z.boolean().optional(),
      }),
    );
    const catalogKeys = ["requireQtyReason", "requireMoveReason"] as const;
    const companyKeys = [
      "name",
      "initials",
      "accentColor",
      "industry",
      "country",
      "currency",
      "timezone",
      "dateFormat",
      "returnToOriginEnabled",
    ] as const;
    const touchesCatalog = catalogKeys.some((k) => body[k] !== undefined);
    const touchesCompany = companyKeys.some((k) => body[k] !== undefined);
    if (touchesCompany) assertCan(user, "company_settings");
    if (touchesCatalog && !can(user, "company_settings") && !can(user, "manage_catalog_settings")) {
      throw new Error("FORBIDDEN");
    }
    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: body,
    });
    return ok({ organization });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role.kind !== "SUPER_ADMIN") return fail("Only Super Admin can delete the organization", 403);
    const body = await readJson(request, z.object({ confirmName: z.string() }));
    const org = await prisma.organization.findFirst({ where: { id: user.organizationId } });
    if (!org || body.confirmName !== org.name) return fail("Confirmation name does not match");
    await prisma.organization.delete({ where: { id: org.id } });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
