import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(
      request,
      z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        jobFunction: z.string().optional(),
        jobTitle: z.string().optional(),
        phone: z.string().optional(),
        timezoneAuto: z.boolean().optional(),
        timezone: z.string().max(80).nullable().optional(),
        defaultView: z.enum(["GRID", "LIST", "TABLE"]).optional(),
        defaultSort: z.enum(["UPDATED_AT", "NAME", "QUANTITY", "MIN_LEVEL", "PRICE", "TOTAL_VALUE"]).optional(),
        sortDirection: z.enum(["ASC", "DESC"]).optional(),
        emailAlerts: z.boolean().optional(),
        poEmails: z.boolean().optional(),
        theme: z.enum(["SYSTEM", "LIGHT", "DARK"]).optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8).optional(),
      }),
    );
    if (body.newPassword) {
      if (!body.currentPassword) throw new Error("Enter your current password");
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, body.currentPassword))) {
        throw new Error("Current password is incorrect");
      }
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        jobFunction: body.jobFunction,
        jobTitle: body.jobTitle,
        phone: body.phone,
        timezoneAuto: body.timezoneAuto,
        timezone: body.timezone === undefined ? undefined : body.timezone,
        defaultView: body.defaultView,
        defaultSort: body.defaultSort,
        sortDirection: body.sortDirection,
        emailAlerts: body.emailAlerts,
        poEmails: body.poEmails,
        theme: body.theme,
        ...(body.newPassword ? { passwordHash: await hashPassword(body.newPassword) } : {}),
      },
    });
    return ok({ user: { ...updated, passwordHash: undefined } });
  } catch (error) {
    return handleError(error);
  }
}
