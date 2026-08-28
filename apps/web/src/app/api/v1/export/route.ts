import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fileResponse, handleError, readJson } from "@/lib/http";
import { exportBackup, exportPdf, exportSpreadsheet } from "@/lib/export-inventory";

const schema = z.object({
  kind: z.enum(["spreadsheet", "pdf", "backup"]),
  format: z.enum(["csv", "xlsx"]).optional(),
  folderId: z.string().uuid().optional(),
  itemIds: z.array(z.string().uuid()).optional(),
  fields: z.array(z.string()).optional(),
  includeFolders: z.boolean().optional(),
  layout: z.enum(["album", "list", "compact"]).optional(),
  title: z.string().optional(),
  titlePage: z.boolean().optional(),
  summaryPage: z.boolean().optional(),
  includeLabels: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, schema);
    const file =
      body.kind === "backup"
        ? await exportBackup(user)
        : body.kind === "pdf"
          ? await exportPdf(user, {
              folderId: body.folderId,
              itemIds: body.itemIds,
              layout: body.layout ?? "list",
              title: body.title,
              titlePage: body.titlePage,
              summaryPage: body.summaryPage,
              includeLabels: body.includeLabels,
              includeFolders: body.includeFolders,
              fields: body.fields ?? [],
            })
          : await exportSpreadsheet(user, {
              folderId: body.folderId,
              itemIds: body.itemIds,
              format: body.format ?? "csv",
              fields: body.fields ?? [],
              includeFolders: body.includeFolders,
            });
    return fileResponse(file.bytes, file.filename, file.mime);
  } catch (error) {
    return handleError(error);
  }
}
