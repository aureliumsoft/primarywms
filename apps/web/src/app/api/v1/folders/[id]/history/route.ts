import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { listFolderHistory } from "@/lib/inventory";
import { handleError, ok } from "@/lib/http";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const history = await listFolderHistory(user, id);
    return ok({ history });
  } catch (error) {
    return handleError(error);
  }
}
