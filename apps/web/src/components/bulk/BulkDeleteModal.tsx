"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";

export function BulkDeleteModal({
  itemCount,
  folderCount,
  onClose,
  onConfirm,
}: {
  itemCount: number;
  folderCount: number;
  onClose: () => void;
  onConfirm: (meta: { reason: string; note: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const parts = [
    itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : null,
    folderCount ? `${folderCount} folder${folderCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <Modal open title="Delete selection" onClose={onClose}>
      <p className="text-sm text-[#4a5c54]">
        Do you want to delete {parts.join(" and ")}? Selected folders, their subfolders, and items will move to Trash.
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
          Delete
        </Button>
      </div>
    </Modal>
  );
}
