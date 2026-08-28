import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { exportFolderItems } from "@/lib/inventory";
import { handleError, ok } from "@/lib/http";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const file = await exportFolderItems(user, id);
    return ok(file);
  } catch (error) {
    return handleError(error);
  }
}
