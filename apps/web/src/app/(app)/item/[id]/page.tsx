"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { formatMoney } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { AddQrBarcodeModal } from "@/components/AddQrBarcodeModal";
import { BarcodeMark } from "@/components/BarcodeMark";
import { CreateLabelWizard, type LabelTarget } from "@/components/CreateLabelWizard";
import { reprintSavedLabel } from "@/lib/reprint-label";
import type { SavedLabelConfig } from "@/lib/saved-label-config";
import { CloneItemModal, MergeItemModal } from "@/components/InventoryActions";
import { ExportWizard } from "@/components/ExportWizard";
import { ItemAlertModal } from "@/components/ItemAlertModal";
import type { TreeFolder } from "@/components/FolderPane";
import {
  formatCustomValue,
  valuesFromStored,
  type CustomFieldDef,
  type StoredCustomValue,
} from "@/lib/custom-field-values";
import { CustomFieldValueView } from "@/components/CustomFieldControl";
import { ItemDetailSkeleton } from "@/components/skeletons";
import { ItemHeaderActions, type ItemMenuAction } from "@/components/items/ItemActionsMenu";
import {
  AddToModal,
  DeleteItemModal,
  MoveItemModal,
  RestockModal,
  UpdateQuantityModal,
} from "@/components/items/ItemModals";
import {
  ItemFieldRow,
  ItemHeader,
  ItemPageShell,
  ItemSection,
  ItemStatGrid,
  ItemTabBar,
} from "@/components/items/ui";
import type { ItemActionTarget } from "@/components/items/types";

type ItemPayload = {
  item: {
    id: string;
    name: string;
    sid: string;
    quantity: number;
    minQuantity: number | null;
    price: number | null;
    totalValue: number;
    notes: string | null;
    updatedAt: string;
    productLink: string | null;
    lastFromFolderId?: string | null;
    folder: { id: string; name: string };
    unit: { name: string; abbreviation: string };
    photos: { id: string; publicUrl?: string | null }[];
    barcodes: { id: string; value: string; symbology: string; slot: number }[];
    tags: { tag: { id: string; name: string } }[];
    customValues: (StoredCustomValue & { field: { name: string; type: string } })[];
  };
};

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

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ItemPayload | null>(null);
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [orders, setOrders] = useState<{ open: OrderRow[]; closed: OrderRow[] }>({ open: [], closed: [] });
  const [orderTab, setOrderTab] = useState("open");
  const [loadError, setLoadError] = useState("");
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [returnToOriginEnabled, setReturnToOriginEnabled] = useState(false);
  const [savedLabels, setSavedLabels] = useState<
    { id: string; name: string; codeValue: string; kind: string; sizeId: string; config: SavedLabelConfig; createdAt: string }[]
  >([]);
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [addToOpen, setAddToOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const reload = useCallback(async () => {
    const [d, lookups, orderData] = await Promise.all([
      api<ItemPayload>(`/api/v1/items/${id}`),
      api<{ fields: CustomFieldDef[] }>("/api/v1/settings/lookups"),
      api<{ open: OrderRow[]; closed: OrderRow[] }>(`/api/v1/items/${id}/orders`).catch(() => ({ open: [], closed: [] })),
    ]);
    setData(d);
    setFields(lookups.fields.filter((field) => field.appliesTo !== "FOLDER"));
    setOrders(orderData);
    setLoadError("");
  }, [id]);

  useEffect(() => {
    reload().catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load item"));
    api<{ tree: TreeFolder[]; rootId?: string }>("/api/v1/folders").then((d) => {
      setTree(d.tree);
      setRootId(d.rootId || d.tree.find((f) => !f.parentId)?.id || "");
    });
    api<{ organization: { returnToOriginEnabled: boolean } }>("/api/v1/auth/me")
      .then((d) => setReturnToOriginEnabled(Boolean(d.organization?.returnToOriginEnabled)))
      .catch(() => undefined);
    api<{ saved: typeof savedLabels }>(`/api/v1/labels?itemId=${id}`)
      .then((res) => setSavedLabels(res.saved))
      .catch(() => setSavedLabels([]));
  }, [id, reload]);

  if (loadError && !data) return <div className="p-8 text-danger">{loadError}</div>;
  if (!data) return <ItemDetailSkeleton />;

  const { item } = data;
  const actionTarget: ItemActionTarget = {
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    price: item.price,
    totalValue: item.totalValue,
    productLink: item.productLink,
    folderId: item.folder.id,
    lastFromFolderId: item.lastFromFolderId,
    unit: item.unit,
  };

  const labelTarget: LabelTarget = {
    kind: "item",
    id: item.id,
    name: item.name,
    sid: item.sid,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    price: item.price,
    totalValue: item.totalValue,
    notes: item.notes,
    tags: item.tags.map((row) => row.tag.name),
    photoUrl: item.photos[0] ? item.photos[0].publicUrl || `/api/v1/photos/${item.photos[0].id}` : null,
    extraFields: fields.map((field) => ({
      id: field.id,
      name: field.name,
      value: formatCustomValue(field, item.customValues.find((row) => row.fieldId === field.id)),
    })),
  };

  function onMenu(action: ItemMenuAction) {
    if (action === "restock") setRestockOpen(true);
    else if (action === "create-label") setLabelOpen(true);
    else if (action === "set-alert") setAlertOpen(true);
    else if (action === "export") setExportOpen(true);
    else if (action === "clone") setCloneOpen(true);
    else if (action === "merge") setMergeOpen(true);
    else if (action === "add-to") setAddToOpen(true);
    else if (action === "delete") setDeleteOpen(true);
  }

  const orderRows = orderTab === "open" ? orders.open : orders.closed;

  return (
    <ItemPageShell>
      <ItemHeader
        breadcrumb={
          <>
            <Link href="/items" className="hover:text-primary">
              All Items
            </Link>
            <span className="mx-1.5">›</span>
            <Link href={`/folder/${item.folder.id}/content`} className="hover:text-primary">
              {item.folder.name}
            </Link>
          </>
        }
        sid={item.sid}
        updatedAt={item.updatedAt}
        name={item.name}
        actions={<ItemHeaderActions itemId={item.id} editHref={`/item/${item.id}/edit`} onCreateLabel={() => setLabelOpen(true)} onMenu={onMenu} />}
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr] lg:p-8">
        <div className="overflow-hidden rounded-xl border border-[#e6ebe8] bg-white shadow-sm">
          <div className="aspect-square bg-[#eef2ef]">
            {item.photos[0] ? (
              <img src={item.photos[0].publicUrl || `/api/v1/photos/${item.photos[0].id}`} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#8a9a93]">No photo</div>
            )}
          </div>
          <form
            className="border-t border-[#e6ebe8] p-4 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
              if (!input) return;
              const form = new FormData();
              form.set("file", input);
              form.set("ownerType", "ITEM");
              form.set("ownerId", item.id);
              await fetch("/api/v1/photos", { method: "POST", body: form, credentials: "include" });
              await reload();
            }}
          >
            <input type="file" name="file" accept="image/*" className="mb-2 w-full text-xs" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-md border border-[#d8dfdb] px-3 py-1.5 text-xs font-medium hover:bg-[#f4f6f5]">
                Upload photo
              </button>
              {item.photos[0] ? (
                <button
                  type="button"
                  className="rounded-md border border-[#d8dfdb] px-3 py-1.5 text-xs font-medium hover:bg-[#f4f6f5]"
                  onClick={async () => {
                    const res = await api<{ shareUrl: string }>(`/api/v1/photos/${item.photos[0].id}/share`, { method: "POST" });
                    await navigator.clipboard.writeText(res.shareUrl);
                    toast.success("Share link copied");
                  }}
                >
                  Copy share link
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="space-y-5">
          <ItemStatGrid
            stats={[
              {
                label: "Quantity",
                value: `${item.quantity} ${item.unit.abbreviation}`,
                onClick: () => setQtyOpen(true),
                hint: "Update quantity",
              },
              { label: "Min Level", value: item.minQuantity ?? "—" },
              { label: "Price", value: formatMoney(item.price ?? 0) },
              { label: "Total value", value: formatMoney(item.totalValue) },
            ]}
          />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setQtyOpen(true)} className="text-[13px] font-semibold text-primary hover:underline">
              Update Quantity
            </button>
            <span className="text-[#d8dfdb]">·</span>
            <button type="button" onClick={() => setMoveOpen(true)} className="text-[13px] font-semibold text-primary hover:underline">
              Move to folder
            </button>
            <span className="text-[#d8dfdb]">·</span>
            <button type="button" onClick={() => setRestockOpen(true)} className="text-[13px] font-semibold text-primary hover:underline">
              Restock
            </button>
          </div>

          <ItemSection title="Product Information">
            <ItemFieldRow label="Tags">
              {item.tags.length ? (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {item.tags.map((row) => (
                    <Link
                      key={row.tag.id}
                      href={`/tags/${row.tag.id}`}
                      className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary hover:underline"
                    >
                      {row.tag.name}
                    </Link>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </ItemFieldRow>
            <ItemFieldRow label="Notes">{item.notes || "—"}</ItemFieldRow>
            <ItemFieldRow label="QR & Barcode">
              <div className="space-y-3">
                <div className="flex flex-wrap justify-end gap-3">
                  {(item.barcodes.length ? item.barcodes : [{ id: "sid", value: item.sid, symbology: "QR", slot: 1 }]).map((code) => (
                    <div key={code.id} className="rounded-lg border border-[#e6ebe8] bg-white px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase text-[#8a9a93]">{code.slot === 1 ? "Native" : "Linked"}</p>
                      <BarcodeMark value={code.value} symbology={code.symbology} height={44} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setQrOpen(true)} className="text-sm font-semibold text-primary hover:underline">
                    {item.barcodes.some((row) => row.slot === 2) ? "Change QR / barcode" : "Add QR / Barcode"}
                  </button>
                  <button type="button" onClick={() => setLabelOpen(true)} className="text-sm font-semibold text-primary hover:underline">
                    Create Label
                  </button>
                </div>
                {savedLabels.length ? (
                  <ul className="space-y-2 border-t border-[#eef2ef] pt-3">
                    {savedLabels.map((row) => (
                      <li key={row.id} className="flex items-center justify-end gap-3 text-sm">
                        <span className="text-[#4a5c54]">
                          {row.kind === "QR" ? "QR" : "Barcode"} · {row.config.sizeId.replace(/-/g, " ")}
                        </span>
                        <button
                          type="button"
                          disabled={reprintingId === row.id}
                          onClick={() => {
                            setReprintingId(row.id);
                            void reprintSavedLabel({
                              name: row.name,
                              codeValue: row.codeValue,
                              kind: row.kind,
                              sizeId: row.sizeId,
                              config: row.config,
                              photoUrl: labelTarget.photoUrl,
                            }).finally(() => setReprintingId(null));
                          }}
                          className="font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          {reprintingId === row.id ? "Printing…" : "Reprint"}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </ItemFieldRow>
            {fields.map((field) => {
              const stored = item.customValues.find((value) => value.fieldId === field.id);
              return (
                <ItemFieldRow key={field.id} label={field.name}>
                  <CustomFieldValueView field={field} stored={stored} />
                </ItemFieldRow>
              );
            })}
          </ItemSection>

          <ItemSection title="Orders">
            <ItemTabBar
              tabs={[
                { id: "open", label: "Open" },
                { id: "closed", label: "Closed" },
              ]}
              active={orderTab}
              onChange={setOrderTab}
            />
            {orderRows.length ? (
              <ul className="divide-y divide-[#eef2ef] text-sm">
                {orderRows.map((row) => (
                  <li key={row.purchaseOrderId} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/purchase-orders/${row.purchaseOrderId}`} className="font-medium text-primary hover:underline">
                        {row.number}
                      </Link>
                      <div className="text-[12px] text-[#8a9a93]">
                        {row.vendorName ?? "No vendor"} · qty {row.quantity}
                        {row.dateExpected ? ` · expected ${format(new Date(row.dateExpected), "d MMM yyyy")}` : ""}
                      </div>
                    </div>
                    <span className="text-[12px] uppercase text-[#8a9a93]">{row.status.replaceAll("_", " ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-[#8a9a93]">No {orderTab} orders for this item.</p>
            )}
          </ItemSection>

          <ItemSection
            title="Product Link"
            action={
              item.productLink ? (
                <a href={item.productLink} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-primary hover:underline">
                  Open link
                </a>
              ) : null
            }
          >
            <p className="text-[14px] text-[#6b7c74]">
              {item.productLink ? (
                <a href={item.productLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {item.productLink}
                </a>
              ) : (
                "Go directly to the supplier's product page when restocking. Add a link on the edit page."
              )}
            </p>
          </ItemSection>

          <div className="flex flex-wrap gap-3 pb-4">
            <Link href={`/item/${item.id}/activity-history`} className="text-[13px] font-semibold text-primary hover:underline">
              View full history
            </Link>
            <Link href={`/reports/transactions?itemId=${item.id}`} className="text-[13px] font-semibold text-primary hover:underline">
              View transactions
            </Link>
          </div>
        </div>
      </div>

      <AddQrBarcodeModal
        open={qrOpen}
        startOnLink={item.barcodes.some((row) => row.slot === 1)}
        existingSid={item.sid}
        onClose={() => setQrOpen(false)}
        onAdd={async (code) => {
          if (code.role === "native") {
            await api("/api/v1/barcodes", {
              method: "POST",
              body: JSON.stringify({ action: "native", itemId: item.id, symbology: code.symbology }),
              toast: "QR / barcode added",
            });
          } else {
            await api("/api/v1/barcodes", {
              method: "POST",
              body: JSON.stringify({ action: "link", itemId: item.id, value: code.value, symbology: code.symbology }),
              toast: "QR / barcode linked",
            });
          }
          setQrOpen(false);
          await reload();
        }}
      />
      <CreateLabelWizard
        open={labelOpen}
        mode="linked"
        targets={[labelTarget]}
        onClose={() => {
          setLabelOpen(false);
          api<{ saved: typeof savedLabels }>(`/api/v1/labels?itemId=${id}`)
            .then((res) => setSavedLabels(res.saved))
            .catch(() => undefined);
        }}
      />
      {qtyOpen ? (
        <UpdateQuantityModal
          item={actionTarget}
          onClose={() => setQtyOpen(false)}
          onSaved={async () => {
            setQtyOpen(false);
            await reload();
          }}
        />
      ) : null}
      {moveOpen ? (
        <MoveItemModal
          item={actionTarget}
          tree={tree}
          rootId={rootId || item.folder.id}
          returnToOriginEnabled={returnToOriginEnabled}
          onClose={() => setMoveOpen(false)}
          onSaved={(folderId) => {
            setMoveOpen(false);
            router.push(`/folder/${folderId}/content`);
          }}
        />
      ) : null}
      {restockOpen ? (
        <RestockModal
          item={actionTarget}
          onClose={() => setRestockOpen(false)}
          onDone={(href) => {
            setRestockOpen(false);
            router.push(href);
          }}
        />
      ) : null}
      {addToOpen ? (
        <AddToModal
          item={actionTarget}
          onClose={() => setAddToOpen(false)}
          onDone={(href) => {
            setAddToOpen(false);
            router.push(href);
          }}
        />
      ) : null}
      {cloneOpen ? (
        <CloneItemModal
          item={{ id: item.id, name: item.name, folderId: item.folder.id }}
          tree={tree}
          rootId={rootId || item.folder.id}
          onClose={() => setCloneOpen(false)}
          onDone={() => {
            setCloneOpen(false);
            router.refresh();
          }}
        />
      ) : null}
      {mergeOpen ? (
        <MergeItemModal itemId={item.id} onClose={() => setMergeOpen(false)} onDone={() => { setMergeOpen(false); router.refresh(); }} />
      ) : null}
      <ExportWizard open={exportOpen} onClose={() => setExportOpen(false)} itemIds={[item.id]} />
      {alertOpen ? <ItemAlertModal itemIds={[item.id]} itemName={item.name} fields={fields} onClose={() => setAlertOpen(false)} /> : null}
      {deleteOpen ? (
        <DeleteItemModal
          itemName={item.name}
          onClose={() => setDeleteOpen(false)}
          onConfirm={async (meta) => {
            await api(`/api/v1/items/${item.id}`, {
              method: "DELETE",
              body: JSON.stringify({ reason: meta.reason || null, note: meta.note || null }),
              toast: "Item moved to Trash",
            });
            router.push("/items");
          }}
        />
      ) : null}
    </ItemPageShell>
  );
}
