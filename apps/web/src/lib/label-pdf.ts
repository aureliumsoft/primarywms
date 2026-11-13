import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import type { LabelKind, LabelSize, PaperId } from "./label-sizes";
import { PAPERS, perSheet } from "./label-sizes";
import { encodeLabelValue } from "./scan-code";

export type LabelPdfCopy = {
  name: string;
  value: string;
  extra?: string;
  note?: string;
  photoUrl?: string | null;
  logo?: string | null;
};

export type LabelPdfSpec = {
  size: LabelSize;
  kind: LabelKind;
  copies: LabelPdfCopy[];
  startPosition: number;
  instructions: boolean;
  includePhoto: boolean;
  includeLogo: boolean;
  includeDetails: boolean;
  includeNote: boolean;
};

const INK = rgb(0.16, 0.22, 0.2);
const MUTE = rgb(0.42, 0.5, 0.46);
const GREEN = rgb(46 / 255, 139 / 255, 87 / 255);

function paperPts(size: LabelSize) {
  if (size.paper === "THERMAL") {
    return { width: size.widthIn * 72, height: size.heightIn * 72 };
  }
  const paper = PAPERS.find((row) => row.id === size.paper)!;
  return { width: paper.widthIn * 72, height: paper.heightIn * 72 };
}

async function qrPngBytes(value: string) {
  const dataUrl = await QRCode.toDataURL(value, {
    margin: 0,
    width: 256,
    errorCorrectionLevel: "M",
    color: { dark: "#2a3a33", light: "#ffffff" },
  });
  return dataUrlToBytes(dataUrl);
}

async function barcodePngBytes(value: string) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    displayValue: false,
    height: 64,
    margin: 0,
    lineColor: "#2a3a33",
    background: "#ffffff",
  });
  return dataUrlToBytes(canvas.toDataURL("image/png"));
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function fetchImageBytes(url: string) {
  try {
    const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    const res = await fetch(absolute);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function embedPhoto(pdf: PDFDocument, url: string | null | undefined): Promise<PDFImage | null> {
  if (!url) return null;
  const bytes = await fetchImageBytes(url);
  if (!bytes) return null;
  try {
    if (url.toLowerCase().includes(".png")) return await pdf.embedPng(bytes);
    return await pdf.embedJpg(bytes);
  } catch {
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return null;
    }
  }
}

function drawInstructions(page: PDFPage, font: PDFFont, bold: PDFFont, size: LabelSize) {
  const { width, height } = page.getSize();
  let y = height - 72;
  page.drawText("Printing instructions", { x: 54, y, size: 22, font: bold, color: INK });
  y -= 36;
  const lines = [
    "Print at 100% / actual size. Turn off “Fit to page” or “Shrink to fit” in the print dialog.",
    `Use ${size.printerType} media. This layout is compatible with Avery ${size.avery.length ? size.avery.join(", ") : "your label stock"} (${perSheet(size)} labels per sheet).`,
    "Do not edit the PDF in a drawing app — reprint from Primary WMS if you need a different size or note.",
    "Reprinting does not change the stored QR or barcode value.",
  ];
  for (const line of lines) {
    const wrapped = wrapText(line, font, 12, width - 108);
    for (const part of wrapped) {
      page.drawText(part, { x: 54, y, size: 12, font, color: INK });
      y -= 18;
    }
    y -= 8;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawLabelCell(
  page: PDFPage,
  args: {
    x: number;
    y: number;
    w: number;
    h: number;
    copy: LabelPdfCopy;
    size: LabelSize;
    kind: LabelKind;
    code: PDFImage;
    photo: PDFImage | null;
    font: PDFFont;
    bold: PDFFont;
    includeLogo: boolean;
    includeDetails: boolean;
    includeNote: boolean;
    includePhoto: boolean;
  },
) {
  const {
    x,
    y,
    w,
    h,
    copy,
    size,
    kind,
    code,
    photo,
    font,
    bold,
    includeLogo,
    includeDetails,
    includeNote,
    includePhoto,
  } = args;
  // Sortly sticker: name → details → accent rule (only when header) → code → SID → note
  const pad = Math.min(10, Math.max(4, w * 0.055));
  let cursor = y + h - pad;
  const textW = w - pad * 2;
  const nameSize = h < 50 ? 7 : h < 90 ? 9 : h < 140 ? 11 : 13;
  const small = Math.max(6, nameSize - 2);
  const sidSize = Math.max(6, Math.min(10, w * 0.045));
  const hasDetails = Boolean(includeDetails && size.details && copy.extra);
  const showHeader = Boolean(size.showName || hasDetails);

  if (size.showName) {
    const lines = wrapText(copy.name || " ", bold, nameSize, textW).slice(0, 2);
    for (const line of lines) {
      cursor -= nameSize + 1;
      page.drawText(line, { x: x + pad, y: cursor, size: nameSize, font: bold, color: INK, maxWidth: textW });
    }
  }

  if (hasDetails && copy.extra) {
    cursor -= small + 2;
    page.drawText(copy.extra.slice(0, 80), { x: x + pad, y: cursor, size: small, font, color: MUTE, maxWidth: textW });
  }

  if (showHeader) {
    cursor -= 5;
    const ruleW = Math.min(textW, Math.max(36, w * 0.28));
    page.drawRectangle({ x: x + pad, y: cursor, width: ruleW, height: 1.75, color: GREEN });
    cursor -= 6;
  }

  const noteReserve = includeNote && size.notes && copy.note ? small + 6 : 0;
  const bodyTop = cursor;
  const bodyBottom = y + pad + noteReserve;
  const bodyH = Math.max(16, bodyTop - bodyBottom);
  const showPhoto = Boolean(includePhoto && size.photo && photo);
  const photoCol = showPhoto ? Math.min(w * 0.3, bodyH * 0.95) : 0;
  const codesX = x + pad + (showPhoto ? photoCol + 5 : 0);
  const codesW = Math.max(12, w - pad * 2 - (showPhoto ? photoCol + 5 : 0));

  if (showPhoto && photo) {
    const scale = Math.min(photoCol / photo.width, bodyH / photo.height);
    const pw = photo.width * scale;
    const ph = photo.height * scale;
    page.drawImage(photo, {
      x: x + pad,
      y: bodyBottom + (bodyH - ph) / 2,
      width: pw,
      height: ph,
    });
  }

  const showLogo = Boolean(includeLogo && size.logo && copy.logo);
  const logoSize = showLogo ? Math.min(18, codesW * 0.22) : 0;
  const sidReserve = sidSize + 3;
  const markBudget = Math.max(14, bodyH - (showLogo ? logoSize + 4 : 0) - sidReserve);

  let stackTop = bodyTop;
  if (showLogo && copy.logo) {
    stackTop -= logoSize;
    page.drawCircle({
      x: codesX + codesW / 2,
      y: stackTop + logoSize / 2,
      size: logoSize / 2,
      color: GREEN,
    });
    const logoText = copy.logo.slice(0, 3);
    const logoFontSize = Math.max(5, Math.min(8, logoSize * 0.45));
    const tw = bold.widthOfTextAtSize(logoText, logoFontSize);
    page.drawText(logoText, {
      x: codesX + codesW / 2 - tw / 2,
      y: stackTop + logoSize / 2 - logoFontSize * 0.35,
      size: logoFontSize,
      font: bold,
      color: rgb(1, 1, 1),
    });
    stackTop -= 3;
  }

  const codeScale = Math.min(codesW / code.width, markBudget / code.height);
  const cw = code.width * codeScale;
  const ch = code.height * codeScale;
  const blockH = ch + sidReserve;
  const blockBottom = bodyBottom + Math.max(0, (stackTop - bodyBottom - blockH) / 2);
  const codeY = blockBottom + sidReserve;
  page.drawImage(code, {
    x: codesX + (codesW - cw) / 2,
    y: codeY,
    width: cw,
    height: ch,
  });

  // SID always under the code (QR and barcode) — Sortly parity
  const sid = copy.value.slice(0, 16);
  const sw = font.widthOfTextAtSize(sid, sidSize);
  page.drawText(sid, {
    x: codesX + (codesW - sw) / 2,
    y: Math.max(y + 2, codeY - sidSize - 1),
    size: sidSize,
    font,
    color: INK,
  });

  if (includeNote && size.notes && copy.note) {
    page.drawText(copy.note.slice(0, 60), {
      x: x + pad,
      y: y + pad,
      size: small,
      font,
      color: MUTE,
      maxWidth: textW,
    });
  }
}

function sheetOrigin(size: LabelSize, pageWidth: number, pageHeight: number, labelW: number, labelH: number) {
  if (size.paper === "THERMAL") {
    return { left: 0, top: 0, gapH: 0, gapV: 0 };
  }
  if (size.marginTopIn != null && size.marginLeftIn != null) {
    return {
      left: size.marginLeftIn * 72,
      top: size.marginTopIn * 72,
      gapH: (size.gapHIn ?? 0) * 72,
      gapV: (size.gapVIn ?? 0) * 72,
    };
  }
  const cols = size.cols;
  const rows = size.rows;
  const gapH = Math.max(0, (pageWidth - cols * labelW) / (cols + 1));
  const gapV = Math.max(0, (pageHeight - rows * labelH) / (rows + 1));
  return { left: gapH, top: gapV, gapH, gapV };
}

export async function buildLabelPdf(spec: LabelPdfSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const unique = [...new Set(spec.copies.map((row) => row.value))];
  const codeImages = new Map<string, PDFImage>();
  await Promise.all(
    unique.map(async (value) => {
      const encoded = encodeLabelValue(value, spec.kind, origin);
      const bytes = spec.kind === "QR" ? await qrPngBytes(encoded) : await barcodePngBytes(encoded);
      codeImages.set(value, spec.kind === "QR" ? await pdf.embedPng(bytes) : await pdf.embedPng(bytes));
    }),
  );

  const photoCache = new Map<string, PDFImage | null>();
  async function photoFor(url: string | null | undefined) {
    if (!url || !spec.includePhoto || !spec.size.photo) return null;
    if (photoCache.has(url)) return photoCache.get(url) ?? null;
    const img = await embedPhoto(pdf, url);
    photoCache.set(url, img);
    return img;
  }

  if (spec.instructions) {
    const pageSize = paperPts(spec.size);
    const page = pdf.addPage([pageSize.width, pageSize.height]);
    drawInstructions(page, font, bold, spec.size);
  }

  const per = perSheet(spec.size);
  const start = Math.max(1, Math.min(spec.startPosition, per)) - 1;
  const slots: Array<LabelPdfCopy | null> = Array.from({ length: start }, () => null);
  slots.push(...spec.copies);
  while (slots.length % per !== 0) slots.push(null);

  const pageSize = paperPts(spec.size);
  const labelW = spec.size.widthIn * 72;
  const labelH = spec.size.heightIn * 72;
  const cols = spec.size.cols;
  const { left, top, gapH, gapV } = sheetOrigin(spec.size, pageSize.width, pageSize.height, labelW, labelH);

  for (let i = 0; i < slots.length; i += per) {
    const page = pdf.addPage([pageSize.width, pageSize.height]);
    const chunk = slots.slice(i, i + per);
    for (let idx = 0; idx < chunk.length; idx++) {
      const copy = chunk[idx];
      if (!copy) continue;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = left + col * (labelW + gapH);
      const y = pageSize.height - top - (row + 1) * labelH - row * gapV;
      const code = codeImages.get(copy.value);
      if (!code) continue;
      const photo = await photoFor(copy.photoUrl);
      drawLabelCell(page, {
        x,
        y,
        w: labelW,
        h: labelH,
        copy,
        size: spec.size,
        kind: spec.kind,
        code,
        photo,
        font,
        bold,
        includeLogo: spec.includeLogo,
        includeDetails: spec.includeDetails,
        includeNote: spec.includeNote,
        includePhoto: spec.includePhoto,
      });
    }
  }

  return pdf.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openPdfBytes(bytes: Uint8Array) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank");
  if (!popup) {
    downloadPdfBytes(bytes, "labels.pdf");
  }
}

export function pdfBytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export type { PaperId };
