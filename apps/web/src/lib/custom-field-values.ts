import { LARGE_TEXT_MAX, SMALL_TEXT_MAX } from "@primarywms/shared";

export type CustomFieldDef = {
  id: string;
  name: string;
  type: string;
  appliesTo: string;
  placeholder?: string | null;
  defaultValue?: string | null;
  options?: unknown;
  maxLength?: number | null;
  listVisible?: boolean;
};

export type CustomValuePayload = {
  fieldId: string;
  valueText?: string | null;
  valueDate?: string | null;
  valueBool?: boolean | null;
  valueNum?: number | null;
};

export type StoredCustomValue = {
  fieldId: string;
  valueText?: string | null;
  valueDate?: string | Date | null;
  valueBool?: boolean | null;
  valueNum?: number | string | null;
  field?: { name: string; type: string };
};

export type FileAttachment = { id?: string; name: string; url?: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()[\]\d\s.-]{7,190}$/;
const WHOLE_MAX = 2_147_483_647;
const WHOLE_MIN = -2_147_483_648;
const DECIMAL_MAX = 68_719_476_735.99999;

export function dropdownOptions(field: Pick<CustomFieldDef, "options">): string[] {
  const raw = field.options;
  if (Array.isArray(raw)) return raw.map((row) => String(row).trim()).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((row) => String(row).trim()).filter(Boolean);
    } catch {
      return raw.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    }
  }
  return [];
}

export function parseFileAttachments(raw: string | null | undefined): FileAttachment[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        id: typeof row?.id === "string" ? row.id : undefined,
        name: String(row?.name ?? "").trim(),
        url: typeof row?.url === "string" ? row.url : null,
      }))
      .filter((row) => row.name);
  } catch {
    return [];
  }
}

export function defaultsFromFields(fields: CustomFieldDef[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "CHECKBOX") {
      next[field.id] = field.defaultValue === "true" || field.defaultValue === "1" ? "true" : "";
    } else if (field.defaultValue) {
      next[field.id] = field.defaultValue;
    }
  }
  return next;
}

export function storedToFormValue(field: CustomFieldDef, stored?: StoredCustomValue | null): string {
  if (!stored) return defaultsFromFields([field])[field.id] ?? "";
  if (field.type === "CHECKBOX") return stored.valueBool ? "true" : "";
  if (field.type === "DATE") return toIsoDate(stored.valueDate);
  if (field.type === "WHOLE_NUMBER" || field.type === "DECIMAL") {
    if (stored.valueNum != null && stored.valueNum !== "") return String(stored.valueNum);
    return stored.valueText ?? "";
  }
  return stored.valueText ?? "";
}

export function valuesFromStored(fields: CustomFieldDef[], stored: StoredCustomValue[]): Record<string, string> {
  const byField = new Map(stored.map((row) => [row.fieldId, row]));
  const next = defaultsFromFields(fields);
  for (const field of fields) {
    const row = byField.get(field.id);
    if (row) next[field.id] = storedToFormValue(field, row);
  }
  return next;
}

export function toCustomValuePayloads(fields: CustomFieldDef[], values: Record<string, string>): CustomValuePayload[] {
  return fields.map((field) => ({ fieldId: field.id, ...encodeFieldValue(field, values[field.id] ?? "") }));
}

export function encodeFieldValue(
  field: CustomFieldDef,
  raw: string,
): Omit<CustomValuePayload, "fieldId"> {
  const empty = { valueText: null, valueDate: null, valueBool: null, valueNum: null };
  if (field.type === "CHECKBOX") {
    return { ...empty, valueBool: raw === "true" || raw === "1" };
  }
  const trimmed = raw.trim();
  if (!trimmed || (field.type === "FILE" && trimmed === "[]")) return empty;
  if (field.type === "DATE") return { ...empty, valueDate: trimmed };
  if (field.type === "WEB_LINK") return { ...empty, valueText: normalizeWebLink(trimmed) };
  if (field.type === "WHOLE_NUMBER" || field.type === "DECIMAL") {
    const num = Number(trimmed);
    return { ...empty, valueNum: Number.isFinite(num) ? num : null, valueText: trimmed };
  }
  return { ...empty, valueText: trimmed };
}

export function isEmptyCustomPayload(value: Omit<CustomValuePayload, "fieldId">) {
  return value.valueText == null && value.valueDate == null && value.valueBool == null && value.valueNum == null;
}

export function validateFieldValue(field: CustomFieldDef, raw: string) {
  if (field.type === "CHECKBOX") return;
  const trimmed = raw.trim();
  if (!trimmed || (field.type === "FILE" && trimmed === "[]")) return;

  const limit =
    field.maxLength ??
    (field.type === "LARGE_TEXT" ? LARGE_TEXT_MAX : field.type === "WEB_LINK" ? 300 : SMALL_TEXT_MAX);

  if (field.type === "WHOLE_NUMBER") {
    if (!/^-?\d+$/.test(trimmed)) throw new Error(`${field.name} must be a whole number`);
    const num = Number(trimmed);
    if (num > WHOLE_MAX || num < WHOLE_MIN) throw new Error(`${field.name} is out of range`);
    return;
  }
  if (field.type === "DECIMAL") {
    const num = Number(trimmed);
    if (!Number.isFinite(num)) throw new Error(`${field.name} must be a number`);
    if (Math.abs(num) > DECIMAL_MAX) throw new Error(`${field.name} is out of range`);
    return;
  }
  if (field.type === "DATE") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new Error(`${field.name} must be a valid date`);
    return;
  }
  if (field.type === "EMAIL" && !EMAIL_RE.test(trimmed)) throw new Error(`${field.name} must be a valid email`);
  if (field.type === "PHONE" && !PHONE_RE.test(trimmed)) throw new Error(`${field.name} must be a valid phone number`);
  if (field.type === "WEB_LINK") {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      throw new Error(`${field.name} must be a valid web link`);
    }
    if (trimmed.length > 300) throw new Error(`${field.name} must be 300 characters or fewer`);
    return;
  }
  if (field.type === "DROPDOWN") {
    const options = dropdownOptions(field);
    if (options.length && !options.includes(trimmed)) throw new Error(`${field.name} must be one of the defined options`);
    return;
  }
  if (field.type === "FILE") {
    const files = parseFileAttachments(trimmed);
    if (files.length > 3) throw new Error(`${field.name} can have at most 3 files`);
    return;
  }
  if (trimmed.length > limit) throw new Error(`${field.name} must be ${limit} characters or fewer`);
}

export function formatCustomValue(field: Pick<CustomFieldDef, "type" | "name">, stored?: StoredCustomValue | null): string {
  if (!stored) return "—";
  if (field.type === "CHECKBOX") {
    if (stored.valueBool == null) return "—";
    return stored.valueBool ? "Yes" : "No";
  }
  if (field.type === "DATE") {
    const iso = toIsoDate(stored.valueDate);
    if (!iso) return "—";
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  }
  if (field.type === "FILE") {
    const files = parseFileAttachments(stored.valueText);
    return files.map((file) => file.name).join(", ") || "—";
  }
  if (stored.valueText?.trim()) return stored.valueText;
  if (stored.valueNum != null && stored.valueNum !== "") return String(stored.valueNum);
  return "—";
}

export function toIsoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function normalizeWebLink(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
