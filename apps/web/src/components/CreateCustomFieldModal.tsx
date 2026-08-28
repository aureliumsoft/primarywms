"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Barcode,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Hash,
  Link2,
  Paperclip,
  Phone,
  Type,
  X,
} from "lucide-react";
import { SMALL_TEXT_MAX, LARGE_TEXT_MAX } from "@primarywms/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export type CreatedCustomField = {
  id: string;
  name: string;
  type: string;
  appliesTo: string;
  placeholder?: string | null;
  defaultValue?: string | null;
  options?: unknown;
  listVisible?: boolean;
};

type FieldType =
  | "SMALL_TEXT"
  | "LARGE_TEXT"
  | "WHOLE_NUMBER"
  | "DECIMAL"
  | "CHECKBOX"
  | "DROPDOWN"
  | "DATE"
  | "SCANNER"
  | "PHONE"
  | "WEB_LINK"
  | "EMAIL"
  | "FILE";

const OPTIONS_MAX = 250;

const SUGGESTED = [
  { name: "Serial Number", type: "SMALL_TEXT" as const, Icon: Type },
  { name: "Expiry Date", type: "DATE" as const, Icon: Calendar },
  { name: "Product Link", type: "WEB_LINK" as const, Icon: Link2 },
];

const TYPES: {
  type: FieldType;
  label: string;
  hint: string;
  sample: string;
  Icon: typeof Type;
  limit?: string;
}[] = [
  { type: "SMALL_TEXT", label: "Small Text Box", hint: "Short text such as a serial number or manufacturer", sample: "Sample Text", Icon: Type, limit: `Character Limit: ${SMALL_TEXT_MAX}` },
  { type: "LARGE_TEXT", label: "Large Text Box", hint: "Longer notes, description, or specifications", sample: "Sample description text", Icon: Type, limit: `Character Limit: ${LARGE_TEXT_MAX}` },
  { type: "WHOLE_NUMBER", label: "Round Number", hint: "Whole numbers only, such as a count or year", sample: "123", Icon: Hash },
  { type: "DECIMAL", label: "Decimal Number", hint: "Numbers with decimals, such as weight or cost", sample: "12.50", Icon: Hash },
  { type: "CHECKBOX", label: "Checkbox", hint: "Yes / no flag such as Insured or Fragile", sample: "true", Icon: CheckSquare },
  { type: "DROPDOWN", label: "Dropdown", hint: "Allows to select one option from a list", sample: "Sample Options", Icon: ChevronDown, limit: `Options limit: ${OPTIONS_MAX}` },
  { type: "DATE", label: "Date", hint: "A calendar date such as expiry or purchase date", sample: "2026-08-22", Icon: Calendar },
  { type: "SCANNER", label: "Scanner", hint: "Capture a barcode or QR value with a scanner", sample: "ABC-12345", Icon: Barcode, limit: `Character Limit: ${SMALL_TEXT_MAX}` },
  { type: "PHONE", label: "Phone Number", hint: "A phone number, such as a supplier contact", sample: "+44 7700 900123", Icon: Phone, limit: `Character Limit: ${SMALL_TEXT_MAX}` },
  { type: "WEB_LINK", label: "Web Link", hint: "An external URL such as a product page", sample: "https://www.google.com", Icon: Link2, limit: "Character Limit: 300" },
  { type: "EMAIL", label: "Email", hint: "An email address, such as a vendor contact", sample: "name@example.com", Icon: AtSign, limit: `Character Limit: ${SMALL_TEXT_MAX}` },
  { type: "FILE", label: "File Attachment", hint: "Attach PDF, Word, or Excel files (max 3)", sample: "sample.pdf", Icon: Paperclip, limit: "Max 3 files (PDF, Word, Excel)" },
];

export function CreateCustomFieldModal({
  open,
  defaultFolders = false,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultFolders?: boolean;
  onClose: () => void;
  onCreated: (field: CreatedCustomField) => void;
}) {
  const [screen, setScreen] = useState<"suggested" | "types" | "config">("suggested");
  const [type, setType] = useState<FieldType | null>(null);
  const [name, setName] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [applyDefault, setApplyDefault] = useState(false);
  const [forItems, setForItems] = useState(!defaultFolders);
  const [forFolders, setForFolders] = useState(defaultFolders);
  const [options, setOptions] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setScreen("suggested");
    setType(null);
    setName("");
    setDefaultValue("");
    setPlaceholder("");
    setApplyDefault(false);
    setForItems(!defaultFolders);
    setForFolders(defaultFolders);
    setOptions("");
    setPending(false);
    setError("");
  }, [open, defaultFolders]);

  const typeMeta = TYPES.find((row) => row.type === type) ?? null;
  const optionList = useMemo(
    () => options.split(/\r?\n/).map((row) => row.trim()).filter(Boolean),
    [options],
  );
  const hasDefault = type === "CHECKBOX" ? defaultValue === "true" : Boolean(defaultValue.trim());
  const fromSuggested = SUGGESTED.some((row) => row.type === type && row.name === name);

  useEffect(() => {
    if (!hasDefault) setApplyDefault(false);
  }, [hasDefault]);

  const canNext =
    screen === "suggested" || screen === "types"
      ? Boolean(type)
      : name.trim().length > 0 &&
        (forItems || forFolders) &&
        (type !== "DROPDOWN" || optionList.length > 0);

  const appliesTo = useMemo(() => {
    if (forItems && forFolders) return "BOTH";
    if (forFolders) return "FOLDER";
    return "ITEM";
  }, [forItems, forFolders]);

  function pickSuggested(row: (typeof SUGGESTED)[number]) {
    setType(row.type);
    setName(row.name);
    setDefaultValue("");
    setPlaceholder("");
    setOptions("");
    setApplyDefault(false);
  }

  function pickType(next: FieldType) {
    setType(next);
    const meta = TYPES.find((row) => row.type === next);
    if (meta) setName(meta.label);
    setDefaultValue("");
    setPlaceholder("");
    setOptions("");
    setApplyDefault(false);
  }

  function goNext() {
    if (screen === "suggested" || screen === "types") {
      if (!type) return;
      if (!name.trim() && typeMeta) setName(typeMeta.label);
      setScreen("config");
      return;
    }
    void save();
  }

  async function save() {
    if (!type || !name.trim() || !(forItems || forFolders)) return;
    if (type === "DROPDOWN" && optionList.length > OPTIONS_MAX) {
      setError(`Dropdown fields can have at most ${OPTIONS_MAX} options`);
      return;
    }
    if (type === "DROPDOWN" && defaultValue && !optionList.includes(defaultValue)) {
      setError("Default option must be one of the listed options");
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await api<{ field: CreatedCustomField }>("/api/v1/settings/custom-fields", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          appliesTo,
          placeholder: type === "CHECKBOX" || type === "DATE" || type === "FILE" ? null : placeholder.trim() || null,
          defaultValue: hasDefault ? defaultValue.trim() || defaultValue : null,
          options: type === "DROPDOWN" ? optionList : undefined,
          applyDefault: hasDefault && applyDefault,
        }),
      });
      onCreated(res.field);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create field");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  const previewLabel = name.trim() || typeMeta?.label || "Field";
  const showPlaceholder = type !== "CHECKBOX" && type !== "DATE" && type !== "FILE";
  const showDefault = type !== "FILE";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(92vh,760px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
        <header className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[20px] font-medium text-[#2a3a33]">Create Custom Field</h2>
          <button type="button" onClick={onClose} className="text-[#9aa6a0] hover:text-[#3d4f47]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          <div className="min-h-0 overflow-y-auto px-6 pb-5 scrollbar-thin">
            {screen === "suggested" ? (
              <>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Suggested fields</p>
                <div className="space-y-2">
                  {SUGGESTED.map((row) => (
                    <button
                      key={row.name}
                      type="button"
                      onClick={() => pickSuggested(row)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border bg-white px-4 py-3.5 text-left text-[14px] text-[#2a3a33] shadow-sm",
                        type === row.type && name === row.name ? "border-primary" : "border-[#e4eae6] hover:border-primary/40",
                      )}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#6d847a] text-white">
                        <row.Icon className="h-4 w-4" />
                      </span>
                      {row.name}
                    </button>
                  ))}
                </div>
                <div className="relative my-6">
                  <span className="absolute inset-x-0 top-1/2 border-t border-[#e4eae6]" />
                  <span className="relative mx-auto block w-10 bg-white text-center text-[12px] font-semibold text-[#8a9a93]">OR</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScreen("types");
                    setType(null);
                    setName("");
                  }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Create your own field
                </button>
              </>
            ) : null}

            {screen === "types" ? (
              <>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Choose field type</p>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map((row) => (
                    <button
                      key={row.type}
                      type="button"
                      onClick={() => pickType(row.type)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-[13px] text-[#2a3a33]",
                        type === row.type ? "border-primary" : "border-[#e4eae6] hover:border-primary/40",
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#6d847a] text-white">
                        {row.type === "SMALL_TEXT" ? (
                          <span className="text-[13px] font-semibold leading-none">T</span>
                        ) : row.type === "WHOLE_NUMBER" ? (
                          <span className="text-[12px] font-semibold leading-none">1</span>
                        ) : row.type === "DECIMAL" ? (
                          <span className="text-[10px] font-semibold leading-none">1.11</span>
                        ) : (
                          <row.Icon className="h-3.5 w-3.5" />
                        )}
                      </span>
                      {row.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScreen("suggested");
                    setType(null);
                    setName("");
                  }}
                  className="mt-5 text-sm font-semibold text-primary hover:underline"
                >
                  Back to suggested fields
                </button>
              </>
            ) : null}

            {screen === "config" ? (
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Field options</p>
                <LabeledInput
                  label="Field Name*"
                  value={name}
                  onChange={setName}
                  maxLength={SMALL_TEXT_MAX}
                  hint="Shown as the label on items and folders."
                />

                {type === "DROPDOWN" ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Options</label>
                      <textarea
                        value={options}
                        onChange={(e) => {
                          const next = e.target.value;
                          setOptions(next);
                          const list = next.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
                          if (defaultValue && !list.includes(defaultValue)) setDefaultValue("");
                        }}
                        rows={4}
                        placeholder="One option per line"
                        className="w-full rounded-md border border-[#d8dfdb] px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <p className="mt-1 text-[12px] text-[#8a9a93]">
                        {optionList.length}/{OPTIONS_MAX} options
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] text-[#6b7c74]">Default Option</label>
                      <div className="relative">
                        <select
                          value={defaultValue}
                          onChange={(e) => setDefaultValue(e.target.value)}
                          className="h-11 w-full appearance-none rounded-md border border-[#d8dfdb] bg-white px-3 pr-16 text-sm outline-none focus:border-primary"
                        >
                          <option value="">None</option>
                          {optionList.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {defaultValue ? (
                          <button
                            type="button"
                            aria-label="Clear default"
                            onClick={() => setDefaultValue("")}
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-[#8a9a93] hover:text-[#3d4f47]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a93]" />
                      </div>
                    </div>
                  </>
                ) : null}

                {type === "CHECKBOX" ? (
                  <label className="flex items-center gap-2 text-sm text-[#3d4f47]">
                    <input
                      type="checkbox"
                      checked={defaultValue === "true"}
                      onChange={(e) => setDefaultValue(e.target.checked ? "true" : "")}
                    />
                    Default checked
                  </label>
                ) : null}

                {type !== "CHECKBOX" && type !== "DROPDOWN" && type !== "FILE" ? (
                  <LabeledInput
                    label={type === "DATE" ? "Default Date" : "Enter Default Text"}
                    value={defaultValue}
                    onChange={setDefaultValue}
                    type={type === "DATE" ? "date" : type === "WHOLE_NUMBER" || type === "DECIMAL" ? "number" : type === "EMAIL" ? "email" : type === "WEB_LINK" ? "url" : type === "PHONE" ? "tel" : "text"}
                    placeholder={type === "DATE" ? undefined : "Enter Default Text"}
                    maxLength={type === "WEB_LINK" ? 300 : SMALL_TEXT_MAX}
                    hint="Used when a new item or folder is created."
                  />
                ) : null}

                {showDefault ? (
                  <label className={cn("flex items-center gap-2 text-sm", hasDefault ? "text-[#3d4f47]" : "text-[#b0beb8]")}>
                    <input
                      type="checkbox"
                      disabled={!hasDefault}
                      checked={hasDefault && applyDefault}
                      onChange={(e) => setApplyDefault(e.target.checked)}
                    />
                    Apply default value to all existing {forItems ? "items" : "folders"}
                  </label>
                ) : null}

                {showPlaceholder ? (
                  <LabeledInput
                    label="Enter Placeholder Text"
                    value={placeholder}
                    onChange={setPlaceholder}
                    placeholder="Enter Placeholder Text"
                    maxLength={SMALL_TEXT_MAX}
                    hint="Shown inside an empty field."
                  />
                ) : null}

                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9a93]">Applicable to</p>
                  <p className="mb-3 text-[12px] text-[#8a9a93]">
                    Choose if the field should be applied to items, folders or both. This cannot be changed after the field has been created.
                  </p>
                  <div className="flex items-center gap-8">
                    <Toggle
                      label="Items"
                      on={forItems}
                      onChange={(next) => {
                        setForItems(next);
                        if (!next && !forFolders) setForFolders(true);
                      }}
                    />
                    <Toggle
                      label="Folders"
                      on={forFolders}
                      onChange={(next) => {
                        setForFolders(next);
                        if (!next && !forItems) setForItems(true);
                      }}
                    />
                  </div>
                </div>
                {error ? <p className="text-sm text-[#e24b4b]">{error}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="hidden min-h-0 overflow-y-auto bg-[#f4f6f5] p-6 md:block">
            {type && typeMeta ? (
              <div className="flex min-h-full flex-col">
                <div className="flex flex-1 flex-col items-stretch justify-center gap-5">
                  {screen === "config" ? (
                    <>
                      <PreviewBlock caption="Sample Value">
                        <FieldPreview type={type} label={previewLabel} value={typeMeta.sample} />
                      </PreviewBlock>
                      {showDefault ? (
                        <PreviewBlock caption={type === "DROPDOWN" ? "Field with Default Option" : "Field with Default Text"}>
                          <FieldPreview
                            type={type}
                            label={previewLabel}
                            value={hasDefault ? (type === "CHECKBOX" ? "true" : defaultValue) : ""}
                            emptyHint={hasDefault ? undefined : " "}
                          />
                        </PreviewBlock>
                      ) : null}
                      {showPlaceholder ? (
                        <PreviewBlock caption="Empty field with Placeholder Text">
                          <FieldPreview
                            type={type}
                            label={previewLabel}
                            value=""
                            placeholder={placeholder.trim() || undefined}
                            emptyHint={placeholder.trim() ? undefined : " "}
                          />
                        </PreviewBlock>
                      ) : null}
                    </>
                  ) : (
                    <div className="mx-auto w-full max-w-[320px] rounded-xl bg-white p-5 shadow-sm">
                      <FieldPreview type={type} label={previewLabel} value={typeMeta.sample} />
                    </div>
                  )}
                </div>
                <div className="pt-6 text-[12px] leading-5 text-[#6b7c74]">
                  <p>
                    Field Type: <span className="font-medium text-[#3d4f47]">{typeMeta.label}</span>
                    {typeMeta.hint ? ` (${typeMeta.hint})` : null}
                  </p>
                  {typeMeta.limit ? <p className="mt-1">{typeMeta.limit}</p> : null}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[320px] rounded-xl bg-[#ecefee]" />
            )}
          </div>
        </div>

        <footer className="flex items-center border-t border-[#ecefee] px-6 py-4">
          {screen === "config" ? (
            <button
              type="button"
              onClick={() => setScreen(fromSuggested ? "suggested" : "types")}
              className="rounded-md border border-[#d8dfdb] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-[#5c6b64]"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <span className="flex-1 text-center text-[13px] text-[#8a9a93]">Step {screen === "config" ? "2" : "1"} of 2</span>
          <button
            type="button"
            disabled={!canNext || pending}
            onClick={goNext}
            className="rounded-md bg-primary px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-40"
          >
            {screen === "config" ? (pending ? "Saving…" : "Save") : "Next"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] text-[#6b7c74]">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-md border border-[#d8dfdb] px-3 pr-9 text-sm outline-none placeholder:text-[#9aa6a0] focus:border-primary"
        />
        {hint ? (
          <span title={hint} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0beb8]">
            <CircleHelp className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm text-[#2a3a33]">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn("relative h-6 w-11 rounded-full transition", on ? "bg-primary" : "bg-[#cfd6d2]")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

function PreviewBlock({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[12px] text-[#6b7c74]">{caption}:</p>
      {children}
    </div>
  );
}

function FieldPreview({
  type,
  label,
  value,
  placeholder,
  emptyHint,
}: {
  type: FieldType;
  label: string;
  value: string;
  placeholder?: string;
  emptyHint?: string;
}) {
  const empty = !value;
  const shown = empty ? placeholder || emptyHint || "" : value;
  const muted = empty;

  if (type === "CHECKBOX") {
    return (
      <div className="rounded-md border border-[#d8dfdb] bg-white px-3 py-3">
        <label className="flex items-center gap-2 text-sm text-[#2a3a33]">
          <input type="checkbox" readOnly checked={value === "true"} className="accent-primary" />
          {label}
        </label>
      </div>
    );
  }

  if (type === "FILE") {
    return (
      <Outlined label={label}>
        <span className="inline-flex items-center gap-2 text-sm text-[#6b7c74]">
          <Paperclip className="h-4 w-4" />
          {shown || "Attach file"}
        </span>
      </Outlined>
    );
  }

  if (type === "LARGE_TEXT") {
    return (
      <Outlined label={label} tall>
        <span className={cn("block min-h-[52px] text-sm", muted && "text-[#9aa6a0]")}>{shown || "\u00A0"}</span>
      </Outlined>
    );
  }

  if (type === "DROPDOWN") {
    return (
      <Outlined label={label}>
        <span className={cn("flex items-center justify-between text-sm", muted && "text-[#9aa6a0]")}>
          <span>{shown || "\u00A0"}</span>
          <ChevronDown className="h-4 w-4 text-[#8a9a93]" />
        </span>
      </Outlined>
    );
  }

  if (type === "WEB_LINK") {
    return (
      <Outlined label={label}>
        <span className="flex items-center justify-between gap-2 text-sm">
          <span className={cn("truncate", muted && "text-[#9aa6a0]")}>{shown || "\u00A0"}</span>
          {!empty ? <ExternalLink className="h-4 w-4 shrink-0 text-[#8a9a93]" /> : null}
        </span>
      </Outlined>
    );
  }

  if (type === "DATE") {
    return (
      <Outlined label={label}>
        <span className="flex items-center justify-between text-sm">
          <span className={cn(muted && "text-[#9aa6a0]")}>
            {value ? value.split("-").reverse().join("/") : shown || "dd/mm/yyyy"}
          </span>
          <Calendar className="h-4 w-4 text-[#8a9a93]" />
        </span>
      </Outlined>
    );
  }

  return (
    <Outlined label={label}>
      <span className={cn("block truncate text-sm", muted && "text-[#9aa6a0]")}>{shown || "\u00A0"}</span>
    </Outlined>
  );
}

function Outlined({ label, tall, children }: { label: string; tall?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("relative rounded-md border border-[#d8dfdb] bg-white px-3", tall ? "py-3" : "py-2.5")}>
      <span className="absolute -top-2 left-2 bg-white px-1 text-[11px] text-[#6b7c74]">{label}</span>
      {children}
    </div>
  );
}
