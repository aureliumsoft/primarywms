"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { AddFolderModal } from "@/components/AddFolderModal";
import { SelectFolderModal } from "@/components/SelectFolderModal";
import { CustomFieldControl } from "@/components/CustomFieldControl";
import { TagInput } from "@/components/TagInput";
import type { TreeFolder } from "@/components/FolderPane";
import {
  toCustomValuePayloads,
  validateFieldValue,
  valuesFromStored,
  type CustomFieldDef,
  type StoredCustomValue,
} from "@/lib/custom-field-values";

export function EditFolderModal({
  folderId,
  initialName,
  initialTags,
  onClose,
  onSaved,
}: {
  folderId: string;
  initialName: string;
  initialTags?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ folder: { name: string; notes: string | null; tags: { tag: { name: string } }[]; customValues: StoredCustomValue[] } }>(
        `/api/v1/folders/${folderId}`,
      ),
      api<{ fields: CustomFieldDef[] }>("/api/v1/settings/lookups"),
    ]).then(([detail, lookups]) => {
      const folderFields = lookups.fields.filter((f) => f.appliesTo !== "ITEM");
      setFields(folderFields);
      setName(detail.folder.name);
      setNotes(detail.folder.notes ?? "");
      setTags(detail.folder.tags.map((row) => row.tag.name));
      setCustom(valuesFromStored(folderFields, detail.folder.customValues));
    });
  }, [folderId]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      for (const field of fields) validateFieldValue(field, custom[field.id] ?? "");
      await api(`/api/v1/folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          notes: notes || null,
          tags,
          customValues: toCustomValuePayloads(fields, custom),
        }),
        toast: "Folder updated",
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save folder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title="Edit folder" onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Name *">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tags">
          <TagInput value={tags} onChange={setTags} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {fields.map((field) => (
          <Field key={field.id} label={field.name}>
            <CustomFieldControl field={field} value={custom[field.id] ?? ""} onChange={(next) => setCustom((c) => ({ ...c, [field.id]: next }))} />
          </Field>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={busy || !name.trim()}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

export function MoveFolderModal({
  folderId,
  folderName,
  parentId,
  tree,
  rootId,
  onClose,
  onSaved,
}: {
  folderId: string;
  folderName: string;
  parentId: string;
  tree: TreeFolder[];
  rootId: string;
  onClose: () => void;
  onSaved: (destParentId: string) => void;
}) {
  const [dest, setDest] = useState(parentId || rootId);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<{ name: string }[]>([]);
  const [pickFolder, setPickFolder] = useState(false);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [localTree, setLocalTree] = useState(tree);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destName = localTree.find((f) => f.id === dest)?.name ?? "Choose folder";

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  useEffect(() => {
    api<{ reasons: { name: string; kind: string }[] }>("/api/v1/settings/lookups").then((d) =>
      setReasons(d.reasons.filter((r) => r.kind === "MOVE")),
    );
  }, []);

  async function save() {
    if (dest === folderId) {
      setError("Choose a different destination");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify({ parentId: dest, reason: reason || null, note: note || null }),
        toast: "Folder moved",
      });
      onSaved(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open title="Move folder" onClose={onClose}>
        <p className="mb-4 text-sm text-[#6b7c74]">{folderName}</p>
        <Field label="Choose destination folder">
          <button type="button" className="mb-2 block w-full rounded-lg border border-[#d8dfdb] px-3 py-2.5 text-left text-sm hover:bg-[#f4f6f5]" onClick={() => setPickFolder(true)}>
            {destName}
          </button>
          <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setAddFolderOpen(true)}>
            New Folder
          </button>
        </Field>
        <Field label="Move reason">
          <select className="h-11 w-full rounded-lg border border-[#d8dfdb] px-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Optional</option>
            {reasons.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Move notes">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            Move
          </Button>
        </div>
      </Modal>
      <SelectFolderModal
        open={pickFolder}
        title="Choose destination folder"
        tree={localTree}
        rootId={rootId}
        selectedId={dest}
        onClose={() => setPickFolder(false)}
        onSelect={(id) => {
          setDest(id);
          setPickFolder(false);
        }}
      />
      <AddFolderModal
        open={addFolderOpen}
        parentId={dest || rootId}
        tree={localTree}
        onClose={() => setAddFolderOpen(false)}
        onCreated={async () => {
          setAddFolderOpen(false);
          const d = await api<{ tree: TreeFolder[] }>("/api/v1/folders");
          setLocalTree(d.tree);
        }}
      />
    </>
  );
}

export function DeleteFolderModal({
  folderName,
  onClose,
  onConfirm,
}: {
  folderName: string;
  onClose: () => void;
  onConfirm: (meta: { reason: string; note: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal open title="Delete folder" onClose={onClose}>
      <p className="text-sm text-[#4a5c54]">
        Do you want to delete 1 folder? <strong>{folderName}</strong> and its subfolders and items will move to Trash.
      </p>
      <p className="mt-2 text-sm text-[#6b7c74]">You can always restore deleted items from Trash.</p>
      <div className="mt-4 space-y-3">
        <Field label="Delete Reason (optional)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label="Delete Note (optional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onConfirm({ reason, note }).finally(() => setBusy(false));
          }}
        >
          Delete 1 folder
        </Button>
      </div>
    </Modal>
  );
}

export { SetAlertModal, PermissionsModal } from "@/components/FolderCard";
