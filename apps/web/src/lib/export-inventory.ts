import * as XLSX from "xlsx";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, getFolderAccessMap } from "./auth";
import { toCsv } from "./csv";
import { ancestors, pathColumns } from "./folder-path";
import { downloadMedia } from "./storage";
import { SPREADSHEET_FIELDS } from "./export-fields";

export { SPREADSHEET_FIELDS };

export type PdfLayout = "album" | "list" | "compact";

type ExportItem = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  minQuantity: number | null;
  price: number | null;
  notes: string | null;
  productLink: string | null;
  folderId: string;
  unit: string;
  tags: string[];
  photoUrl: string | null;
  photoKey: string | null;
  custom: Record<string, string>;
};

function folderSubtreeIds(folders: { id: string; parentId: string | null }[], folderId: string) {
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return [...ids];
}

async function loadExportSet(
  user: AuthUser,
  input: { folderId?: string; itemIds?: string[]; includeFolders?: boolean },
) {
  assertCan(user, "export");
  const access = await getFolderAccessMap(user);
  const folders = await prisma.folder.findMany({
    where: { organizationId: user.organizationId, deletedAt: null },
    select: { id: true, parentId: true, name: true, sid: true, notes: true },
  });
  const root = folders.find((f) => !f.parentId);
  const allowed = access === "all" ? new Set(folders.map((f) => f.id)) : new Set(access.keys());
  const folderIds = input.folderId ? folderSubtreeIds(folders, input.folderId) : null;

  const itemWhere = {
    organizationId: user.organizationId,
    deletedAt: null as null,
    ...(input.itemIds?.length ? { id: { in: input.itemIds } } : {}),
    ...(folderIds && !input.itemIds?.length ? { folderId: { in: folderIds } } : {}),
    ...(access === "all" ? {} : { folderId: { in: [...allowed] } }),
  };

  const dbItems = await prisma.item.findMany({
    where: itemWhere,
    include: {
      unit: true,
      tags: { include: { tag: true } },
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      customValues: { include: { field: true } },
    },
    orderBy: { name: "asc" },
    take: 5000,
  });

  const items: ExportItem[] = dbItems.map((item) => ({
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: Number(item.quantity),
    minQuantity: item.minQuantity == null ? null : Number(item.minQuantity),
    price: item.price == null ? null : Number(item.price),
    notes: item.notes,
    productLink: item.productLink,
    folderId: item.folderId,
    unit: item.unit?.abbreviation ?? "unit",
    tags: item.tags.map((t) => t.tag.name),
    photoUrl: item.photos[0]?.publicUrl ?? (item.photos[0] ? `/api/v1/photos/${item.photos[0].id}` : null),
    photoKey: item.photos[0]?.storageKey ?? null,
    custom: Object.fromEntries(
      item.customValues.map((v) => [
        v.field.name,
        v.valueText ?? v.valueDate?.toISOString().slice(0, 10) ?? (v.valueNum != null ? String(v.valueNum) : v.valueBool == null ? "" : v.valueBool ? "Yes" : "No"),
      ]),
    ),
  }));

  const folderRows = input.includeFolders
    ? folders.filter((f) => f.parentId && allowed.has(f.id) && (!input.folderId || f.id === input.folderId || ancestors(folders, f.id).some((a) => a.id === input.folderId)))
    : [];

  return { folders, rootId: root?.id, items, folderRows };
}

export async function exportSpreadsheet(
  user: AuthUser,
  input: {
    folderId?: string;
    itemIds?: string[];
    format: "csv" | "xlsx";
    fields: string[];
    includeFolders?: boolean;
  },
) {
  const { folders, rootId, items, folderRows } = await loadExportSet(user, input);
  const customNames = [...new Set(items.flatMap((i) => Object.keys(i.custom)))];
  const fields = input.fields.length ? input.fields : [...SPREADSHEET_FIELDS, ...customNames];

  const rows: string[][] = [fields];
  for (const folder of folderRows) {
    const path = pathColumns(folders, folder.id, rootId);
    const map: Record<string, string> = {
      "Entry Type": "Folder",
      "Entry Name": folder.name,
      SID: folder.sid,
      Notes: folder.notes ?? "",
      "Primary Folder": path.primary,
      "Subfolder-level1": path.level1,
      "Subfolder-level2": path.level2,
      "Subfolder-level3": path.level3,
      "Subfolder-level4": path.level4,
    };
    rows.push(fields.map((f) => map[f] ?? ""));
  }
  for (const item of items) {
    const path = pathColumns(folders, item.folderId, rootId);
    const map: Record<string, string> = {
      "Entry Type": "Item",
      "Entry Name": item.name,
      SID: item.sid,
      Quantity: String(item.quantity),
      Unit: item.unit,
      "Min Level": item.minQuantity == null ? "" : String(item.minQuantity),
      Price: item.price == null ? "" : String(item.price),
      Value: String(item.quantity * (item.price ?? 0)),
      Notes: item.notes ?? "",
      Tags: item.tags.join(", "),
      "Product Link": item.productLink ?? "",
      "Primary Folder": path.primary,
      "Subfolder-level1": path.level1,
      "Subfolder-level2": path.level2,
      "Subfolder-level3": path.level3,
      "Subfolder-level4": path.level4,
      Photo1: item.photoUrl ?? "",
      ...item.custom,
    };
    rows.push(fields.map((f) => map[f] ?? ""));
  }

  if (input.format === "csv") {
    return { bytes: Buffer.from(toCsv(rows), "utf8"), filename: "inventory-export.csv", mime: "text/csv" };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Export");
  return {
    bytes: Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer),
    filename: "inventory-export.xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

export async function exportPdf(
  user: AuthUser,
  input: {
    folderId?: string;
    itemIds?: string[];
    layout: PdfLayout;
    title?: string;
    titlePage?: boolean;
    summaryPage?: boolean;
    includeLabels?: boolean;
    includeFolders?: boolean;
    fields: string[];
  },
) {
  const { folders, items } = await loadExportSet(user, input);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(46 / 255, 139 / 255, 87 / 255);
  const ink = rgb(0.16, 0.22, 0.2);
  const mute = rgb(0.42, 0.5, 0.46);
  const fields = (input.fields.length ? input.fields : ["SID", "Quantity", "Notes"]).slice(0, 6);

  if (input.titlePage) {
    const page = pdf.addPage([612, 792]);
    page.drawText(input.title?.trim() || "Inventory", { x: 72, y: 720, size: 28, font: bold, color: ink });
    page.drawText(`${items.length} items`, { x: 72, y: 680, size: 14, font, color: mute });
    page.drawRectangle({ x: 72, y: 660, width: 120, height: 4, color: green });
  }

  if (input.summaryPage) {
    const page = pdf.addPage([612, 792]);
    page.drawText("Summary", { x: 72, y: 740, size: 18, font: bold, color: ink });
    let y = 710;
    const byName = new Map<string, { qty: number; count: number }>();
    for (const item of items) {
      const cur = byName.get(item.name) ?? { qty: 0, count: 0 };
      cur.qty += item.quantity;
      cur.count += 1;
      byName.set(item.name, cur);
    }
    for (const [name, stats] of [...byName.entries()].slice(0, 40)) {
      page.drawText(`${name}  ·  ${stats.count} locations  ·  ${stats.qty}`, { x: 72, y, size: 11, font, color: ink });
      y -= 16;
      if (y < 60) break;
    }
  }

  async function embedPhoto(item: ExportItem) {
    if (!item.photoKey) return null;
    const buf = await downloadMedia(item.photoKey);
    if (!buf) return null;
    try {
      if (item.photoKey.toLowerCase().includes(".png")) return await pdf.embedPng(buf);
      return await pdf.embedJpg(buf);
    } catch {
      return null;
    }
  }

  async function drawLabel(page: ReturnType<typeof pdf.addPage>, value: string, x: number, y: number) {
    if (!input.includeLabels) return;
    const png = await QRCode.toBuffer(value, { type: "png", margin: 0, width: 96 });
    const img = await pdf.embedPng(png);
    page.drawImage(img, { x, y, width: 48, height: 48 });
  }

  function fieldText(item: ExportItem, field: string) {
    const path = folders.find((f) => f.id === item.folderId)?.name ?? "";
    const map: Record<string, string> = {
      SID: item.sid,
      Quantity: `${item.quantity} ${item.unit}`,
      "Min Level": item.minQuantity == null ? "" : String(item.minQuantity),
      Price: item.price == null ? "" : String(item.price),
      Notes: item.notes ?? "",
      Tags: item.tags.join(", "),
      Folder: path,
      ...item.custom,
    };
    return map[field] ?? "";
  }

  if (input.layout === "album") {
    for (const item of items) {
      const page = pdf.addPage([612, 792]);
      page.drawText(item.name, { x: 72, y: 730, size: 22, font: bold, color: ink, maxWidth: 400 });
      const photo = await embedPhoto(item);
      if (photo) page.drawImage(photo, { x: 72, y: 420, width: 280, height: 280 });
      await drawLabel(page, item.sid, 480, 650);
      let y = 390;
      for (const field of fields) {
        const value = fieldText(item, field);
        if (!value) continue;
        page.drawText(`${field}: ${value}`.slice(0, 90), { x: 72, y, size: 12, font, color: ink });
        y -= 22;
      }
    }
  } else {
    const cols = input.layout === "compact" ? 2 : 1;
    const perPage = input.layout === "compact" ? 8 : 6;
    for (let i = 0; i < items.length; i += perPage) {
      const page = pdf.addPage([612, 792]);
      const slice = items.slice(i, i + perPage);
      slice.forEach((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 36 + col * 288;
        const y = 720 - row * (input.layout === "compact" ? 170 : 110);
        page.drawText(item.name.slice(0, 42), { x, y, size: 12, font: bold, color: ink });
        page.drawText(fields.map((f) => fieldText(item, f)).filter(Boolean).join(" · ").slice(0, 70), {
          x,
          y: y - 16,
          size: 9,
          font,
          color: mute,
        });
      });
    }
  }

  if (!pdf.getPageCount()) {
    const page = pdf.addPage([612, 792]);
    page.drawText("No items to export", { x: 72, y: 720, size: 16, font, color: mute });
  }

  const bytes = Buffer.from(await pdf.save());
  return { bytes, filename: `inventory-${input.layout}.pdf`, mime: "application/pdf" };
}

export async function exportBackup(user: AuthUser) {
  assertCan(user, "export");
  if (user.role.kind !== "SUPER_ADMIN" && user.role.kind !== "ADMIN") throw new Error("FORBIDDEN");
  const [items, folders, txns] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: user.organizationId },
      include: { unit: true, folder: { select: { name: true } } },
    }),
    prisma.folder.findMany({ where: { organizationId: user.organizationId } }),
    prisma.inventoryTransaction.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20000,
    }),
  ]);
  const zip = new JSZip();
  zip.file(
    "items.csv",
    toCsv([
      ["id", "name", "sid", "quantity", "folder", "unit", "min", "price", "notes", "deletedAt"],
      ...items.map((i) => [
        i.id,
        i.name,
        i.sid,
        Number(i.quantity),
        i.folder.name,
        i.unit?.abbreviation ?? "",
        i.minQuantity == null ? "" : Number(i.minQuantity),
        i.price == null ? "" : Number(i.price),
        i.notes ?? "",
        i.deletedAt?.toISOString() ?? "",
      ]),
    ]),
  );
  zip.file(
    "folders.csv",
    toCsv([
      ["id", "name", "sid", "parentId", "notes", "deletedAt"],
      ...folders.map((f) => [f.id, f.name, f.sid, f.parentId ?? "", f.notes ?? "", f.deletedAt?.toISOString() ?? ""]),
    ]),
  );
  zip.file(
    "transactions.csv",
    toCsv([
      ["id", "type", "itemId", "folderId", "qtyDelta", "reason", "note", "userId", "createdAt"],
      ...txns.map((t) => [
        t.id,
        t.type,
        t.itemId ?? "",
        t.folderId ?? "",
        t.qtyDelta == null ? "" : Number(t.qtyDelta),
        t.reason ?? "",
        t.note ?? "",
        t.userId ?? "",
        t.createdAt.toISOString(),
      ]),
    ]),
  );
  const bytes = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  return { bytes, filename: "primarywms-backup.zip", mime: "application/zip" };
}
