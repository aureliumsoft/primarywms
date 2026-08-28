"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api, toast } from "@/lib/api";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { SelectFolderModal } from "@/components/SelectFolderModal";
import type { TreeFolder } from "@/components/FolderPane";
import { AddFolderModal } from "@/components/AddFolderModal";
import type { ItemActionTarget } from "./types";

export function UpdateQuantityModal({
  item,
  onClose,
  onSaved,
}: {
  item: ItemActionTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [delta, setDelta] = useState("0");
  const [newQty, setNewQty] = useState(String(item.quantity));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncSource, setSyncSource] = useState<"delta" | "absolute">("delta");

  useEffect(() => {
    api<{ reasons: { id: string; name: string; kind: string }[] }>("/api/v1/settings/lookups").then((d) =>
      setReasons(d.reasons.filter((r) => r.kind === "QUANTITY")),
    );
  }, []);

  function setDeltaValue(value: string) {
    setSyncSource("delta");
    setDelta(value);
    setNewQty(String(item.quantity + Number(value || 0)));
  }

  function setAbsoluteValue(value: string) {
    setSyncSource("absolute");
    setNewQty(value);
    setDelta(String(Number(value || 0) - item.quantity));
  }

  function bumpDelta(step: number) {
    setDeltaValue(String(Number(delta || 0) + step));
  }

  async function save() {
    setError("");
    setBusy(true);
    const targetQty = syncSource === "absolute" ? Number(newQty) : item.quantity + Number(delta || 0);
    if (Number.isNaN(targetQty) || targetQty < 0) {
      setError("Enter a valid quantity");
      setBusy(false);
      return;
    }
    try {
      await api(`/api/v1/items/${item.id}/quantity`, {
        method: "POST",
        body: JSON.stringify({ newQuantity: targetQty, reason: reason || null, note: note || null, mode: "SET" }),
        toast: "Quantity updated",
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title="Update Quantity" onClose={onClose}>
      <p className="mb-4 text-sm text-[#6b7c74]">
        {item.name} · current {item.quantity} {item.unit?.abbreviation ?? "units"}
      </p>
      <Field label="Quantity">
        <div className="flex items-center gap-2">
          <button type="button" className="h-11 w-11 rounded-lg border border-[#d8dfdb] text-lg hover:bg-[#f4f6f5]" onClick={() => bumpDelta(-1)}>
            −
          </button>
          <Input type="number" value={delta} onChange={(e) => setDeltaValue(e.target.value)} />
          <button type="button" className="h-11 w-11 rounded-lg border border-[#d8dfdb] text-lg hover:bg-[#f4f6f5]" onClick={() => bumpDelta(1)}>
            +
          </button>
        </div>
      </Field>
      <Field label="New Quantity">
        <Input type="number" min={0} step="any" value={newQty} onChange={(e) => setAbsoluteValue(e.target.value)} />
      </Field>
      <Field label="Reason">
        <select className="h-11 w-full rounded-lg border border-[#d8dfdb] px-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Optional</option>
          {reasons.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Transaction Note (optional)">
        <Textarea placeholder="Transaction Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={busy}>
          Update
        </Button>
      </div>
    </Modal>
  );
}

export function MoveItemModal({
  item,
  tree,
  rootId,
  returnToOriginEnabled,
  onClose,
  onSaved,
}: {
  item: ItemActionTarget;
  tree: TreeFolder[];
  rootId: string;
  returnToOriginEnabled: boolean;
  onClose: () => void;
  onSaved: (folderId: string) => void;
}) {
  const [qty, setQty] = useState(String(item.quantity));
  const [dest, setDest] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<{ name: string; kind: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quick, setQuick] = useState<{ folderId: string; name: string }[]>([]);
  const [saveQuick, setSaveQuick] = useState(false);
  const [pickFolder, setPickFolder] = useState(false);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [addFolderParent, setAddFolderParent] = useState(rootId);
  const [localTree, setLocalTree] = useState(tree);

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);
  const origin = localTree.find((f) => f.id === item.lastFromFolderId);
  const destName = localTree.find((f) => f.id === dest)?.name ?? "Choose folder";

  useEffect(() => {
    api<{ reasons: { name: string; kind: string }[] }>("/api/v1/settings/lookups").then((d) =>
      setReasons(d.reasons.filter((r) => r.kind === "MOVE")),
    );
    try {
      const stored = JSON.parse(localStorage.getItem("pwms.quickMoves") || "[]") as { folderId: string; name: string }[];
      setQuick(Array.isArray(stored) ? stored.slice(0, 8) : []);
    } catch {
      setQuick([]);
    }
  }, []);

  async function save() {
    setError("");
    setBusy(true);
    try {
      const result = await api<{ destinationFolderId: string }>(`/api/v1/items/${item.id}/move`, {
        method: "POST",
        body: JSON.stringify({
          destinationFolderId: dest,
          quantity: Number(qty),
          reason: reason || null,
          note: note || null,
        }),
        toast: "Item moved",
      });
      if (saveQuick && dest) {
        const name = localTree.find((f) => f.id === dest)?.name ?? "Folder";
        const next = [{ folderId: dest, name }, ...quick.filter((row) => row.folderId !== dest)].slice(0, 8);
        localStorage.setItem("pwms.quickMoves", JSON.stringify(next));
      }
      onSaved(result.destinationFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open title="Move Item" onClose={onClose}>
        <Field label="Quantity to move">
          <Input type="number" min={0.0001} max={item.quantity} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <button className="mb-3 text-sm font-medium text-primary hover:underline" onClick={() => setQty(String(item.quantity))} type="button">
          Move all
        </button>
        {returnToOriginEnabled && item.lastFromFolderId ? (
          <button
            type="button"
            className="mb-3 block text-sm font-medium text-primary hover:underline"
            onClick={() => setDest(item.lastFromFolderId!)}
          >
            Return to Origin{origin ? `: ${origin.name}` : ""}
          </button>
        ) : null}
        {quick.length ? (
          <div className="mb-3">
            <p className="mb-1 text-xs font-semibold uppercase text-[#8a9a93]">Quick Move</p>
            <div className="flex flex-wrap gap-2">
              {quick.map((row) => (
                <button
                  key={row.folderId}
                  type="button"
                  onClick={() => setDest(row.folderId)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    dest === row.folderId ? "border-primary bg-primary-soft text-primary" : "border-[#d8dfdb] text-[#4a5c54]"
                  }`}
                >
                  {row.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Field label="Choose destination folder">
          <button type="button" className="mb-2 block w-full rounded-lg border border-[#d8dfdb] px-3 py-2.5 text-left text-sm hover:bg-[#f4f6f5]" onClick={() => setPickFolder(true)}>
            {destName}
          </button>
          <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => { setAddFolderParent(dest || rootId); setAddFolderOpen(true); }}>
            New Folder
          </button>
        </Field>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={saveQuick} onChange={(e) => setSaveQuick(e.target.checked)} />
          Save destination as Quick Move
        </label>
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
          <Button onClick={() => void save()} disabled={!dest || busy}>
            Move
          </Button>
        </div>
      </Modal>
      <SelectFolderModal
        open={pickFolder}
        title="Choose destination folder"
        tree={localTree}
        rootId={rootId}
        selectedId={dest || rootId}
        onClose={() => setPickFolder(false)}
        onSelect={(id) => {
          setDest(id);
          setPickFolder(false);
        }}
      />
      <AddFolderModal
        open={addFolderOpen}
        parentId={addFolderParent}
        tree={localTree}
        onClose={() => setAddFolderOpen(false)}
        onCreated={async () => {
          setAddFolderOpen(false);
          const d = await api<{ tree: TreeFolder[] }>("/api/v1/folders");
          setLocalTree(d.tree);
          const created = [...d.tree].sort((a, b) => a.name.localeCompare(b.name)).find((f) => f.parentId === addFolderParent && !tree.some((row) => row.id === f.id))
            ?? d.tree.filter((f) => f.parentId === addFolderParent).slice(-1)[0];
          if (created) setDest(created.id);
        }}
      />
    </>
  );
}

type DraftDoc = { id: string; number: string; updatedAt: string };

export function AddToModal({
  item,
  onClose,
  onDone,
}: {
  item: ItemActionTarget;
  onClose: () => void;
  onDone: (href: string) => void;
}) {
  const [step, setStep] = useState<"choose" | "quantity" | "pick">("choose");
  const [kind, setKind] = useState<"pick-list" | "purchase-order" | "stock-count" | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [drafts, setDrafts] = useState<{ pickLists: DraftDoc[]; purchaseOrders: DraftDoc[]; stockCounts: DraftDoc[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState("");

  useEffect(() => {
    api<{ pickLists: DraftDoc[]; purchaseOrders: DraftDoc[]; stockCounts: DraftDoc[] }>("/api/v1/workflows/drafts")
      .then(setDrafts)
      .catch(() => setDrafts({ pickLists: [], purchaseOrders: [], stockCounts: [] }));
  }, []);

  const list = kind === "pick-list" ? drafts?.pickLists : kind === "purchase-order" ? drafts?.purchaseOrders : drafts?.stockCounts;

  async function submit(documentId?: string) {
    if (!kind) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ href: string }>(`/api/v1/items/${item.id}/add-to`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          documentId,
          quantity: kind === "stock-count" ? undefined : Number(quantity) || 1,
        }),
        toast: "Added to workflow",
      });
      onDone(result.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  if (step === "choose") {
    return (
      <Modal open title="Add to…" onClose={onClose}>
        <p className="mb-4 text-sm text-[#6b7c74]">Add {item.name} to a workflow document.</p>
        <div className="space-y-2">
          {(
            [
              ["pick-list", "Add to Pick List"],
              ["purchase-order", "Add to Purchase Order"],
              ["stock-count", "Add to Stock Count"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-[#e6ebe8] px-4 py-3 text-left text-sm font-medium hover:border-primary hover:bg-primary-soft/30"
              onClick={() => {
                setKind(id);
                setStep(id === "stock-count" ? "pick" : "quantity");
              }}
            >
              {label}
              {id === "stock-count" ? <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">New</span> : null}
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  if (step === "quantity") {
    return (
      <Modal open title="Quantity to Add" onClose={onClose}>
        <p className="mb-4 text-sm text-[#6b7c74]">{item.name}</p>
        <Field label="Quantity to Add">
          <Input type="number" min={0.0001} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <span className="mt-1 block text-[12px] text-[#8a9a93]">{item.unit?.abbreviation ?? "units"}</span>
        </Field>
        <div className="mt-5 flex justify-between gap-2">
          <Button variant="secondary" onClick={() => setStep("choose")}>
            Back
          </Button>
          <Button onClick={() => { setPicked(""); setStep("pick"); }}>Next</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title="Choose list" onClose={onClose}>
      <p className="mb-4 text-sm text-[#6b7c74]">Select an existing draft or create a new one.</p>
      <ul className="max-h-56 divide-y divide-[#e6ebe8] overflow-y-auto rounded-lg border border-[#e6ebe8] text-sm">
        {(list ?? []).map((row) => (
          <li key={row.id}>
            <label className="flex cursor-pointer items-center justify-between px-3 py-2.5 hover:bg-[#f4f6f5]">
              <span className="flex items-center gap-3">
                <input type="radio" name="draft" checked={picked === row.id} onChange={() => setPicked(row.id)} />
                <span className="font-medium">{row.number}</span>
              </span>
              <span className="text-[12px] text-[#8a9a93]">{format(new Date(row.updatedAt), "d MMM yyyy")}</span>
            </label>
          </li>
        ))}
        {!list?.length ? <li className="px-3 py-6 text-center text-[#8a9a93]">No draft documents yet</li> : null}
      </ul>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex justify-between gap-2">
        <Button variant="secondary" onClick={() => setStep(kind === "stock-count" ? "choose" : "quantity")}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void submit()} disabled={busy}>
            Create new
          </Button>
          <Button onClick={() => void submit(picked)} disabled={!picked || busy}>
            Add
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type OrderRow = {
  purchaseOrderId: string;
  number: string;
  status: string;
  vendorName: string | null;
  quantity: number;
  quantityReceived: number;
  dateExpected: string | null;
  updatedAt: string;
};

export function RestockModal({
  item,
  onClose,
  onDone,
}: {
  item: ItemActionTarget;
  onClose: () => void;
  onDone: (href: string) => void;
}) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [orders, setOrders] = useState<{ open: OrderRow[]; closed: OrderRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPo, setSelectedPo] = useState("");

  useEffect(() => {
    api<{ open: OrderRow[]; closed: OrderRow[] }>(`/api/v1/items/${item.id}/orders`)
      .then(setOrders)
      .catch(() => setOrders({ open: [], closed: [] }));
  }, [item.id]);

  async function createPo() {
    setBusy(true);
    try {
      const result = await api<{ href: string }>(`/api/v1/items/${item.id}/add-to`, {
        method: "POST",
        body: JSON.stringify({ kind: "purchase-order", quantity: 1 }),
        toast: "Purchase order created",
      });
      onDone(result.href);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create purchase order");
    } finally {
      setBusy(false);
    }
  }

  const rows = tab === "open" ? orders?.open ?? [] : orders?.closed ?? [];

  return (
    <Modal open title="Restock" onClose={onClose} wide>
      <p className="mb-4 text-sm text-[#6b7c74]">How would you like to restock {item.name}?</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => void createPo()} disabled={busy}>
          Use a Purchase Order
        </Button>
        {item.productLink ? (
          <a href={item.productLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-lg border border-[#d8dfdb] px-4 text-sm font-medium text-primary hover:bg-[#f4f6f5]">
            Link
          </a>
        ) : null}
      </div>
      <div className="mb-3 flex gap-4 border-b border-[#e6ebe8]">
        {(["open", "closed"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`border-b-2 px-1 pb-2 text-sm font-semibold capitalize ${tab === id ? "border-primary text-primary" : "border-transparent text-[#8a9a93]"}`}
          >
            {id}
          </button>
        ))}
      </div>
      {rows.length ? (
        <ul className="divide-y divide-[#e6ebe8] text-sm">
          {rows.map((row) => (
            <li key={row.purchaseOrderId}>
              <label className="flex cursor-pointer items-center justify-between py-2.5">
                <span className="flex items-center gap-3">
                  {tab === "open" ? (
                    <input type="radio" name="restock-po" checked={selectedPo === row.purchaseOrderId} onChange={() => setSelectedPo(row.purchaseOrderId)} />
                  ) : null}
                  <span>
                    <span className="font-medium text-[#2a3a33]">{row.number}</span>
                    <div className="text-[12px] text-[#8a9a93]">
                      {row.vendorName ?? "No vendor"} · qty {row.quantity}
                      {row.quantityReceived ? ` · received ${row.quantityReceived}` : ""}
                    </div>
                  </span>
                </span>
                <span className="text-[12px] uppercase text-[#8a9a93]">{row.status.replaceAll("_", " ")}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-[#8a9a93]">No {tab} orders for this item.</p>
      )}
      {tab === "open" && selectedPo ? (
        <div className="mt-4 flex justify-end">
          <Button onClick={() => onDone(`/purchase-orders/${selectedPo}`)}>Continue</Button>
        </div>
      ) : null}
    </Modal>
  );
}

export function DeleteItemModal({
  itemName,
  onClose,
  onConfirm,
}: {
  itemName: string;
  onClose: () => void;
  onConfirm: (meta: { reason: string; note: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal open title="Delete Item" onClose={onClose}>
      <p className="text-sm text-[#4a5c54]">
        Move <strong>{itemName}</strong> to Trash? You can restore deleted items from Trash.
      </p>
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
          Delete
        </Button>
      </div>
    </Modal>
  );
}