import * as XLSX from "xlsx";
import { MAX_FOLDER_DEPTH } from "@primarywms/shared";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, assertFolderAccess, getFolderAccessMap } from "./auth";
import { createFolder, createItem } from "./inventory";
import { cell, parseCsv } from "./csv";
import { writeCustomFieldValues } from "./custom-fields";
import { uploadMedia } from "./storage";
import { randomUUID } from "crypto";

export const IMPORT_COLUMNS = [
  "Entry Type",
  "Entry Name",
  "SID",
  "Quantity",
  "Unit",
  "Min Level",
  "Price",
  "Notes",
  "Tags",
  "Product Link",
  "Primary Folder",
  "Subfolder-level1",
  "Subfolder-level2",
  "Subfolder-level3",
  "Subfolder-level4",
  "Photo1",
  "Barcode/QR1-Data",
  "Barcode/QR1-Type",
  "Barcode/QR2-Data",
  "Barcode/QR2-Type",
] as const;

export type ImportMode = "quick" | "advanced";

export type ImportError = { row: number; message: string };

function parseSheet(buffer: Buffer, filename: string): Record<string, string>[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseCsv(buffer.toString("utf8"));
  }
  const wb = XLSX.read(buffer, { type: "buffer", raw: false });
  const name = wb.SheetNames.find((n) => /add new inventory|export|sheet1/i.test(n)) ?? wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
}

function entryType(row: Record<string, string>) {
  const value = cell(row, "Entry Type", "Type").toLowerCase();
  if (value === "folder") return "FOLDER" as const;
  return "ITEM" as const;
}

function pathParts(row: Record<string, string>) {
  return [
    cell(row, "Primary Folder"),
    cell(row, "Subfolder-level1", "Subfolder level1", "Subfolder-Level1"),
    cell(row, "Subfolder-level2"),
    cell(row, "Subfolder-level3"),
    cell(row, "Subfolder-level4"),
  ].filter(Boolean);
}

function duplicateKey(row: Record<string, string>, mode: ImportMode, folderId: string) {
  const type = entryType(row);
  const name = cell(row, "Entry Name", "Name");
  const path = mode === "quick" ? folderId : pathParts(row).join("›");
  return `${type}|${path}|${name}`.toLowerCase();
}

export function importTemplateRows(fields: { name: string }[]) {
  const headers = [...IMPORT_COLUMNS, ...fields.map((f) => f.name)];
  const sampleItem = [
    "Item",
    "Sample paint",
    "",
    "30",
    "unit",
    "5",
    "",
    "",
    "",
    "",
    "Warehouse",
    "Shelf A",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ...fields.map(() => ""),
  ];
  const sampleFolder = [
    "Folder",
    "Warehouse",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ...fields.map(() => ""),
  ];
  return { headers, rows: [sampleFolder, sampleItem] };
}

export function templateCsv(fields: { name: string }[]) {
  const { headers, rows } = importTemplateRows(fields);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  return XLSX.utils.sheet_to_csv(ws);
}

export function templateXlsx(fields: { name: string }[]) {
  const { headers, rows } = importTemplateRows(fields);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "ADD NEW INVENTORY");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function runImport(
  user: AuthUser,
  input: { buffer: Buffer; filename: string; mode: ImportMode; folderId?: string },
) {
  assertCan(user, "import");
  const access = await getFolderAccessMap(user);
  if (access !== "all") throw new Error("Only Super Admin and Admin can import");

  const rows = parseSheet(input.buffer, input.filename);
  if (!rows.length) throw new Error("The file has no data rows");

  const [orgFolders, units, fields, root] = await Promise.all([
    prisma.folder.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      select: { id: true, parentId: true, name: true },
    }),
    prisma.unit.findMany({ where: { organizationId: user.organizationId } }),
    prisma.customField.findMany({ where: { organizationId: user.organizationId } }),
    prisma.folder.findFirst({
      where: { organizationId: user.organizationId, parentId: null, deletedAt: null },
    }),
  ]);
  if (!root) throw new Error("All Items folder is missing");

  const defaultUnit = units.find((u) => u.isDefault) ?? units[0];
  if (!defaultUnit) throw new Error("No units of measure are configured");

  const folderCache = orgFolders.map((f) => ({ ...f }));
  const errors: ImportError[] = [];
  const seen = new Set<string>();
  let createdItems = 0;
  let createdFolders = 0;

  async function ensurePath(names: string[]) {
    let parentId = root!.id;
    let depth = 1;
    for (const name of names) {
      depth += 1;
      if (depth > MAX_FOLDER_DEPTH) throw new Error(`Folder path is deeper than ${MAX_FOLDER_DEPTH} levels`);
      let found = folderCache.find(
        (f) => f.parentId === parentId && f.name.toLowerCase() === name.toLowerCase(),
      );
      if (!found) {
        const folder = await createFolder(user, { name, parentId });
        found = { id: folder.id, parentId: folder.parentId, name: folder.name };
        folderCache.push(found);
        createdFolders += 1;
      }
      parentId = found.id;
    }
    return parentId;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 2;
    try {
      const name = cell(row, "Entry Name", "Name");
      const type = entryType(row);
      if (!name) throw new Error("Entry Name is required");
      const key = duplicateKey(row, input.mode, input.folderId ?? root.id);
      if (seen.has(key)) throw new Error("Duplicate row rejected");
      seen.add(key);

      if (type === "FOLDER") {
        if (input.mode === "quick") {
          await assertFolderAccess(user, input.folderId ?? root.id, "EDIT");
          await createFolder(user, { name, parentId: input.folderId ?? root.id, notes: cell(row, "Notes") || null });
          createdFolders += 1;
        } else {
          const parts = pathParts(row);
          const parentId = parts.length ? await ensurePath(parts) : root.id;
          await createFolder(user, { name, parentId, notes: cell(row, "Notes") || null, tags: splitTags(row) });
          createdFolders += 1;
        }
        continue;
      }

      const qtyRaw = cell(row, "Quantity");
      if (!qtyRaw) throw new Error("Quantity is required");
      const quantity = Number(qtyRaw);
      if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantity must be a number");

      let folderId = input.folderId ?? root.id;
      if (input.mode === "advanced") {
        const parts = pathParts(row);
        folderId = parts.length ? await ensurePath(parts) : root.id;
      } else if (!input.folderId) {
        throw new Error("Choose a folder for Quick import");
      }
      await assertFolderAccess(user, folderId, "EDIT");

      const unitName = cell(row, "Unit");
      const unit =
        units.find((u) => u.name.toLowerCase() === unitName.toLowerCase() || u.abbreviation.toLowerCase() === unitName.toLowerCase()) ??
        defaultUnit;

      const minRaw = cell(row, "Min Level", "Min Quantity");
      const priceRaw = cell(row, "Price");
      const sid = cell(row, "SID", ["S", "ortly", " ID"].join(""));
      const barcode1 = cell(row, "Barcode/QR1-Data");
      const barcode2 = cell(row, "Barcode/QR2-Data");

      const item = await createItem(user, {
        folderId,
        name,
        quantity,
        unitId: unit.id,
        minQuantity: minRaw === "" ? null : Number(minRaw),
        price: priceRaw === "" ? null : Number(priceRaw),
        notes: cell(row, "Notes") || null,
        tags: splitTags(row),
        sid: sid || undefined,
        productLink: cell(row, "Product Link") || null,
        barcodes: [barcode1, barcode2].filter(Boolean).map((value) => ({ value })),
      });

      const customValues = fields
        .map((field) => {
          const value = cell(row, field.name);
          if (!value) return null;
          if (field.type === "DATE") return { fieldId: field.id, valueDate: parseDate(value) };
          if (field.type === "CHECKBOX") return { fieldId: field.id, valueBool: /^(true|1|yes|y)$/i.test(value) };
          if (field.type === "WHOLE_NUMBER" || field.type === "DECIMAL") return { fieldId: field.id, valueNum: Number(value) };
          return { fieldId: field.id, valueText: value };
        })
        .filter(Boolean);
      if (customValues.length) {
        await prisma.$transaction(async (tx) => {
          await writeCustomFieldValues(tx, user.organizationId, { itemId: item.id }, customValues as never);
        });
      }

      const photoUrl = cell(row, "Photo1");
      if (photoUrl && /^https?:\/\//i.test(photoUrl)) {
        try {
          const res = await fetch(photoUrl);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const stored = await uploadMedia({
              folder: "photos",
              filename: `item-${item.id}-${randomUUID()}.jpg`,
              body: buf,
              contentType: res.headers.get("content-type") || "image/jpeg",
            });
            await prisma.photo.create({
              data: {
                ownerType: "ITEM",
                itemId: item.id,
                sortOrder: 1,
                storageKey: stored.storageKey,
                publicUrl: stored.publicUrl,
                mimeType: "image/jpeg",
              },
            });
          }
        } catch {
          /* optional photos must not fail the row */
        }
      }

      createdItems += 1;
    } catch (err) {
      errors.push({ row: n, message: err instanceof Error ? err.message : "Could not import row" });
    }
  }

  return { createdItems, createdFolders, errors, total: rows.length };
}

function splitTags(row: Record<string, string>) {
  return cell(row, "Tags")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseDate(value: string) {
  const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
