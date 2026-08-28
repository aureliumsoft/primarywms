import { getCurrentUser } from "@/lib/auth";
import { getOrganization } from "@/lib/org";
import { fail, ok } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in", 401);
  const org = await getOrganization();
  return ok({
    user,
    organization: org
      ? {
          id: org.id,
          name: org.name,
          initials: org.initials,
          accentColor: org.accentColor,
          logoKey: org.logoKey,
          currency: org.currency,
          timezone: org.timezone,
          dateFormat: org.dateFormat,
          country: org.country,
          returnToOriginEnabled: org.returnToOriginEnabled,
          requireQtyReason: org.requireQtyReason,
          requireMoveReason: org.requireMoveReason,
        }
      : null,
  });
}
