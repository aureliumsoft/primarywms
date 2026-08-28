import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireUser, assertCan } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/http";
import { downloadMedia, uploadMedia } from "@/lib/storage";

export async function GET() {
  try {
    const user = await requireUser();
    const org = await prisma.organization.findFirst({ where: { id: user.organizationId } });
    if (!org?.logoKey) return fail("No logo", 404);
    if (org.logoKey.startsWith("http")) {
      return Response.redirect(org.logoKey);
    }
    const buf = await downloadMedia(org.logoKey);
    if (!buf) return fail("No logo", 404);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user, "company_settings");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Choose an image");
    if (!file.type.startsWith("image/")) return fail("Logo must be an image");
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const stored = await uploadMedia({
      folder: "files",
      filename: `logo-${user.organizationId}-${randomUUID()}.${ext}`,
      body: buf,
      contentType: file.type || "image/png",
    });
    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { logoKey: stored.publicUrl || stored.storageKey },
    });
    return ok({ organization, logoUrl: stored.publicUrl || "/api/v1/org/logo" });
  } catch (error) {
    return handleError(error);
  }
}
