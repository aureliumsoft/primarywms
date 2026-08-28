import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, fileResponse, handleError, ok } from "@/lib/http";
import { reportFile, runReport, tableForExport, type ReportQuery, type ReportType } from "@/lib/reports";

const TYPES: ReportType[] = [
  "activity",
  "inventory-summary",
  "low-stock",
  "transactions",
  "item-flow",
  "move-summary",
  "user-activity",
  "quantity-change",
];

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const sp = request.nextUrl.searchParams;
    const type = (sp.get("type") ?? "activity") as ReportType;
    if (!TYPES.includes(type)) return fail("Unknown report");
    const format = sp.get("format") === "xlsx" ? "xlsx" : sp.get("format") === "csv" ? "csv" : undefined;
    const query: ReportQuery = {
      type,
      q: sp.get("q") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      action: sp.get("action") ?? undefined,
      userId: sp.get("userId") ?? undefined,
      sid: sp.get("sid") ?? undefined,
      itemId: sp.get("itemId") ?? undefined,
      folderId: sp.get("folderId") ?? undefined,
      sourceFolderId: sp.get("sourceFolderId") ?? undefined,
      destFolderId: sp.get("destFolderId") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      barcode: sp.get("barcode") ?? undefined,
      group: sp.get("group") === "1",
      page: Number(sp.get("page") || 1),
      pageSize: Number(sp.get("pageSize") || 20),
      sort: sp.get("sort") ?? undefined,
      dir: sp.get("dir") === "ASC" ? "ASC" : "DESC",
      format,
    };
    const data = await runReport(user, query);
    if (format) {
      const table = tableForExport(type, data as Record<string, unknown>, Boolean((data as { hidePrices?: boolean }).hidePrices));
      const file = reportFile(table.headers, table.rows, table.filename, format);
      return fileResponse(file.bytes, file.filename, file.mime);
    }
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
