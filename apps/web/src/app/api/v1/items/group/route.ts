import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSidGroup } from "@/lib/catalog";
import { fail, handleError, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const sid = request.nextUrl.searchParams.get("sid")?.trim();
    if (!sid) return fail("SID is required", 400);
    const group = await getSidGroup(user, sid);
    if (!group) return fail("No items found for this SID", 404);
    return ok(group);
  } catch (error) {
    return handleError(error);
  }
}
