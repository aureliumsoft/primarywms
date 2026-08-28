"use client";

import { useEffect, useState } from "react";
import { api, toast } from "@/lib/api";
import { Button, Field, Modal, Textarea } from "@/components/ui";
import { AddFolderModal } from "@/components/AddFolderModal";
import { SelectFolderModal } from "@/components/SelectFolderModal";
import type { TreeFolder } from "@/components/FolderPane";

export function BulkMoveModal({
  itemIds,
  folderIds,
  tree,
  rootId,
  onClose,
  onSaved,
}: {
  itemIds: string[];
  folderIds: string[];
  tree: TreeFolder[];
  rootId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dest, setDest] = useState(rootId);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<{ name: string }[]>([]);
  const [pickFolder, setPickFolder] = useState(false);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [localTree, setLocalTree] = useState(tree);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destName = localTree.find((f) => f.id === dest)?.name ?? "Choose folder";
  const blockedDest = folderIds.includes(dest);

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  useEffect(() => {
    api<{ reasons: { name: string; kind: string }[] }>("/api/v1/settings/lookups").then((d) =>
      setReasons(d.reasons.filter((r) => r.kind === "MOVE")),
    );
  }, []);

  async function save() {
    if (blockedDest) {
      setError("Choose a different destination folder");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/items/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: "move-selection",
          itemIds,
          folderIds: folderIds.filter((id) => id !== dest),
          destinationFolderId: dest,
          reason: reason || null,
          note: note || null,
        }),
        toast: false,
      });
      const parts = [
        itemIds.length ? `${itemIds.length} item${itemIds.length === 1 ? "" : "s"}` : null,
        folderIds.length ? `${folderIds.length} folder${folderIds.length === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      toast.success(`Moved ${parts.join(" and ")}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setBusy(false);
    }
  }

  const title =
    itemIds.length && folderIds.length
      ? "Move selection"
      : folderIds.length
        ? `Move ${folderIds.length} folder${folderIds.length === 1 ? "" : "s"}`
        : `Move ${itemIds.length} item${itemIds.length === 1 ? "" : "s"}`;

  return (
    <>
      <Modal open title={title} onClose={onClose}>
        <Field label="Choose destination folder">
          <button
            type="button"
            className="mb-2 block w-full rounded-lg border border-[#d8dfdb] px-3 py-2.5 text-left text-sm hover:bg-[#f4f6f5]"
            onClick={() => setPickFolder(true)}
          >
            {destName}
          </button>
          <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setAddFolderOpen(true)}>
            New Folder
          </button>
        </Field>
        <Field label="Move reason">
          <select
            className="h-11 w-full rounded-lg border border-[#d8dfdb] px-3 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
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
          <Button onClick={() => void save()} disabled={busy || blockedDest}>
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
