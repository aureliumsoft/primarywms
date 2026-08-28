import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/catalog";
import { handleError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const folderIds = new URL(request.url).searchParams.getAll("folderId").filter(Boolean);
    const data = await getDashboard(user, folderIds);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
