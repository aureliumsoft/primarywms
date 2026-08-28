import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { savePhoto } from "@/lib/inventory";
import { fail, handleError, ok } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const ownerType = String(form.get("ownerType") || "ITEM");
    const ownerId = String(form.get("ownerId") || "");
    if (!(file instanceof File) || !ownerId) return fail("file and ownerId are required");
    if (ownerType !== "ITEM" && ownerType !== "FOLDER") return fail("Invalid owner");
    void user;
    const photo = await savePhoto(ownerType, ownerId, file);
    return ok({ photo }, 201);
  } catch (error) {
    return handleError(error);
  }
}
