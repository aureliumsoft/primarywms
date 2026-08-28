import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import type { LabelKind, LabelSize, PaperId } from "./label-sizes";
import { PAPERS, perSheet } from "./label-sizes";
import { encodeLabelValue } from "./scan-code";

export type PrintLabelCopy = {
  name: string;
  value: string;
  extra?: string;
  note?: string;
  photoUrl?: string | null;
  logo?: string | null;
};

export type PrintSpec = {
  size: LabelSize;
  kind: LabelKind;
  copies: PrintLabelCopy[];
  startPosition: number;
  instructions: boolean;
  includePhoto: boolean;
  includeLogo: boolean;
};

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsBarcodeFormat() {
  return "CODE128";
}

async function codeMarkup(value: string, kind: LabelKind) {
  if (kind === "QR") {
    return QRCode.toString(value, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#2a3a33", light: "#ffffff" },
    });
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, {
    format: jsBarcodeFormat(),
    displayValue: true,
    fontSize: 11,
    height: 42,
    margin: 2,
    lineColor: "#2a3a33",
    background: "#ffffff",
  });
  return svg.outerHTML;
}

function paperFor(size: LabelSize) {
  if (size.paper === "THERMAL") {
    return { id: "THERMAL" as PaperId, widthIn: size.widthIn, heightIn: size.heightIn };
  }
  return PAPERS.find((row) => row.id === size.paper)!;
}

function labelInnerHtml(copy: PrintLabelCopy, spec: PrintSpec, code: string) {
  const photo =
    spec.includePhoto && spec.size.photo && copy.photoUrl
      ? `<img class="photo" src="${esc(copy.photoUrl)}" alt="" />`
      : "";
  const logo =
    spec.includeLogo && copy.logo
      ? `<div class="logo">${esc(copy.logo)}</div>`
      : "";
  const extra = copy.extra ? `<div class="extra">${esc(copy.extra)}</div>` : "";
  const note = copy.note ? `<div class="note">${esc(copy.note)}</div>` : "";
  const mark = spec.kind === "QR" ? `<div class="qr">${code}</div>` : `<div class="barcode">${code}</div>`;
  return `
    <div class="name">${esc(copy.name)}</div>
    ${extra}
    <div class="rule"></div>
    <div class="body">
      ${photo}
      <div class="codes">
        ${logo}
        ${mark}
        <div class="sid">${esc(copy.value)}</div>
      </div>
    </div>
    ${note}
  `;
}

function instructionsHtml(spec: PrintSpec) {
  const avery = spec.size.avery.length ? spec.size.avery.join(", ") : "your label stock";
  return `
    <section class="page instructions">
      <h1>Printing instructions</h1>
      <p>Print at <strong>100% / actual size</strong>. Turn off “Fit to page” or “Shrink to fit” in the print dialog.</p>
      <p>Use ${esc(spec.size.printerType)} media. This layout is compatible with Avery ${esc(avery)} (${perSheet(spec.size)} labels per sheet).</p>
      <p>Do not edit the PDF in a drawing app — reprint from Primary WMS if you need a different size or note. Reprinting does not change the stored QR or barcode value.</p>
      <p>Choose <strong>Save as PDF</strong> as the destination if you want a file, or send it to your label printer.</p>
    </section>
  `;
}

export async function printLabels(spec: PrintSpec) {
  const paper = paperFor(spec.size);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const unique = [...new Set(spec.copies.map((row) => row.value))];
  const codes = new Map<string, string>();
  await Promise.all(
    unique.map(async (value) => {
      const encoded = encodeLabelValue(value, spec.kind, origin);
      codes.set(value, await codeMarkup(encoded, spec.kind));
    }),
  );

  const per = perSheet(spec.size);
  const start = Math.max(1, Math.min(spec.startPosition, per)) - 1;
  const slots: Array<PrintLabelCopy | null> = Array.from({ length: start }, () => null);
  slots.push(...spec.copies);
  while (slots.length % per !== 0) slots.push(null);

  const pages: string[] = [];
  if (spec.instructions) pages.push(instructionsHtml(spec));

  for (let i = 0; i < slots.length; i += per) {
    const cells = slots.slice(i, i + per).map((copy) => {
      if (!copy) return `<div class="label empty"></div>`;
      const origin = window.location.origin;
      const photoUrl = copy.photoUrl
        ? copy.photoUrl.startsWith("http")
          ? copy.photoUrl
          : `${origin}${copy.photoUrl}`
        : null;
      return `<div class="label">${labelInnerHtml({ ...copy, photoUrl }, spec, codes.get(copy.value) ?? "")}</div>`;
    });
    pages.push(`<section class="page sheet">${cells.join("")}</section>`);
  }

  const pageSize =
    spec.size.paper === "THERMAL"
      ? `${spec.size.widthIn}in ${spec.size.heightIn}in`
      : spec.size.paper === "A4"
        ? "A4"
        : "letter";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Primary WMS Labels</title>
  <style>
    @page { size: ${pageSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; color: #2a3a33; font-family: Arial, Helvetica, sans-serif; }
    .page {
      width: ${paper.widthIn}in;
      height: ${paper.heightIn}in;
      page-break-after: always;
      break-after: page;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(${spec.size.cols}, ${spec.size.widthIn}in);
      grid-template-rows: repeat(${spec.size.rows}, ${spec.size.heightIn}in);
      justify-content: space-evenly;
      align-content: space-evenly;
      padding: 0.2in 0.12in;
    }
    .label {
      width: ${spec.size.widthIn}in;
      height: ${spec.size.heightIn}in;
      overflow: hidden;
      padding: 0.08in 0.1in;
      display: flex;
      flex-direction: column;
    }
    .label.empty { visibility: hidden; }
    .name { font-size: ${spec.size.heightIn < 1.2 ? "8px" : "13px"}; font-weight: 700; line-height: 1.2; }
    .extra { font-size: 10px; color: #4a5c54; margin-top: 2px; }
    .rule { height: 2px; background: #2E8B57; margin: 4px 0 6px; }
    .body { display: flex; gap: 6px; flex: 1; min-height: 0; align-items: center; }
    .photo { width: ${spec.size.photo && spec.size.widthIn >= 3 ? "32%" : "24%"}; height: auto; max-height: 70%; object-fit: cover; border-radius: 4px; }
    .codes { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; }
    .logo {
      width: 22px; height: 22px; border-radius: 999px; background: #2E8B57; color: white;
      font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
    }
    .qr { width: ${Math.min(1.6, spec.size.heightIn * 0.45)}in; height: ${Math.min(1.6, spec.size.heightIn * 0.45)}in; }
    .qr svg, .barcode svg { width: 100%; height: 100%; display: block; }
    .barcode { width: 100%; max-height: ${Math.min(0.7, spec.size.heightIn * 0.5)}in; }
    .sid { font-family: ui-monospace, Consolas, monospace; font-size: ${spec.size.heightIn < 1.2 ? "8px" : "11px"}; letter-spacing: 0.04em; margin-top: 3px; }
    .note { font-size: 9px; color: #4a5c54; margin-top: auto; }
    .instructions { padding: 0.9in; }
    .instructions h1 { font-size: 22px; margin: 0 0 16px; }
    .instructions p { font-size: 14px; line-height: 1.5; margin: 0 0 12px; }
    @media print { .page { margin: 0; } }
  </style>
</head>
<body>
  ${pages.join("")}
  <script>window.onload = function () { window.focus(); window.print(); };<\/script>
</body>
</html>`;

  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) throw new Error("Allow pop-ups to download or print labels");
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
