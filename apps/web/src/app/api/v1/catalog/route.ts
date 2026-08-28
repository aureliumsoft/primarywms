import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCatalog, getFolderTree, getRootFolder } from "@/lib/catalog";
import { fail, handleError, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const url = request.nextUrl.searchParams;
    const folderId = url.get("folderId");
    const data = await getCatalog(user, {
      folderId,
      q: url.get("q") ?? undefined,
      page: Number(url.get("page") ?? 1),
      pageSize: Number(url.get("pageSize") ?? 20),
      sort: url.get("sort") ?? undefined,
      dir: (url.get("dir") as "ASC" | "DESC") ?? undefined,
      groupItems: url.get("group") === "1",
    });
    const [tree, root] = await Promise.all([getFolderTree(user), getRootFolder(user.organizationId)]);
    return ok({ ...data, tree, rootId: root.id });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("No access", 403);
    return handleError(error);
  }
}
