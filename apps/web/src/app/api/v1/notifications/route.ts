import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const sp = request.nextUrl.searchParams;
    if (sp.get("summary") === "1") {
      const unread = await unreadNotificationCount(user);
      return ok({ unread });
    }
    const kind = sp.get("kind");
    const status = sp.get("status");
    const data = await listNotifications(user, {
      q: sp.get("q") ?? undefined,
      kind: kind === "QUANTITY" || kind === "DATE" ? kind : "",
      status: status === "unread" || status === "read" ? status : "all",
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      page: Number(sp.get("page") || 1),
      pageSize: Number(sp.get("pageSize") || 20),
      dir: sp.get("dir") === "ASC" ? "ASC" : "DESC",
    });
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(
      request,
      z
        .object({
          ids: z.array(z.string().uuid()).optional(),
          markAll: z.literal(true).optional(),
        })
        .refine((v) => v.markAll === true || (v.ids?.length ?? 0) > 0, {
          message: "Provide ids or markAll: true",
        }),
    );
    const result = await markNotificationsRead(user, body.markAll ? undefined : body.ids);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
