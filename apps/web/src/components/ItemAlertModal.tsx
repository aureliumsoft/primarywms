"use client";

import { useState } from "react";
import { api, toast } from "@/lib/api";
import { Button, Field, Modal } from "./ui";
import {
  DateAlertPanel,
  DEFAULT_DATE_ALERT,
  recipientIdsFromDraft,
  recipientKindFromDraft,
  type DateAlertDraft,
} from "./DateAlertPanel";
import type { CustomFieldDef } from "@/lib/custom-field-values";

const COMPARATORS: { value: string; label: string }[] = [
  { value: "AT_OR_BELOW_MIN", label: "At or below min level" },
  { value: "BELOW_MIN", label: "Below min level" },
  { value: "ABOVE_MIN", label: "Above min level" },
  { value: "GREATER_THAN", label: "Greater than min level" },
];

export function ItemAlertModal({
  itemIds,
  itemName,
  fields,
  onClose,
  onDone,
}: {
  itemIds: string[];
  itemName?: string;
  fields: CustomFieldDef[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const dateFields = fields.filter((field) => field.type === "DATE" && field.appliesTo !== "FOLDER");
  const [tab, setTab] = useState<"QUANTITY" | "DATE">("QUANTITY");
  const [qtyComparator, setQtyComparator] = useState("AT_OR_BELOW_MIN");
  const [fieldId, setFieldId] = useState(dateFields[0]?.id ?? "");
  const [draft, setDraft] = useState<DateAlertDraft>(DEFAULT_DATE_ALERT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const chosen = dateFields.find((field) => field.id === fieldId);

  async function save() {
    setPending(true);
    setError("");
    try {
      const payload =
        tab === "QUANTITY"
          ? {
              kind: "QUANTITY" as const,
              qtyComparator,
              recipientKind: recipientKindFromDraft(draft),
              recipientIds: recipientIdsFromDraft(draft),
            }
          : {
              kind: "DATE" as const,
              fieldId,
              dateWhen: draft.dateWhen,
              dateOffset: draft.dateOffset,
              dateOffsetUnit: draft.dateOffsetUnit,
              recipientKind: recipientKindFromDraft(draft),
              recipientIds: recipientIdsFromDraft(draft),
            };
      if (tab === "DATE" && !fieldId) throw new Error("Add a date custom field to set a date alert.");
      for (const id of itemIds) {
        await api(`/api/v1/items/${id}/alerts`, { method: "POST", body: JSON.stringify(payload), toast: false });
      }
      toast.success(itemIds.length > 1 ? "Alerts saved" : "Alert saved");
      onDone?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save alert");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open title="Set alert" onClose={onClose} wide>
      <p className="mb-4 text-sm text-[#6b7c74]">
        {itemIds.length > 1 ? `${itemIds.length} items` : itemName || "Item"}
      </p>
      <div className="mb-4 flex gap-2">
        {(["QUANTITY", "DATE"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setTab(kind)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === kind ? "bg-primary text-white" : "bg-[#eef1ef] text-[#4a5c54]"
            }`}
          >
            {kind === "QUANTITY" ? "Quantity" : "Date"}
          </button>
        ))}
      </div>
      {tab === "QUANTITY" ? (
        <Field label="Notify when quantity is">
          <select
            className="h-11 w-full rounded-lg border border-border px-3"
            value={qtyComparator}
            onChange={(e) => setQtyComparator(e.target.value)}
          >
            {COMPARATORS.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
      ) : dateFields.length ? (
        <Field label="Date field">
          <select
            className="h-11 w-full rounded-lg border border-border px-3"
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
          >
            {dateFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">Add a date custom field on items to set a date alert.</p>
      )}
      {tab === "DATE" && chosen ? (
        <DateAlertPanel fieldName={chosen.name} dateLabel={chosen.name} value={draft} onChange={setDraft} />
      ) : (
        <DateAlertPanel fieldName="Min level" dateLabel="min level" value={draft} onChange={setDraft} recipientsOnly />
      )}
      {error ? <p className="mt-3 text-sm text-[#e24b4b]">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending} onClick={() => void save()}>
          Save alert
        </Button>
      </div>
    </Modal>
  );
}
