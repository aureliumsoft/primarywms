import { NextRequest } from "next/server";
import { z } from "zod";
import { RESET_TTL_HOURS } from "@primarywms/shared";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/auth";
import { sendResetEmail } from "@/lib/email";
import { handleError, ok, readJson } from "@/lib/http";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request, schema);
    const user = await prisma.user.findFirst({
      where: { email: body.email.toLowerCase().trim(), status: "ACTIVE" },
    });
    if (user) {
      const token = randomToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + RESET_TTL_HOURS);
      await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });
      await sendResetEmail(user.email, token);
    }
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
