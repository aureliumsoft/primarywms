import type { LabelKind } from "./label-sizes";

/** Extract the inventory code from a raw scan (SID, URL, or deep link). */
export function parseScannedCode(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("v") || url.searchParams.get("code") || url.searchParams.get("scan");
    if (fromQuery?.trim()) return fromQuery.trim();
    const parts = url.pathname.split("/").filter(Boolean);
    const scanIdx = parts.findIndex((part) => part === "scan");
    if (scanIdx >= 0 && parts[scanIdx + 1]) return decodeURIComponent(parts[scanIdx + 1]);
  } catch {
    /* not a URL */
  }

  return trimmed;
}

/** Value encoded in printed QR labels (deep link). Barcodes keep the raw SID. */
export function encodeLabelValue(value: string, kind: LabelKind, origin?: string) {
  if (kind === "BARCODE") return value;
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return value;
  return `${base}/scan?v=${encodeURIComponent(value)}`;
}
