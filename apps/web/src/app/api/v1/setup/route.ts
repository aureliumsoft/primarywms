import { NextRequest } from "next/server";
import { z } from "zod";
import { DEFAULT_ACCENT, initialsFromName, isHexColor } from "@primarywms/shared";
import { isSetupComplete } from "@/lib/org";
import { runSetup } from "@/lib/bootstrap";
import { createSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  companyName: z.string().min(1, "Company name is required").max(120),
  initials: z.string().max(4).optional(),
  accentColor: z.string().optional(),
  industry: z.string().max(80).optional(),
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    if (await isSetupComplete()) return fail("Setup has already been completed", 409);
    const body = await readJson(request, schema);
    const accent = body.accentColor || DEFAULT_ACCENT;
    if (!isHexColor(accent)) return fail("Accent color must be a hex value like #2E8B57");
    const { org, user } = await runSetup({
      ...body,
      initials: (body.initials || initialsFromName(body.companyName)).slice(0, 4).toUpperCase(),
      accentColor: accent,
      email: body.email.toLowerCase(),
    });
    await createSession(user.id, org.id, { userAgent: request.headers.get("user-agent") ?? undefined });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  return ok({ setupComplete: await isSetupComplete() });
}
