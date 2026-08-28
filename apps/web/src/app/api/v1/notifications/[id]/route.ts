import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { markNotificationsRead } from "@/lib/notifications";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await markNotificationsRead(user, [id]);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
