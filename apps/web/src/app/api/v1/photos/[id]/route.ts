import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, handleError } from "@/lib/http";
import { downloadMedia } from "@/lib/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return fail("Not found", 404);

    if (photo.publicUrl && request.nextUrl.searchParams.get("redirect") !== "0") {
      return Response.redirect(photo.publicUrl, 302);
    }

    await requireUser();
    const buf = await downloadMedia(photo.storageKey);
    if (!buf) return fail("File missing", 404);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": photo.mimeType || "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
