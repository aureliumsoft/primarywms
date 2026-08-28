"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Barcode,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  GripVertical,
  Link2,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { CreateCustomFieldModal, type CreatedCustomField } from "@/components/CreateCustomFieldModal";
import { PrimaryAddButton } from "@/components/settings/ui";
import { Button, Field, Input } from "@/components/ui";

export type CustomFieldRow = {
  id: string;
  name: string;
  type: string;
  appliesTo: string;
  listVisible: boolean;
  placeholder?: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  SMALL_TEXT: "Small Text Box",
  LARGE_TEXT: "Large Text Box",
  WHOLE_NUMBER: "Round Number",
  DECIMAL: "Decimal Number",
  CHECKBOX: "Checkbox",
  DROPDOWN: "Dropdown",
  DATE: "Date",
  SCANNER: "Scanner",
  PHONE: "Phone Number",
  WEB_LINK: "Web Link",
  EMAIL: "Email",
  FILE: "File Attachment",
};

const TYPE_ICONS: Record<string, typeof Type> = {
  SMALL_TEXT: Type,
  LARGE_TEXT: Type,
  WHOLE_NUMBER: Type,
  DECIMAL: Type,
  CHECKBOX: CheckSquare,
  DROPDOWN: ChevronDown,
  DATE: Calendar,
  SCANNER: Barcode,
  PHONE: Phone,
  WEB_LINK: Link2,
  EMAIL: AtSign,
  FILE: Paperclip,
};

function appliesLabel(appliesTo: string) {
  if (appliesTo === "FOLDER") return "Folders";
  if (appliesTo === "BOTH") return "Items & Folders";
  return "Items";
}

export function CustomFieldsManager() {
  const [fields, setFields] = useState<CustomFieldRow[]>([]);
  const [filter, setFilter] = useState<"all" | "ITEM" | "FOLDER">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlaceholder, setEditPlaceholder] = useState("");
  const [editError, setEditError] = useState("");
  const [editPending, setEditPending] = useState(false);
  const [deleting, setDeleting] = useState<CustomFieldRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    api<{ fields: CustomFieldRow[] }>("/api/v1/settings/lookups").then((d) => setFields(d.fields));
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return fields;
    return fields.filter((f) => f.appliesTo === filter || f.appliesTo === "BOTH");
  }, [fields, filter]);

  function onCreated(field: CreatedCustomField) {
    setFields((prev) => [
      ...prev,
      {
        id: field.id,
        name: field.name,
        type: field.type,
        appliesTo: field.appliesTo,
        listVisible: field.listVisible ?? false,
        placeholder: field.placeholder,
      },
    ]);
  }

  async function toggleListVisible(field: CustomFieldRow, listVisible: boolean) {
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, listVisible } : f)));
    try {
      await api(`/api/v1/settings/custom-fields/${field.id}`, {
        method: "PATCH",
        body: JSON.stringify({ listVisible }),
      });
    } catch {
      setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, listVisible: field.listVisible } : f)));
    }
  }

  async function persistOrder(next: CustomFieldRow[]) {
    setFields(next);
    try {
      await api("/api/v1/settings/custom-fields", {
        method: "PATCH",
        body: JSON.stringify({ order: next.map((f) => f.id) }),
      });
    } catch {
      api<{ fields: CustomFieldRow[] }>("/api/v1/settings/lookups").then((d) => setFields(d.fields));
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = fields.findIndex((f) => f.id === dragId);
    const to = fields.findIndex((f) => f.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    void persistOrder(next);
  }

  function openEdit(field: CustomFieldRow) {
    setEditing(field);
    setEditName(field.name);
    setEditPlaceholder(field.placeholder ?? "");
    setEditError("");
  }

  async function saveEdit() {
    if (!editing) return;
    setEditPending(true);
    setEditError("");
    try {
      const res = await api<{ field: CustomFieldRow }>(`/api/v1/settings/custom-fields/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), placeholder: editPlaceholder.trim() || null }),
      });
      setFields((prev) => prev.map((f) => (f.id === editing.id ? { ...f, ...res.field } : f)));
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save field");
    } finally {
      setEditPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await api(`/api/v1/settings/custom-fields/${deleting.id}`, { method: "DELETE" });
      setFields((prev) => prev.filter((f) => f.id !== deleting.id));
      setDeleting(null);
    } catch {
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="px-8 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#2a3a33]">Custom Fields</h1>
          <p className="mt-1 text-[14px] text-[#6b7c74]">You can add unlimited custom fields.</p>
        </div>
        <PrimaryAddButton onClick={() => setCreateOpen(true)}>+ Add Custom Field</PrimaryAddButton>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[13px] text-[#4a5c54]">
        <span>Show on item page:</span>
        <select
          className="h-9 rounded-md border border-[#d8dfdb] bg-white px-2.5 text-[13px] outline-none focus:border-primary"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All Fields</option>
          <option value="ITEM">Items</option>
          <option value="FOLDER">Folders</option>
        </select>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_200px_160px_88px] items-center gap-2 border-b border-[#e6ebe8] px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a9a93]">
          <div>Name</div>
          <div className="flex items-center gap-1">
            Visible in list view
            <span title="When on, this field appears as a column in list and table views.">
              <CircleHelp className="h-3.5 w-3.5 text-[#b0beb8]" />
            </span>
          </div>
          <div>Applicable to</div>
          <div className="text-right">Actions</div>
        </div>

        {visible.map((field) => {
          const Icon = TYPE_ICONS[field.type] ?? Type;
          const textType = field.type === "SMALL_TEXT" || field.type === "LARGE_TEXT" || field.type === "WHOLE_NUMBER" || field.type === "DECIMAL";
          return (
            <div
              key={field.id}
              draggable
              onDragStart={() => setDragId(field.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(field.id)}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_200px_160px_88px] items-center gap-2 border-b border-[#eef2f0] px-1 py-3",
                dragId === field.id && "opacity-50",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[#c0cbc6]" />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6d847a] text-white">
                  {textType ? <span className="text-[13px] font-semibold">T</span> : <Icon className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#2a3a33]">{field.name}</div>
                  <div className="text-[12px] text-[#8a9a93]">{TYPE_LABELS[field.type] ?? field.type.replaceAll("_", " ")}</div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.listVisible}
                  aria-label={`Visible in list view: ${field.name}`}
                  onClick={() => void toggleListVisible(field, !field.listVisible)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition",
                    field.listVisible ? "bg-[#34c759]" : "bg-[#d5ddd8]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
                      field.listVisible && "translate-x-5",
                    )}
                  />
                </button>
              </div>
              <div className="text-[14px] text-[#4a5c54]">{appliesLabel(field.appliesTo)}</div>
              <div className="flex items-center justify-end gap-3 text-[#8a9a93]">
                <button type="button" aria-label={`Edit ${field.name}`} className="hover:text-primary" onClick={() => openEdit(field)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Delete ${field.name}`} className="hover:text-[#e24b4b]" onClick={() => setDeleting(field)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="mt-4 inline-flex items-center gap-2 text-[14px] font-medium text-primary hover:underline"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary">
            <Plus className="h-3.5 w-3.5" />
          </span>
          Add Custom Field
        </button>
      </div>

      <CreateCustomFieldModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onCreated} />

      {editing ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
            <h2 className="text-[18px] font-medium text-[#3d4f47]">Edit Custom Field</h2>
            <p className="mt-1 text-[13px] text-[#6b7c74]">
              {TYPE_LABELS[editing.type]} · {appliesLabel(editing.appliesTo)}. Type and applicable-to cannot be changed.
            </p>
            <div className="mt-5 space-y-4">
              <Field label="Name">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={190} />
              </Field>
              <Field label="Placeholder">
                <Input value={editPlaceholder} onChange={(e) => setEditPlaceholder(e.target.value)} maxLength={190} />
              </Field>
              {editError ? <p className="text-sm text-[#e24b4b]">{editError}</p> : null}
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button type="button" className="text-[13px] font-bold uppercase tracking-wide text-[#6b7c74]" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <Button type="button" disabled={!editName.trim() || editPending} onClick={() => void saveEdit()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close" onClick={() => !deletePending && setDeleting(null)} />
          <div className="relative w-full max-w-[360px] rounded-2xl bg-white px-6 pb-5 pt-6 shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
            <p className="text-[16px] leading-snug text-[#2a3a33]">
              Delete “{deleting.name}”? Existing values on items and folders will be removed.
            </p>
            <div className="mt-8 flex items-center justify-end gap-5">
              <button
                type="button"
                disabled={deletePending}
                onClick={() => setDeleting(null)}
                className="text-[13px] font-bold uppercase tracking-wide text-[#6b7c74] hover:text-[#2a3a33]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePending}
                onClick={() => void confirmDelete()}
                className="rounded-md bg-[#e24b4b] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-[#d13d3d]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
