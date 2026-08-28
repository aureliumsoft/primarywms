export type LabelKind = "QR" | "BARCODE";
export type PaperId = "US_LETTER" | "A4" | "THERMAL";

export type PaperSpec = {
  id: PaperId;
  label: string;
  widthIn: number;
  heightIn: number;
};

export type LabelSize = {
  id: string;
  kind: LabelKind;
  paper: PaperId;
  name: string;
  displaySize: string;
  widthIn: number;
  heightIn: number;
  cols: number;
  rows: number;
  avery: string[];
  batchCap: number;
  photo: boolean;
  printerType: "laser / inkjet" | "thermal";
};

export const PAPERS: PaperSpec[] = [
  { id: "US_LETTER", label: "US Letter (8.5in x 11in)", widthIn: 8.5, heightIn: 11 },
  { id: "A4", label: "A4 Sheet (21.0cm x 29.7cm)", widthIn: 8.27, heightIn: 11.69 },
  { id: "THERMAL", label: "Label printer", widthIn: 0, heightIn: 0 },
];

const AVERY_LABELS = "https://www.avery.com/products/labels";
const AVERY_PRINTERS = "https://www.avery.com/products/printers-and-label-makers";
const THERMAL_PRINTERS = "https://www.zebra.com/us/en/products/printers.html";

export const BUY_BLANK_LABELS_URL = AVERY_LABELS;

export function buyPrintersUrl(paper: PaperId) {
  return paper === "THERMAL" ? THERMAL_PRINTERS : AVERY_PRINTERS;
}

const SIZES: LabelSize[] = [
  // US Letter QR
  size("letter-qr-xl", "QR", "US_LETTER", "Extra Large", "5½ × 8½ in", 5.5, 8.5, 1, 1, ["15264", "5526"], 50, true),
  size("letter-qr-lg", "QR", "US_LETTER", "Large", "3⅓ × 4 in", 3.333, 4, 2, 3, ["5264", "8164", "1744907"], 150, true),
  size("letter-qr-md", "QR", "US_LETTER", "Medium", "4 × 2 in", 4, 2, 2, 5, ["5163", "8163"], 250, false),
  size("letter-qr-mdt", "QR", "US_LETTER", "Medium tall", "2 × 4 in", 2, 4, 4, 2, ["5163"], 250, true),
  size("letter-qr-sm", "QR", "US_LETTER", "Small", "4 × 1⅓ in", 4, 1.333, 2, 7, ["5162", "8162"], 350, false),
  size("letter-qr-xs", "QR", "US_LETTER", "Extra Small", "2⅝ × 1 in", 2.625, 1, 3, 10, ["5160", "8160"], 750, false),
  size("letter-qr-micro", "QR", "US_LETTER", "Micro", "1 × 1 in", 1, 1, 8, 10, ["22805"], 1500, false),
  // A4 QR
  size("a4-qr-xl", "QR", "A4", "Extra Large", "19.96cm × 14.31cm", 7.86, 5.63, 1, 2, ["L7168"], 50, true),
  size("a4-qr-lg", "QR", "A4", "Large", "9.31cm × 9.9cm", 3.665, 3.898, 2, 3, ["L7166", "J8166", "1744907"], 150, true),
  size("a4-qr-md", "QR", "A4", "Medium", "9.91cm × 3.81cm", 3.902, 1.5, 2, 7, ["L7162", "J8162"], 250, false),
  size("a4-qr-mdt", "QR", "A4", "Medium tall", "3.81cm × 9.91cm", 1.5, 3.902, 5, 2, ["L7162"], 250, true),
  size("a4-qr-sm", "QR", "A4", "Small", "9.91cm × 3.39cm", 3.902, 1.335, 2, 8, ["L7173"], 350, false),
  size("a4-qr-xs", "QR", "A4", "Extra Small", "6.35cm × 3.81cm", 2.5, 1.5, 3, 7, ["L7160", "J8160"], 750, false),
  size("a4-qr-micro", "QR", "A4", "Micro", "2.54cm × 2.54cm", 1, 1, 8, 10, ["L7656"], 1500, false),
  // US Letter barcode
  size("letter-bc-sm", "BARCODE", "US_LETTER", "Small", "1¾ × ½ in", 1.75, 0.5, 4, 20, ["5167", "8167"], 1500, false),
  size("letter-bc-md", "BARCODE", "US_LETTER", "Medium", "2⅝ × 1 in", 2.625, 1, 3, 10, ["5160", "8160"], 500, false),
  // A4 barcode
  size("a4-bc-sm", "BARCODE", "A4", "Small", "3.81cm × 2.12cm", 1.5, 0.835, 5, 13, ["L7651"], 1500, false),
  size("a4-bc-md", "BARCODE", "A4", "Medium", "6.35cm × 3.39cm", 2.5, 1.335, 3, 8, ["L7159"], 500, false),
  // Thermal QR
  size("th-qr-sm", "QR", "THERMAL", "Small", "1½ × 1 in", 1.5, 1, 1, 1, [], 1500, false),
  size("th-qr-md", "QR", "THERMAL", "Medium", "2 × 1 in", 2, 1, 1, 1, [], 500, false),
  size("th-qr-mdl", "QR", "THERMAL", "Medium Long", "3 × 1 in", 3, 1, 1, 1, [], 350, false),
  size("th-qr-mdt", "QR", "THERMAL", "Medium Tall", "2¼ × 2¼ in", 2.25, 2.25, 1, 1, [], 250, true),
  size("th-qr-lg", "QR", "THERMAL", "Large", "4 × 3 in", 4, 3, 1, 1, [], 150, true),
  // Thermal barcode
  size("th-bc-md", "BARCODE", "THERMAL", "Medium", "¾ × 2 in", 2, 0.75, 1, 1, [], 500, false),
];

function size(
  id: string,
  kind: LabelKind,
  paper: PaperId,
  name: string,
  displaySize: string,
  widthIn: number,
  heightIn: number,
  cols: number,
  rows: number,
  avery: string[],
  batchCap: number,
  photo: boolean,
): LabelSize {
  return {
    id,
    kind,
    paper,
    name,
    displaySize,
    widthIn,
    heightIn,
    cols,
    rows,
    avery,
    batchCap,
    photo,
    printerType: paper === "THERMAL" ? "thermal" : "laser / inkjet",
  };
}

export function sizesFor(kind: LabelKind, paper: PaperId) {
  return SIZES.filter((row) => row.kind === kind && row.paper === paper);
}

export function getLabelSize(id: string) {
  return SIZES.find((row) => row.id === id);
}

export function perSheet(size: LabelSize) {
  return size.cols * size.rows;
}

export function sizeOptionLabel(size: LabelSize) {
  return `${size.name} (${size.displaySize})`;
}
