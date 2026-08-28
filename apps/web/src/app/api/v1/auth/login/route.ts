import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { isSetupComplete } from "@/lib/org";
import { fail, handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    if (!(await isSetupComplete())) {
      return fail("Setup is required", 409, { needsSetup: true });
    }
    const body = await readJson(request, schema);
    const user = await prisma.user.findFirst({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (!user || !user.passwordHash) return fail("Invalid email or password", 401);
    if (user.status !== "ACTIVE") return fail("This account cannot sign in yet", 403);
    const valid = await verifyPassword(user.passwordHash, body.password);
    if (!valid) return fail("Invalid email or password", 401);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id, user.organizationId, {
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
