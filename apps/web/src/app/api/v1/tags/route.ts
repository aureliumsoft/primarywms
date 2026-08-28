import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";
import { createTag, deleteTag, listTags, TAG_NAME_TAKEN } from "@/lib/tags";

export async function GET() {
  try {
    const user = await requireUser();
    const tags = await listTags(user);
    return ok({ tags });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, z.object({ name: z.string().min(1).max(80) }));
    const tag = await createTag(user, body.name);
    return ok({ tag }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === TAG_NAME_TAKEN) return fail(error.message, 409);
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return fail("Missing id");
    await deleteTag(user, id);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
