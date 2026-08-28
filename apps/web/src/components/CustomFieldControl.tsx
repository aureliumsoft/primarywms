"use client";

import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { LARGE_TEXT_MAX, SMALL_TEXT_MAX } from "@primarywms/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  dropdownOptions,
  formatCustomValue,
  normalizeWebLink,
  parseFileAttachments,
  type CustomFieldDef,
  type FileAttachment,
  type StoredCustomValue,
} from "@/lib/custom-field-values";

export function CustomFieldValueView({
  field,
  stored,
}: {
  field: CustomFieldDef;
  stored?: StoredCustomValue | null;
}) {
  if (field.type === "WEB_LINK" && stored?.valueText) {
    const href = normalizeWebLink(stored.valueText);
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        {stored.valueText}
      </a>
    );
  }
  if (field.type === "EMAIL" && stored?.valueText) {
    return (
      <a href={`mailto:${stored.valueText}`} className="text-primary hover:underline">
        {stored.valueText}
      </a>
    );
  }
  if (field.type === "FILE") {
    const files = parseFileAttachments(stored?.valueText);
    if (!files.length) return <span>—</span>;
    return (
      <span className="flex flex-wrap justify-end gap-2">
        {files.map((file) =>
          file.url ? (
            <a key={file.name} href={file.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {file.name}
            </a>
          ) : (
            <span key={file.name}>{file.name}</span>
          ),
        )}
      </span>
    );
  }
  return <span>{formatCustomValue(field, stored)}</span>;
}

const inputClass =
  "h-11 w-full rounded-md border border-[#d8dfdb] bg-white px-3 text-sm text-[#2a3a33] outline-none placeholder:text-[#9aa6a0] focus:border-primary";

export function CustomFieldControl({
  field,
  value,
  onChange,
  rightSlot,
  disabled,
}: {
  field: CustomFieldDef;
  value: string;
  onChange: (next: string) => void;
  rightSlot?: React.ReactNode;
  disabled?: boolean;
}) {
  const limit =
    field.maxLength ??
    (field.type === "LARGE_TEXT" ? LARGE_TEXT_MAX : field.type === "WEB_LINK" ? 300 : SMALL_TEXT_MAX);
  const options = dropdownOptions(field);

  if (field.type === "CHECKBOX") {
    return (
      <label className="flex h-11 items-center gap-2 text-[14px] text-[#2a3a33]">
        <input
          type="checkbox"
          checked={value === "true"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked ? "true" : "")}
          className="accent-primary"
        />
        {value === "true" ? "Yes" : "No"}
      </label>
    );
  }

  if (field.type === "LARGE_TEXT") {
    return (
      <textarea
        value={value}
        disabled={disabled}
        maxLength={limit}
        placeholder={field.placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-[#d8dfdb] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#9aa6a0] focus:border-primary"
      />
    );
  }

  if (field.type === "DROPDOWN") {
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">{field.placeholder || "Select"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "FILE") {
    return <FileField value={value} disabled={disabled} onChange={onChange} />;
  }

  const inputType =
    field.type === "DATE"
      ? "date"
      : field.type === "WHOLE_NUMBER" || field.type === "DECIMAL"
        ? "number"
        : field.type === "EMAIL"
          ? "email"
          : field.type === "PHONE"
            ? "tel"
            : field.type === "WEB_LINK"
              ? "url"
              : "text";

  return (
    <div className="flex items-center gap-2">
      <input
        type={inputType}
        value={value}
        disabled={disabled}
        placeholder={field.placeholder || ""}
        maxLength={field.type === "DATE" || field.type === "WHOLE_NUMBER" || field.type === "DECIMAL" ? undefined : limit}
        step={field.type === "DECIMAL" ? "any" : field.type === "WHOLE_NUMBER" ? "1" : undefined}
        inputMode={field.type === "WHOLE_NUMBER" || field.type === "DECIMAL" ? "decimal" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "min-w-0 flex-1")}
      />
      {rightSlot}
    </div>
  );
}

function FileField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const files = parseFileAttachments(value);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function addFiles(list: FileList | null) {
    if (!list?.length || disabled) return;
    setError("");
    const room = 3 - files.length;
    if (room <= 0) {
      setError("Maximum of 3 files");
      return;
    }
    setPending(true);
    try {
      const next = [...files];
      for (const file of Array.from(list).slice(0, room)) {
        const form = new FormData();
        form.set("file", file);
        const res = await api<{ file: { id: string; name: string; publicUrl?: string | null }; shareUrl: string }>(
          "/api/v1/files",
          { method: "POST", body: form },
        );
        next.push({
          id: res.file.id,
          name: res.file.name,
          url: res.file.publicUrl || res.shareUrl,
        });
      }
      onChange(JSON.stringify(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload file");
    } finally {
      setPending(false);
    }
  }

  function remove(index: number) {
    const next = files.filter((_, i) => i !== index);
    onChange(next.length ? JSON.stringify(next) : "");
  }

  return (
    <div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <FileChip key={`${file.name}-${index}`} file={file} disabled={disabled} onRemove={() => remove(index)} />
        ))}
      </div>
      {files.length < 3 ? (
        <label className={cn("mt-2 inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-primary", disabled && "pointer-events-none opacity-50")}>
          <Paperclip className="h-4 w-4" />
          {pending ? "Uploading…" : "Attach file"}
          <input
            type="file"
            className="hidden"
            disabled={disabled || pending}
            accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}
      <p className="mt-1 text-[12px] text-[#8a9a93]">PDF, Word, or Excel · max 3 files</p>
      {error ? <p className="mt-1 text-[12px] text-[#e24b4b]">{error}</p> : null}
    </div>
  );
}

function FileChip({ file, disabled, onRemove }: { file: FileAttachment; disabled?: boolean; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-[#d8dfdb] bg-[#f7f8f8] px-2.5 py-1.5 text-[13px] text-[#2a3a33]">
      {file.url ? (
        <a href={file.url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
          {file.name}
        </a>
      ) : (
        <span className="truncate">{file.name}</span>
      )}
      {disabled ? null : (
        <button type="button" onClick={onRemove} className="text-[#8a9a93] hover:text-[#e24b4b]" aria-label={`Remove ${file.name}`}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}
