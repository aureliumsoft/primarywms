"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Layers,
  MoreVertical,
  RotateCcw,
} from "lucide-react";
import { formatMoney } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { displayRoleName } from "@/lib/roles";
import type { CustomFieldDef, StoredCustomValue } from "@/lib/custom-field-values";
import { CatalogListMeta } from "./CatalogListMeta";
import {
  DateAlertPanel,
  DEFAULT_DATE_ALERT,
  recipientIdsFromDraft,
  recipientKindFromDraft,
  type DateAlertDraft,
} from "./DateAlertPanel";
import type { TreeFolder } from "./FolderPane";
import { FolderGlyph, isFolderPopulated } from "./FolderGlyph";
import { TagInput } from "./TagInput";
import { Button, Field, Input, Modal } from "./ui";
import { FolderCardMenu, type FolderMenuAction } from "@/components/folders/FolderCardMenu";
import { DeleteFolderModal } from "@/components/folders/FolderModals";

export type FolderCardData = {
  id: string;
  name: string;
  parentId?: string | null;
  sid?: string;
  kind?: "ITEM" | "JOB";
  jobStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
  jobId?: string | null;
  notes?: string | null;
  updatedAt: string;
  photos: { id: string; publicUrl?: string | null }[];
  tags?: { tag: { name: string } }[];
  customValues?: StoredCustomValue[];
  barcodes?: { id: string; value: string; symbology: string; slot: number }[];
  _count: { items: number; children: number };
  value?: number;
};

type Dialog = null;

function folderCardAction(
  action: FolderMenuAction,
  handlers: {
    onCreateLabel: () => void;
    onExport?: () => void;
    onClone?: () => void;
    onDelete: () => void;
  },
) {
  if (action === "create-label") handlers.onCreateLabel();
  else if (action === "export") handlers.onExport?.();
  else if (action === "clone") handlers.onClone?.();
  else if (action === "delete") handlers.onDelete();
}

type FolderGrant = "VIEW" | "EDIT";

type PermissionPerson = {
  id: string;
  firstName: string;
  lastName: string;
  role: { kind: string; name: string };
  grant: FolderGrant | null;
  locked: boolean;
};

export function FolderTile({
  folder,
  list,
  menu,
  setMenu,
  selected,
  onToggleSelect,
  showChecks,
  fields,
  listFields,
  hideSid,
  tree,
  rootId,
  onCreateLabel,
  onChanged,
  onExport,
  onClone,
  onDelete,
}: {
  folder: FolderCardData;
  list?: boolean;
  menu: string | null;
  setMenu: (id: string | null) => void;
  selected: boolean;
  onToggleSelect: () => void;
  showChecks?: boolean;
  fields: CustomFieldDef[];
  listFields?: CustomFieldDef[];
  hideSid?: boolean;
  tree: TreeFolder[];
  rootId: string;
  onCreateLabel: () => void;
  onChanged: () => void;
  onExport?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const open = menu === folder.id;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, setMenu]);

  function handleDelete() {
    if (onDelete) {
      onDelete();
      return;
    }
    setDeleteOpen(true);
  }

  async function confirmDelete(meta: { reason: string; note: string }) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/folders/${folder.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: meta.reason || null, note: meta.note || null }),
        toast: "Folder moved to Trash",
      });
      setDeleteOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete folder");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function cloneFolder() {
    setMenu(null);
    if (onClone) {
      onClone();
      return;
    }
    setCloneFolderInternal();
  }

  async function setCloneFolderInternal() {
    try {
      await api(`/api/v1/folders/${folder.id}/clone`, { method: "POST" });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clone folder");
    }
  }

  async function exportFolder() {
    setMenu(null);
    if (onExport) {
      onExport();
      return;
    }
    try {
      const file = await api<{ csv: string; filename: string }>(`/api/v1/folders/${folder.id}/export`);
      const blob = new Blob([file.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Folder exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export folder");
    }
  }

  async function setJobLifecycle(action: "complete" | "reopen") {
    if (!folder.jobId) {
      toast.info("Open this job from Workflows → Jobs to manage its status.");
      setMenu(null);
      return;
    }
    setMenu(null);
    try {
      if (action === "complete") {
        await api(`/api/v1/jobs/${folder.jobId}/complete`, {
          method: "POST",
          body: JSON.stringify({ leftover: "leave" }),
        });
      } else {
        await api(`/api/v1/jobs/${folder.jobId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update job");
    }
  }

  const overlayOn = open || selected;
  const checksOn = overlayOn || Boolean(showChecks);
  const sid = folder.sid || folder.barcodes?.find((row) => row.slot === 1)?.value;
  const isJob = folder.kind === "JOB";
  const completed = isJob && folder.jobStatus === "COMPLETED";
  const folderMenu = (
    <>
      <button
        type="button"
        title="More"
        aria-label="More folder actions"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenu(open ? null : folder.id);
        }}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b7c74] hover:bg-[#f4f6f5]",
          overlayOn ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          open && "bg-[#f4f6f5]",
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <FolderCardMenu
          folderId={folder.id}
          variant="card"
          className="absolute right-0 top-9 z-30 w-[220px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-[0_8px_24px_rgb(16_24_20/0.14)]"
          onClose={() => setMenu(null)}
          onAction={(action) =>
            folderCardAction(action, {
              onCreateLabel: () => {
                setMenu(null);
                onCreateLabel();
              },
              onExport: () => void exportFolder(),
              onClone: () => void cloneFolder(),
              onDelete: () => {
                setMenu(null);
                handleDelete();
              },
            })
          }
        />
      ) : null}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "group relative rounded-xl bg-white shadow-sm ring-1 ring-border hover:ring-primary",
        !list && "flex h-[194px] w-[230px] flex-col",
        !list && !open && "overflow-hidden",
        selected && "ring-primary",
        (open || selected) && "z-30",
        list && "flex min-h-[132px] items-stretch",
        list && !open && "overflow-hidden",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          list ? "w-[132px] self-stretch" : "h-[138px] w-full",
          !list && "rounded-t-xl",
          list && "rounded-l-xl",
        )}
      >
        <Link href={`/folder/${folder.id}/content`} className="absolute inset-0 block bg-[#eceeed]">
          <FolderCover
            photos={folder.photos}
            light={list}
            populated={isFolderPopulated(folder)}
            kind={folder.kind === "JOB" ? "JOB" : "ITEM"}
            selected={selected}
          />
        </Link>
        <button
          type="button"
          aria-label={selected ? "Deselect folder" : "Select folder"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelect();
          }}
          className={cn(
            "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-[3px] border-2 border-white shadow-sm transition",
            selected ? "bg-primary" : "bg-transparent",
            checksOn ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {selected ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
        </button>
      </div>

      {list ? (
        <>
          <Link href={`/folder/${folder.id}/content`} className="flex min-w-0 flex-1 flex-col justify-center px-6 py-4">
            {!hideSid && sid ? <div className="text-[13px] tracking-wide text-[#b7c2bd]">{sid}</div> : null}
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[20px] font-semibold leading-tight text-[#2a3a33]">{folder.name}</div>
              {isJob ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    completed ? "bg-[#e8ecea] text-[#8a9a93]" : "bg-primary-soft text-primary",
                  )}
                >
                  {completed ? "Done" : "Job"}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[13px] text-[#8a9a93]">
              {folder._count.children > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <FolderGlyph populated size="sm" />
                  {folder._count.children}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {folder._count.items}
              </span>
              <span>{formatMoney(folder.value ?? 0)}</span>
            </div>
          </Link>
          <div className="relative flex w-[min(42%,420px)] min-w-[220px] shrink-0 items-start justify-between gap-3 border-l border-dotted border-[#c5d0cb] px-5 py-4">
            <CatalogListMeta
              fields={listFields ?? []}
              stored={folder.customValues}
              updatedAt={folder.updatedAt}
            />
            <div className="relative shrink-0">{folderMenu}</div>
          </div>
        </>
      ) : (
        <div className="relative h-[56px] min-w-0 shrink-0 px-3 pt-2">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/folder/${folder.id}/content`} className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="truncate text-[14px] font-semibold leading-snug text-[#3d4f47]">{folder.name}</div>
                {isJob ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      completed ? "bg-[#e8ecea] text-[#8a9a93]" : "bg-primary-soft text-primary",
                    )}
                  >
                    {completed ? "Done" : "Job"}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#8a9a93]">
                {folder._count.children > 0 ? (
                  <>
                    <FolderGlyph populated size="sm" />
                    <span>{folder._count.children}</span>
                  </>
                ) : null}
                <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>{folder._count.items}</span>
                <span className="text-[#c5d0cb]">|</span>
                <span>{formatMoney(folder.value ?? 0)}</span>
              </div>
            </Link>
            <div className="relative shrink-0">{folderMenu}</div>
          </div>
        </div>
      )}

      {deleteOpen ? (
        <DeleteFolderModal
          folderName={folder.name}
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
      {error && deleteOpen ? <p className="sr-only">{error}</p> : null}
    </div>
  );
}

export function FolderMenuItem({
  icon,
  children,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted",
        danger ? "text-[#e24b4b]" : "text-[#3d4f47]",
      )}
    >
      <span className={cn("shrink-0", danger ? "text-[#e24b4b]" : "text-[#8a9a93]")}>{icon}</span>
      {children}
    </button>
  );
}

function FolderCover({
  photos,
  light,
  populated,
  kind,
  selected,
}: {
  photos: { id: string; publicUrl?: string | null }[];
  light?: boolean;
  populated?: boolean;
  kind?: "ITEM" | "JOB";
  selected?: boolean;
}) {
  const shots = photos.slice(0, 3);
  const src = (photo: { id: string; publicUrl?: string | null }) => photo.publicUrl || `/api/v1/photos/${photo.id}`;

  if (shots.length === 0) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center", light ? "bg-[#eceeed]" : "bg-[#a3a3a3]")}>
        <FolderGlyph
          populated={populated}
          selected={selected}
          kind={kind}
          size="xl"
          tone={light ? "muted" : "onDark"}
        />
      </div>
    );
  }

  if (shots.length === 1) {
    return <img src={src(shots[0])} alt="" className="h-full w-full object-cover" />;
  }

  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-[2px] bg-white">
      <div className="col-span-2 row-span-2 min-h-0 min-w-0 overflow-hidden">
        <img src={src(shots[0])} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden">
        <img src={src(shots[1])} alt="" className="h-full w-full object-cover" />
      </div>
      {shots[2] ? (
        <div className="min-h-0 min-w-0 overflow-hidden">
          <img src={src(shots[2])} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="bg-[#d4d4d4]" />
      )}
    </div>
  );
}

export function EditFolderModal({
  name,
  tags: initialTags,
  pending,
  error,
  onClose,
  onSave,
}: {
  name: string;
  tags?: string[];
  pending: boolean;
  error: string;
  onClose: () => void;
  onSave: (name: string, tags?: string[]) => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const [tags, setTags] = useState(initialTags ?? []);
  const showTags = initialTags !== undefined;
  return (
    <Modal open title="Edit folder" onClose={onClose}>
      <Field label="Name">
        <Input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
      </Field>
      {showTags ? (
        <div className="mt-3">
          <Field label="Tags">
            <TagInput value={tags} onChange={setTags} />
          </Field>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-[#e24b4b]">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending || !value.trim()} onClick={() => void onSave(value.trim(), showTags ? tags : undefined)}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

export function SetAlertModal({
  folderId,
  folderName,
  fields,
  onClose,
}: {
  folderId: string;
  folderName: string;
  fields: CustomFieldDef[];
  onClose: () => void;
}) {
  const dateFields = fields.filter((field) => field.type === "DATE" && field.appliesTo !== "ITEM");
  const [fieldId, setFieldId] = useState(dateFields[0]?.id ?? "");
  const [draft, setDraft] = useState<DateAlertDraft>(DEFAULT_DATE_ALERT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const chosen = dateFields.find((field) => field.id === fieldId);

  async function save() {
    if (!fieldId) {
      setError("Add a date custom field to set a folder alert.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await api(`/api/v1/folders/${folderId}/alerts`, {
        method: "POST",
        body: JSON.stringify({
          fieldId,
          dateWhen: draft.dateWhen,
          dateOffset: draft.dateOffset,
          dateOffsetUnit: draft.dateOffsetUnit,
          recipientKind: recipientKindFromDraft(draft),
          recipientIds: recipientIdsFromDraft(draft),
        }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save alert");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open title="Set alert" onClose={onClose} wide>
      <p className="mb-4 text-sm text-muted-foreground">{folderName}</p>
      {dateFields.length ? (
        <>
          <Field label="Date field">
            <select
              className="h-11 w-full rounded-lg border border-border px-3"
              value={fieldId}
              onChange={(event) => setFieldId(event.target.value)}
            >
              {dateFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </Field>
          {chosen ? (
            <div className="mt-4">
              <DateAlertPanel fieldName={chosen.name} dateLabel={chosen.name} value={draft} onChange={setDraft} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Add a date custom field on folders to set an alert.</p>
      )}
      {error ? <p className="mt-3 text-sm text-[#e24b4b]">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending || !dateFields.length} onClick={() => void save()}>
          Save alert
        </Button>
      </div>
    </Modal>
  );
}

export function HistoryModal({
  folderId,
  folderName,
  onClose,
}: {
  folderId: string;
  folderName: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<
    { id: string; type: string; createdAt: string; user?: { firstName: string; lastName: string } | null }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ history: typeof rows }>(`/api/v1/folders/${folderId}/history`)
      .then((data) => setRows(data.history))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load history"));
  }, [folderId]);

  return (
    <Modal open title="History" onClose={onClose} wide>
      <p className="mb-4 text-sm text-muted-foreground">{folderName}</p>
      {error ? <p className="text-sm text-[#e24b4b]">{error}</p> : null}
      {!error && !rows.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
      <ul className="max-h-[360px] space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{historyLabel(row.type)}</div>
              <div className="text-xs text-muted-foreground">
                {row.user ? `${row.user.firstName} ${row.user.lastName}` : "System"}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

function historyLabel(type: string) {
  switch (type) {
    case "FOLDER_CREATED":
      return "Created";
    case "FOLDER_EDITED":
      return "Edited";
    case "FOLDER_DELETED":
      return "Deleted";
    case "FOLDER_RESTORED":
      return "Restored";
    case "CLONE":
      return "Cloned";
    case "MOVE":
      return "Moved";
    default:
      return type.replaceAll("_", " ").toLowerCase();
  }
}

export function PermissionsModal({
  folderId,
  folderName,
  onClose,
}: {
  folderId: string;
  folderName: string;
  onClose: () => void;
}) {
  const [access, setAccess] = useState<PermissionPerson[]>([]);
  const [addable, setAddable] = useState<PermissionPerson[]>([]);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ access: PermissionPerson[]; addable: PermissionPerson[] }>(
      `/api/v1/folders/${folderId}/permissions`,
    );
    setAccess(data.access);
    setAddable(data.addable);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load permissions"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  const filtered = addable.filter((person) => {
    const name = `${person.firstName} ${person.lastName}`.toLowerCase();
    return name.includes(query.trim().toLowerCase());
  });

  function addPerson(person: PermissionPerson) {
    setAddable((rows) => rows.filter((row) => row.id !== person.id));
    setAccess((rows) => [...rows, { ...person, grant: "VIEW" }]);
  }

  function setGrant(userId: string, grant: FolderGrant) {
    setAccess((rows) => rows.map((row) => (row.id === userId && !row.locked ? { ...row, grant } : row)));
  }

  async function save() {
    setPending(true);
    setError("");
    try {
      const data = await api<{ access: PermissionPerson[]; addable: PermissionPerson[] }>(
        `/api/v1/folders/${folderId}/permissions`,
        {
          method: "PUT",
          body: JSON.stringify({
            grants: access.filter((row) => !row.locked && row.grant).map((row) => ({ userId: row.id, grant: row.grant })),
          }),
        },
      );
      setAccess(data.access);
      setAddable(data.addable);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save permissions");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open title="Folder Permissions" onClose={onClose} wide>
      <p className="mb-4 text-sm text-muted-foreground">{folderName}</p>
      <h3 className="mb-2 text-sm font-semibold">Add users to this folder</h3>
      <Input placeholder="Search people" value={query} onChange={(event) => setQuery(event.target.value)} />
      <ul className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-border">
        {filtered.length ? (
          filtered.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0">
              <span className="text-sm">
                {person.firstName} {person.lastName}
                <span className="ml-2 text-xs text-muted-foreground">{memberRoleName(person.role)}</span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => addPerson(person)}>
                Add
              </Button>
            </li>
          ))
        ) : (
          <li className="px-3 py-2 text-sm text-muted-foreground">No people to add</li>
        )}
      </ul>
      <h3 className="mb-2 mt-5 text-sm font-semibold">Users with access</h3>
      <ul className="max-h-56 space-y-2 overflow-y-auto">
        {access.map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">
                {person.firstName} {person.lastName}
              </div>
              <div className="text-xs text-muted-foreground">{memberRoleName(person.role)}</div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  disabled={person.locked}
                  checked={person.grant === "VIEW"}
                  onChange={() => setGrant(person.id, "VIEW")}
                />
                View
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  disabled={person.locked}
                  checked={person.grant === "EDIT"}
                  onChange={() => setGrant(person.id, "EDIT")}
                />
                View and Edit
              </label>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-[#e24b4b]">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

function memberRoleName(role: { kind: string; name: string }) {
  switch (role.kind) {
    case "SUPER_ADMIN":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "TEAM_MEMBER":
      return "Team Member";
    default:
      return displayRoleName(role);
  }
}
