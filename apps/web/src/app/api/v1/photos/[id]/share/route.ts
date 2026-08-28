import { randomBytes } from "crypto";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return fail("Not found", 404);

    const existing = await prisma.sharedFile.findFirst({
      where: { organizationId: user.organizationId, storageKey: photo.storageKey },
    });
    const token = existing?.shareToken ?? randomBytes(18).toString("hex");
    const row =
      existing ??
      (await prisma.sharedFile.create({
        data: {
          organizationId: user.organizationId,
          name: `photo-${photo.id}`,
          kind: "image",
          storageKey: photo.storageKey,
          publicUrl: photo.publicUrl,
          mimeType: photo.mimeType,
          shareToken: token,
          createdById: user.id,
        },
      }));

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return ok({ shareUrl: `${origin}/share/${row.shareToken}`, file: row });
  } catch (error) {
    return handleError(error);
  }
}
