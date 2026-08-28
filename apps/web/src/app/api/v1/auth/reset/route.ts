import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request, schema);
    const row = await prisma.passwordReset.findUnique({ where: { token: body.token } });
    if (!row || row.usedAt || row.expiresAt < new Date()) return fail("This reset link is invalid or expired", 400);
    const passwordHash = await hashPassword(body.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: row.userId } }),
    ]);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
