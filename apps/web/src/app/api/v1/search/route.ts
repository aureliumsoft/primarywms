import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { runAdvancedSearch, searchFacets, type SearchInput } from "@/lib/search";

function csv(sp: URLSearchParams, key: string) {
  return [...sp.getAll(key), ...(sp.get(key)?.split(",") ?? [])]
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const sp = request.nextUrl.searchParams;
    if (sp.get("facets") === "1") {
      return ok(await searchFacets(user));
    }

    const custom: SearchInput["custom"] = [];
    for (const [key, value] of sp.entries()) {
      if (!key.startsWith("cf_") || !value.trim()) continue;
      custom.push({ fieldId: key.slice(3), value });
    }

    const result = await runAdvancedSearch(user, {
      names: csv(sp, "name"),
      sid: sp.get("sid") ?? undefined,
      tags: csv(sp, "tag"),
      barcode: sp.get("barcode") ?? undefined,
      notes: sp.get("notes") ?? undefined,
      minMode: sp.get("min") ?? undefined,
      qtyMin: sp.get("qtyMin") ?? undefined,
      qtyMax: sp.get("qtyMax") ?? undefined,
      qtyExact: sp.get("qtyExact") === "1",
      priceMin: sp.get("priceMin") ?? undefined,
      priceMax: sp.get("priceMax") ?? undefined,
      priceExact: sp.get("priceExact") === "1",
      unitId: sp.get("unitId") ?? undefined,
      qtyAlerts: sp.get("qtyAlerts") ?? undefined,
      dateAlerts: sp.get("dateAlerts") ?? undefined,
      dateAlertFieldId: sp.get("dateAlertFieldId") ?? undefined,
      folderIds: csv(sp, "folderId"),
      sort: sp.get("sort") || "updatedAt",
      group: sp.get("group") === "1",
      custom,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
