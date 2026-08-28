"use client";

import { useEffect, useState } from "react";
import { api, toast } from "@/lib/api";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";

export function BulkUpdateQuantityModal({
  itemIds,
  onClose,
  onSaved,
}: {
  itemIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ reasons: { id: string; name: string; kind: string }[] }>("/api/v1/settings/lookups").then((d) =>
      setReasons(d.reasons.filter((r) => r.kind === "QUANTITY")),
    );
  }, []);

  async function save() {
    setError("");
    setBusy(true);
    try {
      const change = Number(delta || 0);
      if (!change) {
        setError("Enter a quantity change");
        return;
      }
      await api("/api/v1/items/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: "edit",
          itemIds,
          quantityDelta: { delta: change, reason: reason || null, note: note || null },
        }),
        toast: false,
      });
      toast.success(`Updated quantity for ${itemIds.length} item${itemIds.length === 1 ? "" : "s"}`);
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
        Apply the same quantity change to {itemIds.length} selected item{itemIds.length === 1 ? "" : "s"}.
      </p>
      <Field label="Quantity">
        <div className="flex items-center gap-2">
          <button type="button" className="h-11 w-11 rounded-lg border border-[#d8dfdb] text-lg hover:bg-[#f4f6f5]" onClick={() => setDelta(String(Number(delta || 0) - 1))}>
            −
          </button>
          <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <button type="button" className="h-11 w-11 rounded-lg border border-[#d8dfdb] text-lg hover:bg-[#f4f6f5]" onClick={() => setDelta(String(Number(delta || 0) + 1))}>
            +
          </button>
        </div>
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
