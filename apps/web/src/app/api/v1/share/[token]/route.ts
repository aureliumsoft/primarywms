import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, handleError } from "@/lib/http";
import { downloadMedia } from "@/lib/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const file = await prisma.sharedFile.findUnique({ where: { shareToken: token } });
    if (!file) return fail("This share link is invalid or has been removed", 404);

    if (file.publicUrl && request.nextUrl.searchParams.get("download") !== "1") {
      return Response.redirect(file.publicUrl, 302);
    }

    const buf = await downloadMedia(file.storageKey);
    if (!buf) return fail("File missing", 404);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${file.name.replace(/"/g, "")}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
