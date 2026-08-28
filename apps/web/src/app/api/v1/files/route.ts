import { NextRequest } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";
import { fileKind, isSupabaseConfigured, uploadMedia } from "@/lib/storage";

export async function GET() {
  try {
    const user = await requireUser();
    const files = await prisma.sharedFile.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ files, supabase: isSupabaseConfigured() });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Choose a file");
    const mime = file.type || "application/octet-stream";
    const kind = fileKind(mime, file.name);
    if (kind === "other") return fail("Only images, PDF, Word, or Excel files can be uploaded");
    if (file.size > 30 * 1024 * 1024) return fail("File must be 30 MB or smaller");

    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stored = await uploadMedia({
      folder: "files",
      filename: `${randomUUID()}-${safeName}`,
      body: buf,
      contentType: mime,
    });

    const shareToken = randomBytes(18).toString("hex");
    const row = await prisma.sharedFile.create({
      data: {
        organizationId: user.organizationId,
        name: file.name,
        kind,
        storageKey: stored.storageKey,
        publicUrl: stored.publicUrl,
        mimeType: mime,
        sizeBytes: file.size,
        shareToken,
        createdById: user.id,
      },
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return ok(
      {
        file: row,
        shareUrl: `${origin}/share/${shareToken}`,
        supabase: isSupabaseConfigured(),
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return fail("Missing id");
    await prisma.sharedFile.deleteMany({ where: { id, organizationId: user.organizationId } });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
