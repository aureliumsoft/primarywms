"use client";

import { useEffect, useState } from "react";
import { api, toast } from "@/lib/api";
import { Button, Field, Input, Modal } from "./ui";
import { SelectFolderModal } from "./SelectFolderModal";
import type { TreeFolder } from "./FolderPane";
import { BulkEditDrawer } from "@/components/bulk/BulkEditDrawer";

export function CloneItemModal({
  item,
  tree,
  rootId,
  onClose,
  onDone,
}: {
  item: { id: string; name: string; folderId?: string };
  tree: TreeFolder[];
  rootId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(`${item.name} (Copy)`);
  const [count, setCount] = useState("1");
  const [newSid, setNewSid] = useState(false);
  const [folderId, setFolderId] = useState(item.folderId || rootId);
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const folderName = tree.find((f) => f.id === folderId)?.name ?? "All Items";

  async function save() {
    setBusy(true);
    try {
      await api(`/api/v1/items/${item.id}/clone`, {
        method: "POST",
        body: JSON.stringify({ name, count: Math.min(30, Math.max(1, Number(count) || 1)), newSid, folderId }),
        toast: "Item cloned",
      });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clone");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open title="Clone Item" onClose={onClose}>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="mt-3">
          <Field label="Number of clones (30 max)">
            <Input type="number" min={1} max={30} value={count} onChange={(e) => setCount(e.target.value)} />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newSid} onChange={(e) => setNewSid(e.target.checked)} />
          Generate unique ID for each clone
        </label>
        <button type="button" className="mt-3 text-sm text-primary hover:underline" onClick={() => setPick(true)}>
          Clone to Folder: {folderName}
        </button>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            Clone
          </Button>
        </div>
      </Modal>
      <SelectFolderModal
        open={pick}
        title="Clone to Folder"
        tree={tree}
        rootId={rootId}
        selectedId={folderId}
        onClose={() => setPick(false)}
        onSelect={setFolderId}
      />
    </>
  );
}

export function CloneFolderModal({
  folder,
  tree,
  rootId,
  onClose,
  onDone,
}: {
  folder: { id: string; name: string; parentId?: string | null };
  tree: TreeFolder[];
  rootId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(`${folder.name} (Copy)`);
  const [includeContents, setIncludeContents] = useState(false);
  const [parentId, setParentId] = useState(folder.parentId || rootId);
  const [pick, setPick] = useState(false);
  const folderName = tree.find((f) => f.id === parentId)?.name ?? "All Items";

  async function save() {
    try {
      await api(`/api/v1/folders/${folder.id}/clone`, {
        method: "POST",
        body: JSON.stringify({ name, includeContents, parentId }),
        toast: "Folder cloned",
      });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clone folder");
    }
  }

  return (
    <>
      <Modal open title="Clone Folder" onClose={onClose}>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeContents} onChange={(e) => setIncludeContents(e.target.checked)} />
          Include folder&apos;s content
        </label>
        <button type="button" className="mt-3 text-sm text-primary hover:underline" onClick={() => setPick(true)}>
          Clone to Folder: {folderName}
        </button>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()}>Clone</Button>
        </div>
      </Modal>
      <SelectFolderModal
        open={pick}
        title="Clone to Folder"
        tree={tree}
        rootId={rootId}
        selectedId={parentId}
        onClose={() => setPick(false)}
        onSelect={setParentId}
      />
    </>
  );
}

export function MergeItemModal({
  itemId,
  onClose,
  onDone,
}: {
  itemId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<{ id: string; name: string; sid: string; quantity: number } | null>(null);
  const [others, setOthers] = useState<{ id: string; name: string; sid: string; quantity: number }[]>([]);
  const [sid, setSid] = useState("");
  const [picked, setPicked] = useState("");
  const [confirming, setConfirming] = useState<{ mismatches: string[]; quantity: number } | null>(null);

  useEffect(() => {
    api<{ item: { id: string; name: string; sid: string; quantity: number }; others: typeof others }>(`/api/v1/items/${itemId}/merge`)
      .then((d) => {
        setCurrent(d.item);
        setOthers(d.others);
        setSid(d.item.sid);
        setPicked(d.item.id);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load merge candidates"));
  }, [itemId]);

  const choices = current ? [current, ...others] : others;
  const shown = choices.filter((row) => !q || row.name.toLowerCase().includes(q.toLowerCase()));

  async function merge() {
    try {
      const result = await api<{ mismatches: string[]; quantity: number }>(`/api/v1/items/${itemId}/merge`, {
        method: "POST",
        body: JSON.stringify({ survivorId: picked }),
        toast: false,
      });
      setConfirming(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge failed");
    }
  }

  if (confirming) {
    return (
      <>
        <button type="button" className="fixed inset-0 z-[60] bg-black/40" aria-label="Close" onClick={onDone} />
        <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl">
          <header className="border-b border-[#e6ebe8] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#1c2b25]">Items merged</h2>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-sm text-[#4a5c54]">
              The items now share one row with quantity {confirming.quantity}. This cannot be undone.
            </p>
            {confirming.mismatches.length ? (
              <p className="mt-3 text-sm">Fields that did not match: {confirming.mismatches.join(", ")}. The surviving item&apos;s details were kept.</p>
            ) : (
              <p className="mt-3 text-sm">All details matched.</p>
            )}
          </div>
          <footer className="border-t border-[#e6ebe8] px-6 py-4">
            <Button onClick={onDone}>Done</Button>
          </footer>
        </aside>
      </>
    );
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-[60] bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="border-b border-[#e6ebe8] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1c2b25]">Merge items</h2>
          <p className="mt-1 text-sm text-[#6b7c74]">Choose an item to merge into.</p>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-3 text-sm text-[#4a5c54]">
            This folder contains <strong>{others.length + 1} items with the same SID</strong> ({sid}).
          </p>
          <Input placeholder="Search Items" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="mt-3 max-h-[min(50vh,360px)] overflow-y-auto divide-y divide-[#e6ebe8] text-sm">
            {shown.map((row) => (
              <li key={row.id}>
                <label className="flex cursor-pointer items-center gap-3 px-1 py-3">
                  <input type="radio" name="survivor" checked={picked === row.id} onChange={() => setPicked(row.id)} />
                  <span className="flex-1">
                    <span className="font-medium">{row.name}</span>
                    {row.id === itemId ? <span className="ml-1 text-[#8a9a93]">(this item)</span> : null}
                    <div className="text-[12px] text-[#8a9a93]">
                      {row.sid} · qty {row.quantity}
                    </div>
                  </span>
                </label>
              </li>
            ))}
            {shown.length === 0 ? <li className="py-6 text-center text-[#8a9a93]">No matching items with this SID</li> : null}
          </ul>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#e6ebe8] px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void merge()} disabled={!picked || !others.length}>
            Continue
          </Button>
        </footer>
      </aside>
    </>
  );
}

export function BulkEditModal(props: {
  itemIds: string[];
  folderIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  return <BulkEditDrawer {...props} />;
}

export { BulkEditDrawer } from "@/components/bulk/BulkEditDrawer";
