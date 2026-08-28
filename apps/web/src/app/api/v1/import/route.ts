import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileResponse, handleError, fail, ok } from "@/lib/http";
import { runImport, templateCsv, templateXlsx } from "@/lib/import";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const fields = await prisma.customField.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { sortOrder: "asc" },
    });
    if (format === "xlsx") {
      return fileResponse(
        templateXlsx(fields),
        "primarywms-import-template.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    }
    return fileResponse(templateCsv(fields), "primarywms-import-template.csv", "text/csv; charset=utf-8");
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const mode = String(form.get("mode") || "quick") === "advanced" ? "advanced" : "quick";
    const folderId = String(form.get("folderId") || "") || undefined;
    if (!(file instanceof File)) return fail("Upload a CSV or Excel file");
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runImport(user, { buffer, filename: file.name, mode, folderId });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
