export const APP_NAME = "Primary WMS";
export const DEFAULT_ACCENT = "#2E8B57";
export const DEFAULT_INITIALS = "PW";
export const DEFAULT_CURRENCY = "GBP";
export const DEFAULT_COUNTRY = "GB";
export const DEFAULT_TIMEZONE = "Europe/London";
export const DEFAULT_DATE_FORMAT = "dd/MM/yyyy";
export const ALL_ITEMS_NAME = "All Items";
export const MAX_FOLDER_DEPTH = 6;
export const MAX_PHOTOS = 8;
export const MAX_PHOTO_TOTAL_BYTES = 30 * 1024 * 1024;
export const SMALL_TEXT_MAX = 190;
export const LARGE_TEXT_MAX = 4000;
export const SID_LENGTH = 11;
export const SESSION_COOKIE = "pwms_session";
export const SESSION_TTL_DAYS = 30;
export const INVITE_TTL_DAYS = 14;
export const RESET_TTL_HOURS = 2;
export const TRASH_RETENTION_DAYS = 30;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const SYSTEM_CUSTOM_FIELDS = [
  { name: "Description", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Category", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Condition", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Size", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Building", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Floor Number", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Make", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "More info", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Colour", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Order Number", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Buy Price", type: "LARGE_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Model/Part Number", type: "SMALL_TEXT" as const, appliesTo: "ITEM" as const },
  { name: "Purchase Date", type: "DATE" as const, appliesTo: "BOTH" as const },
] as const;

export const SYSTEM_UNITS = [
  { name: "Unit", abbreviation: "unit", type: "COUNT" as const, isDefault: true, isSystem: true },
  { name: "Each", abbreviation: "ea", type: "COUNT" as const, isDefault: false, isSystem: false },
  { name: "Box", abbreviation: "box", type: "COUNT" as const, isDefault: false, isSystem: false },
  { name: "Pound", abbreviation: "lbs", type: "WEIGHT" as const, isDefault: false, isSystem: true },
  { name: "Kilogram", abbreviation: "kg", type: "WEIGHT" as const, isDefault: false, isSystem: true },
  { name: "Gram", abbreviation: "g", type: "WEIGHT" as const, isDefault: false, isSystem: true },
  { name: "Ounce", abbreviation: "oz", type: "WEIGHT" as const, isDefault: false, isSystem: true },
  { name: "Yard", abbreviation: "yd", type: "LENGTH" as const, isDefault: false, isSystem: true },
  { name: "Foot", abbreviation: "ft", type: "LENGTH" as const, isDefault: false, isSystem: true },
  { name: "Inch", abbreviation: "in", type: "LENGTH" as const, isDefault: false, isSystem: true },
  { name: "Meter", abbreviation: "m", type: "LENGTH" as const, isDefault: false, isSystem: true },
  { name: "Centimeter", abbreviation: "cm", type: "LENGTH" as const, isDefault: false, isSystem: true },
  { name: "Millimeter", abbreviation: "mm", type: "LENGTH" as const, isDefault: false, isSystem: true },
  { name: "Gallon", abbreviation: "gal", type: "VOLUME" as const, isDefault: false, isSystem: true },
  { name: "Liter", abbreviation: "l", type: "VOLUME" as const, isDefault: false, isSystem: true },
  { name: "Milliliter", abbreviation: "ml", type: "VOLUME" as const, isDefault: false, isSystem: true },
] as const;

export const QTY_REASONS = [
  "Consumed",
  "Damaged",
  "Inventory Count Adjustment",
  "Picked",
  "Restocked",
  "Returned",
  "Sold",
  "Stocktake",
  "Stolen",
] as const;

export const MOVE_REASONS = [
  "Added to Job",
  "Consumed",
  "Damaged",
  "Donation",
  "End of Life (EOL)",
  "Expired",
  "Gift",
  "Incorrectly Added",
  "Inventory Count Adjustment",
  "Invoice Not Received",
  "Item Recall",
  "Moved Within Job",
  "Not Used",
  "Other",
  "Out of Season",
  "Picked",
  "Quality Control",
  "Replenish",
  "Return to Supplier",
  "Signed In",
  "Signed Out",
  "Sold",
] as const;

export type RoleKind = "SUPER_ADMIN" | "ADMIN" | "TEAM_MEMBER" | "SCANNER" | "CUSTOM";
export type FolderGrant = "VIEW" | "EDIT";

export const PERMISSIONS = [
  "view_item",
  "add_item",
  "edit_item",
  "delete_item",
  "update_quantity",
  "move_item",
  "clone_item",
  "merge_item",
  "create_label",
  "link_barcode",
  "set_alerts",
  "add_folder",
  "edit_folder",
  "bulk_edit",
  "import",
  "export",
  "reports",
  "manage_users",
  "company_settings",
  "manage_catalog_settings",
  "see_prices",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const ROLE_DEFAULTS: Record<
  Exclude<RoleKind, "CUSTOM">,
  Partial<Record<PermissionKey, boolean>>
> = {
  SUPER_ADMIN: Object.fromEntries(PERMISSIONS.map((p) => [p, true])),
  ADMIN: {
    ...Object.fromEntries(PERMISSIONS.map((p) => [p, true])),
    manage_users: true,
    company_settings: true,
  },
  TEAM_MEMBER: {
    view_item: true,
    add_item: true,
    edit_item: true,
    delete_item: true,
    update_quantity: true,
    move_item: true,
    clone_item: true,
    merge_item: true,
    create_label: true,
    link_barcode: true,
    set_alerts: true,
    add_folder: true,
    edit_folder: true,
    bulk_edit: true,
    export: true,
    see_prices: true,
  },
  SCANNER: {
    view_item: true,
    update_quantity: true,
    move_item: true,
    create_label: true,
    link_barcode: true,
  },
};

const SID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSid(): string {
  let body = "";
  for (let i = 0; i < SID_LENGTH - 1; i++) {
    body += SID_CHARS[Math.floor(Math.random() * SID_CHARS.length)];
  }
  return `S${body}`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return DEFAULT_INITIALS;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatMoney(value: number | string | null | undefined, currency = DEFAULT_CURRENCY) {
  const n = value == null ? 0 : Number(value);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number.isFinite(n) ? n : 0);
}

export function totalValue(qty: number | string, price: number | string | null | undefined) {
  return Number(qty) * Number(price ?? 0);
}

export type FolderNode = { id: string; parentId: string | null; name: string };

export function folderDepth(folders: FolderNode[], folderId: string | null): number {
  if (!folderId) return 1;
  const byId = new Map(folders.map((f) => [f.id, f]));
  let depth = 1;
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    depth += 1;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

export function folderPath(folders: FolderNode[], folderId: string | null): FolderNode[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: FolderNode[] = [];
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}
