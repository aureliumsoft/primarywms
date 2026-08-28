import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  token: z.string().min(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request, schema);
    const invite = await prisma.invite.findUnique({ where: { token: body.token } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return fail("This invite is invalid or expired", 400);
    }
    const user = await prisma.user.findFirst({
      where: { organizationId: invite.organizationId, email: invite.email },
    });
    if (!user) return fail("Invite user missing", 400);
    const passwordHash = await hashPassword(body.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          status: "ACTIVE",
        },
      }),
      prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);
    await createSession(user.id, user.organizationId);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return fail("Missing token");
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return fail("Invalid invite", 400);
  return ok({ email: invite.email, firstName: invite.firstName, lastName: invite.lastName });
}
