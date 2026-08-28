import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";
import { deleteTag, getTagInventory, renameTag, TAG_NAME_TAKEN } from "@/lib/tags";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const sp = request.nextUrl.searchParams;
    const page = await getTagInventory(user, id, {
      q: sp.get("q") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      dir: sp.get("dir") === "ASC" ? "ASC" : "DESC",
    });
    return ok(page);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, z.object({ name: z.string().min(1).max(80) }));
    const tag = await renameTag(user, id, body.name);
    return ok({ tag });
  } catch (error) {
    if (error instanceof Error && error.message === TAG_NAME_TAKEN) return fail(error.message, 409);
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteTag(user, id);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
