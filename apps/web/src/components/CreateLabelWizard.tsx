"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME, formatMoney } from "@primarywms/shared";
import { ExternalLink } from "lucide-react";
import { api, toast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { BarcodeMark } from "@/components/BarcodeMark";
import { Button, Input } from "@/components/ui";
import {
  buildLabelPdf,
  downloadPdfBytes,
  openPdfBytes,
  pdfBytesToBase64,
  type LabelPdfCopy,
} from "@/lib/label-pdf";
import type { SavedLabelConfig } from "@/lib/saved-label-config";
import {
  BUY_BLANK_LABELS_URL,
  PAPERS,
  buyPrintersUrl,
  getLabelSize,
  perSheet,
  sizeOptionLabel,
  sizesFor,
  type LabelKind,
  type LabelSize,
  type PaperId,
} from "@/lib/label-sizes";

export type LabelTarget = {
  kind: "item" | "folder" | "unlinked";
  id?: string;
  name: string;
  sid: string;
  quantity?: number;
  minQuantity?: number | null;
  price?: number | null;
  totalValue?: number;
  notes?: string | null;
  tags?: string[];
  photoUrl?: string | null;
  extraFields?: { id: string; name: string; value: string }[];
};

type QtyMode = "one" | "custom" | "on_hand";
type DetailKey = "quantity" | "price" | "min" | "total" | "notes" | "tags" | `custom:${string}`;

export function CreateLabelWizard({
  open,
  mode,
  targets,
  onClose,
}: {
  open: boolean;
  mode: "linked" | "unlinked";
  targets: LabelTarget[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<LabelKind | "">("");
  const [paper, setPaper] = useState<PaperId | "">("");
  const [sizeId, setSizeId] = useState("");
  const [labelName, setLabelName] = useState("");
  const [includeDetails, setIncludeDetails] = useState(false);
  const [detailKey, setDetailKey] = useState<DetailKey>("quantity");
  const [includePhoto, setIncludePhoto] = useState(false);
  const [includeLogo, setIncludeLogo] = useState(false);
  const [includeNote, setIncludeNote] = useState(false);
  const [note, setNote] = useState("");
  const [qtyMode, setQtyMode] = useState<QtyMode>(mode === "unlinked" ? "custom" : "one");
  const [customAmount, setCustomAmount] = useState("1");
  const [startOn, setStartOn] = useState(false);
  const [startPosition, setStartPosition] = useState(1);
  const [instructions, setInstructions] = useState(false);
  const [emailOn, setEmailOn] = useState(false);
  const [email, setEmail] = useState("");
  const [initials, setInitials] = useState("PR");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [savedUnlinked, setSavedUnlinked] = useState<{ name: string; value: string }[] | null>(null);

  const size = sizeId ? getLabelSize(sizeId) : undefined;
  const sizeList = kind && paper ? sizesFor(kind, paper) : [];
  const sample = targets[0];
  const detailsOk = Boolean(size?.details) && mode === "linked";
  const photoOk = Boolean(size?.photo) && kind !== "BARCODE" && mode === "linked";
  const logoOk = Boolean(size?.logo);
  const notesOk = Boolean(size?.notes);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setKind(mode === "unlinked" ? "QR" : "");
    setPaper("");
    setSizeId("");
    setLabelName("");
    setIncludeDetails(false);
    setDetailKey("quantity");
    setIncludePhoto(false);
    setIncludeLogo(false);
    setIncludeNote(false);
    setNote("");
    setQtyMode(mode === "unlinked" ? "custom" : "one");
    setCustomAmount("1");
    setStartOn(false);
    setStartPosition(1);
    setInstructions(false);
    setEmailOn(false);
    setPending(false);
    setError("");
    setSavedUnlinked(null);
    api<{ user: { email: string }; organization: { initials: string } | null }>("/api/v1/auth/me")
      .then((data) => {
        setEmail(data.user.email);
        if (data.organization?.initials) setInitials(data.organization.initials);
      })
      .catch(() => undefined);
  }, [open, mode]);

  useEffect(() => {
    if (!size) return;
    if (!size.details) setIncludeDetails(false);
    if (!size.photo) setIncludePhoto(false);
    if (!size.logo) setIncludeLogo(false);
    if (!size.notes) setIncludeNote(false);
  }, [size]);

  const extraOptions = useMemo(() => {
    const rows: { key: DetailKey; label: string }[] = [
      { key: "quantity", label: "Quantity" },
      { key: "price", label: "Price" },
      { key: "min", label: "Min Level" },
      { key: "total", label: "Total Value" },
      { key: "notes", label: "Notes" },
      { key: "tags", label: "Tags" },
    ];
    for (const field of sample?.extraFields ?? []) {
      rows.push({ key: `custom:${field.id}`, label: field.name });
    }
    return rows;
  }, [sample]);

  const previewName =
    mode === "unlinked" ? labelName.trim() || "Label name" : sample?.name || "Item / Folder name displayed here";
  const previewSid = sample?.sid || "SXXXXXXXX";
  const extraText = includeDetails && detailsOk ? extraFor(sample, detailKey) : "";

  const canNext =
    Boolean(kind && paper && size) && (mode === "linked" || Boolean(labelName.trim())) && (mode === "unlinked" || targets.length > 0);

  if (!open) return null;

  async function buildCopies(): Promise<LabelPdfCopy[]> {
    if (!kind) return [];
    if (mode === "unlinked") {
      const count = Math.max(1, Number(customAmount) || 1);
      let rows = savedUnlinked;
      if (!rows || rows.length !== count) {
        const res = await api<{ labels: { name: string; value: string }[] }>("/api/v1/labels", {
          method: "POST",
          body: JSON.stringify({
            action: "unlinked",
            name: labelName.trim(),
            count,
            symbology: "QR",
          }),
        });
        rows = res.labels;
        setSavedUnlinked(rows);
      }
      return rows.map((row) => ({
        name: row.name,
        value: row.value,
        extra: extraText || undefined,
        note: includeNote && notesOk ? note.trim() || undefined : undefined,
        logo: includeLogo && logoOk ? initials : null,
      }));
    }

    const copies: LabelPdfCopy[] = [];
    for (const target of targets) {
      const n =
        qtyMode === "on_hand"
          ? Math.max(1, Math.floor(target.quantity ?? 1))
          : qtyMode === "custom"
            ? Math.max(1, Number(customAmount) || 1)
            : 1;
      for (let i = 0; i < n; i++) {
        copies.push({
          name: target.name,
          value: target.sid,
          extra: includeDetails && detailsOk ? extraFor(target, detailKey) : undefined,
          note: includeNote && notesOk ? note.trim() || undefined : undefined,
          photoUrl: includePhoto && photoOk ? target.photoUrl : null,
          logo: includeLogo && logoOk ? initials : null,
        });
      }
    }
    return copies;
  }

  async function makePdf() {
    if (!kind || !size) throw new Error("Choose label type, paper, and size");
    const copies = await buildCopies();
    if (copies.length > size.batchCap) {
      throw new Error(`This size supports up to ${size.batchCap} labels per batch`);
    }
    const bytes = await buildLabelPdf({
      size,
      kind,
      copies,
      startPosition: size.paper === "THERMAL" || !startOn ? 1 : startPosition,
      instructions,
      includePhoto: includePhoto && photoOk,
      includeLogo: includeLogo && logoOk,
      includeDetails: includeDetails && detailsOk,
      includeNote: includeNote && notesOk,
    });
    return { bytes, copies };
  }

  async function saveLinkedConfigs() {
    if (mode !== "linked" || !kind || !paper || !sizeId) return;
    const config: SavedLabelConfig = {
      kind,
      paper: paper as SavedLabelConfig["paper"],
      sizeId,
      includeDetails,
      detailKey,
      includePhoto,
      includeLogo,
      includeNote,
      note,
      qtyMode,
      customAmount,
      startOn,
      startPosition,
      instructions,
    };
    for (const target of targets) {
      if (target.kind === "unlinked" || !target.id) continue;
      await api("/api/v1/labels", {
        method: "POST",
        body: JSON.stringify({
          action: "linked",
          itemId: target.kind === "item" ? target.id : undefined,
          folderId: target.kind === "folder" ? target.id : undefined,
          name: target.name,
          codeValue: target.sid,
          kind,
          sizeId,
          config,
        }),
        toast: false,
      });
    }
  }

  async function maybeEmail(bytes: Uint8Array, copies: number) {
    if (!emailOn || !email.trim() || !size || !kind) return;
    await api("/api/v1/labels", {
      method: "POST",
      body: JSON.stringify({
        action: "email",
        email: email.trim(),
        summary: `${copies} ${kind === "QR" ? "QR" : "barcode"} label(s) · ${size.name} (${size.displaySize})`,
        pdfBase64: pdfBytesToBase64(bytes),
      }),
      toast: false,
    });
    toast.success("Label PDF emailed");
  }

  async function downloadPdf() {
    setPending(true);
    setError("");
    try {
      const { bytes, copies } = await makePdf();
      await maybeEmail(bytes, copies.length);
      downloadPdfBytes(bytes, `labels-${size?.id || "sheet"}.pdf`);
      toast.success("PDF downloaded — print at 100% / actual size");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create PDF");
    } finally {
      setPending(false);
    }
  }

  async function printAndSave() {
    setPending(true);
    setError("");
    try {
      const { bytes, copies } = await makePdf();
      await maybeEmail(bytes, copies.length);
      await saveLinkedConfigs();
      openPdfBytes(bytes);
      toast.success(mode === "linked" ? "Label saved — print from the PDF at 100%" : "PDF ready to print at 100%");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create labels");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-[#e6ebe8] bg-[#f7f8f8] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#2a3a33]">Create Label</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[#7a8b84] hover:text-[#2a3a33]">
            ×
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div className="space-y-5 px-6 py-5">
            {step === 1 ? (
              <>
                {mode === "unlinked" ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Unlinked labels</p>
                    <p className="mt-2 text-sm text-[#4a5c54]">
                      Create beautiful QR labels which can be linked to your items using the {APP_NAME} mobile app.
                    </p>
                    <Link
                      href="/items"
                      onClick={onClose}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Need to generate auto-linked QR and Barcode labels?
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-2 rounded-lg bg-[#e8f3fb] px-3 py-2.5 text-sm text-[#2a4a66]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4a90c8] text-[11px] font-bold text-white">
                      i
                    </span>
                    This label will now be stored for easy reprinting.
                  </div>
                )}

                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Label options</p>
                  <div className="space-y-3">
                    {mode === "unlinked" ? (
                      <FloatingField label="Label name">
                        <Input placeholder=" " value={labelName} onChange={(e) => setLabelName(e.target.value)} />
                      </FloatingField>
                    ) : null}
                    <FloatingField label="Label type">
                      {mode === "unlinked" ? (
                        <div className="flex h-11 items-center rounded-lg border border-border bg-[#f3f5f4] px-3 text-sm text-[#4a5c54]">
                          QR Label
                        </div>
                      ) : (
                        <select
                          className={selectClass}
                          value={kind}
                          onChange={(e) => {
                            setKind(e.target.value as LabelKind | "");
                            setSizeId("");
                          }}
                        >
                          <option value="">Select</option>
                          <option value="QR">QR Label</option>
                          <option value="BARCODE">Barcode Label</option>
                        </select>
                      )}
                    </FloatingField>
                    <FloatingField label="Paper size">
                      <select
                        className={selectClass}
                        value={paper}
                        onChange={(e) => {
                          setPaper(e.target.value as PaperId | "");
                          setSizeId("");
                        }}
                      >
                        <option value="">Select</option>
                        {PAPERS.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.label}
                          </option>
                        ))}
                      </select>
                    </FloatingField>
                    <FloatingField label="Label size">
                      <select
                        className={selectClass}
                        value={sizeId}
                        disabled={!kind || !paper}
                        onChange={(e) => setSizeId(e.target.value)}
                      >
                        <option value="">Select</option>
                        {sizeList.map((row) => (
                          <option key={row.id} value={row.id}>
                            {sizeOptionLabel(row)}
                          </option>
                        ))}
                      </select>
                    </FloatingField>
                  </div>
                </section>

                {size && (detailsOk || photoOk || logoOk || notesOk || !size.showName) ? (
                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Label settings</p>
                    {detailsOk ? (
                      <>
                        <ToggleRow label="Include additional item details" on={includeDetails} onChange={setIncludeDetails} />
                        {includeDetails ? (
                          <FloatingField label="Additional detail">
                            <select className={selectClass} value={detailKey} onChange={(e) => setDetailKey(e.target.value as DetailKey)}>
                              {extraOptions.map((row) => (
                                <option key={row.key} value={row.key}>
                                  {row.label}
                                </option>
                              ))}
                            </select>
                          </FloatingField>
                        ) : null}
                      </>
                    ) : null}
                    {photoOk ? <ToggleRow label="Include photo" on={includePhoto} onChange={setIncludePhoto} /> : null}
                    {logoOk ? <ToggleRow label="Include logo or icon" on={includeLogo} onChange={setIncludeLogo} /> : null}
                    {notesOk ? (
                      <>
                        <ToggleRow label="Add a note to label" on={includeNote} onChange={setIncludeNote} />
                        {includeNote ? (
                          <Input placeholder="Note printed on the label" value={note} onChange={(e) => setNote(e.target.value)} />
                        ) : null}
                      </>
                    ) : null}
                    {!size.showName && !detailsOk && !photoOk && !logoOk && !notesOk ? (
                      <p className="text-sm text-[#8a9a93]">This size prints the code (and SID) only.</p>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : (
              <>
                <section className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Printing options</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[180px] flex-1">
                      <FloatingField label="Label quantity">
                        <select className={selectClass} value={qtyMode} onChange={(e) => setQtyMode(e.target.value as QtyMode)}>
                          {mode === "linked" ? <option value="one">1 per Item</option> : null}
                          <option value="custom">Custom</option>
                          {mode === "linked" ? <option value="on_hand">As per item quantity</option> : null}
                        </select>
                      </FloatingField>
                    </div>
                    {qtyMode === "custom" ? (
                      <div className="w-28">
                        <FloatingField label="Amount">
                          <Input
                            type="number"
                            min={1}
                            max={size?.batchCap ?? 1500}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                          />
                        </FloatingField>
                      </div>
                    ) : null}
                  </div>
                  {size && size.paper !== "THERMAL" ? (
                    <>
                      <ToggleRow label="Choose label print start position" on={startOn} onChange={setStartOn} />
                      {startOn ? <StartGrid size={size} start={startPosition} onChange={setStartPosition} /> : null}
                    </>
                  ) : null}
                  <ToggleRow label="Include printing instructions" on={instructions} onChange={setInstructions} />
                  <ToggleRow label="Send copy to email" on={emailOn} onChange={setEmailOn} />
                  {emailOn ? (
                    <FloatingField label="Email">
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " />
                    </FloatingField>
                  ) : null}
                </section>
                {size ? (
                  <section className="space-y-2 text-sm text-[#4a5c54]">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]">Label information</p>
                    <p>
                      <span className="font-medium text-[#2a3a33]">Labels per sheet:</span> {perSheet(size)}
                    </p>
                    {size.avery.length ? (
                      <p>
                        <span className="font-medium text-[#2a3a33]">Compatible with:</span> Avery {size.avery.join(", ")}
                      </p>
                    ) : null}
                    <p>
                      <a className="font-medium text-primary hover:underline" href={BUY_BLANK_LABELS_URL} target="_blank" rel="noreferrer">
                        Purchase Blank Labels
                      </a>
                    </p>
                    <p>
                      <span className="font-medium text-[#2a3a33]">Printer type:</span> {size.printerType}
                    </p>
                    <p>
                      <a className="font-medium text-primary hover:underline" href={buyPrintersUrl(size.paper)} target="_blank" rel="noreferrer">
                        Purchase Recommended Printers
                      </a>
                    </p>
                    <p className="pt-1 text-xs text-[#8a9a93]">
                      Output is a PDF. Print at <strong>100% / actual size</strong>. Max {size.batchCap} labels per batch.
                    </p>
                  </section>
                ) : null}
              </>
            )}
            {error ? <p className="text-sm text-[#e24b4b]">{error}</p> : null}
          </div>

          <aside className="flex items-center justify-center bg-[#f3f5f4] px-6 py-8">
            <LabelPreview
              kind={kind}
              size={size}
              name={previewName}
              sid={previewSid}
              extra={extraText}
              note={includeNote && notesOk ? note : ""}
              photoUrl={includePhoto && photoOk ? sample?.photoUrl : null}
              logo={includeLogo && logoOk ? initials : null}
              showName={size?.showName ?? true}
            />
          </aside>
        </div>

        <div className="flex items-center justify-between border-t border-[#e6ebe8] px-6 py-4">
          {step === 2 ? (
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-[#8a9a93]">Step {step} of 2</span>
          <div className="flex items-center gap-3">
            {step === 1 ? (
              <Button disabled={!canNext} onClick={() => setStep(2)}>
                Next
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void downloadPdf()}
                  className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline disabled:opacity-50"
                >
                  Download PDF
                </button>
                <Button disabled={pending} onClick={() => void printAndSave()}>
                  {pending ? "Working…" : "Print & Save Label"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function extraFor(target: LabelTarget | undefined, key: DetailKey) {
  if (!target) return "";
  if (key === "quantity") return `Qty ${target.quantity ?? 0}`;
  if (key === "price") return target.price != null ? formatMoney(target.price) : "";
  if (key === "min") return target.minQuantity != null ? `Min ${target.minQuantity}` : "";
  if (key === "total") return formatMoney(target.totalValue ?? 0);
  if (key === "notes") return target.notes?.trim() || "";
  if (key === "tags") return (target.tags ?? []).join(", ");
  const id = key.slice("custom:".length);
  return target.extraFields?.find((field) => field.id === id)?.value ?? "";
}

function dimParts(displaySize: string) {
  const parts = displaySize.split(/\s*[×x]\s*/);
  let width = parts[0]?.trim() || displaySize;
  let height = parts[1]?.trim() || "";
  const unit = height.match(/\s*(in|cm)$/i)?.[1];
  if (unit && !/\s*(in|cm)$/i.test(width)) width = `${width} ${unit}`;
  return { width, height };
}

function LabelPreview({
  kind,
  size,
  name,
  sid,
  extra,
  note,
  photoUrl,
  logo,
  showName,
}: {
  kind: LabelKind | "";
  size?: LabelSize;
  name: string;
  sid: string;
  extra: string;
  note: string;
  photoUrl?: string | null;
  logo?: string | null;
  showName: boolean;
}) {
  if (!kind) {
    return (
      <div className="flex h-72 w-56 items-center justify-center rounded-md border-2 border-dashed border-[#d5ddd9] bg-white text-center text-sm text-[#8a9a93]">
        Choose label type to see preview
      </div>
    );
  }
  const w = size?.widthIn ?? 3.3;
  const h = size?.heightIn ?? 4;
  // Sortly scales small stickers up so barcode Small (~7/8×1½) stays readable
  const max = 280;
  const minEdge = 120;
  const scale = Math.max(minEdge / Math.min(w, h) / 96, Math.min(max / (w * 96), max / (h * 96), 1.35));
  const stickerW = w * 96 * scale;
  const stickerH = h * 96 * scale;
  const dims = size ? dimParts(size.displaySize) : { width: "", height: "" };
  const pad = showName || extra
    ? Math.max(8, Math.min(14, Math.min(stickerW, stickerH) * 0.08))
    : Math.max(6, Math.min(10, Math.min(stickerW, stickerH) * 0.06));
  const showHeader = showName || Boolean(extra);
  const qrSide = Math.min(stickerW - pad * 2, stickerH * (showHeader ? 0.42 : 0.55), 120);
  // Sortly SID-only barcode: bars dominate (~70% of sticker height), SID tucked under
  const sidPx = Math.max(10, Math.min(13, stickerW * 0.07));
  const barH = Math.max(
    40,
    Math.round(showHeader ? (stickerH - pad * 2) * 0.35 : stickerH - pad * 2 - sidPx - 10),
  );
  const namePx = stickerH < 100 ? 11 : stickerH < 160 ? 13 : 15;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ paddingTop: 26, paddingRight: 40 }}>
        {size ? (
          <div
            className="pointer-events-none absolute left-0 flex items-center text-[11px] text-[#9aa69f]"
            style={{ top: 2, width: stickerW }}
          >
            <DimCap direction="h" />
            <div className="h-px flex-1 bg-[#c5cec9]" />
            <span className="shrink-0 px-1.5 tabular-nums">{dims.width}</span>
            <div className="h-px flex-1 bg-[#c5cec9]" />
            <DimCap direction="h" flip />
          </div>
        ) : null}
        {size && dims.height ? (
          <div
            className="pointer-events-none absolute flex flex-col items-center text-[11px] text-[#9aa69f]"
            style={{ top: 26, right: 2, height: stickerH }}
          >
            <DimCap direction="v" />
            <div className="w-px flex-1 bg-[#c5cec9]" />
            <span className="shrink-0 rotate-90 py-2 tabular-nums whitespace-nowrap">{dims.height}</span>
            <div className="w-px flex-1 bg-[#c5cec9]" />
            <DimCap direction="v" flip />
          </div>
        ) : null}
        <div
          className="overflow-hidden bg-white"
          style={{
            width: stickerW,
            height: stickerH,
            padding: pad,
            boxShadow: "0 0 0 1px #e2e8e4",
          }}
        >
          <div className="flex h-full flex-col">
            {showHeader ? (
              <>
                {showName ? (
                  <div className="font-semibold leading-tight text-[#2a3a33]" style={{ fontSize: namePx }}>
                    {name}
                  </div>
                ) : null}
                {extra ? <div className="mt-0.5 text-[11px] leading-snug text-[#4a5c54]">{extra}</div> : null}
                <div className="my-2 h-[2px] w-[28%] min-w-[2.25rem] bg-primary" />
              </>
            ) : null}
            <div className={cn("flex min-h-0 flex-1 items-center gap-2", !showHeader && "justify-center")}>
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-[58%] w-[28%] rounded-sm object-cover" />
              ) : null}
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center",
                  showHeader ? "justify-center gap-1" : "justify-center gap-0.5",
                )}
              >
                {logo ? (
                  <div className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {logo}
                  </div>
                ) : null}
                {kind === "QR" ? (
                  <BarcodeMark value={sid} symbology="QR" size={Math.round(qrSide)} showValue={false} className="!gap-0" />
                ) : (
                  <div className="flex w-full justify-center overflow-hidden px-0.5">
                    <BarcodeMark value={sid} symbology="CODE128" height={barH} showValue={false} className="!gap-0 w-full" />
                  </div>
                )}
                <div className="tracking-wide text-[#2a3a33]" style={{ fontSize: sidPx }}>
                  {sid}
                </div>
              </div>
            </div>
            {note ? <div className="mt-auto pt-1 text-[10px] text-[#4a5c54]">{note}</div> : null}
          </div>
        </div>
      </div>
      {!size ? <p className="mt-3 text-center text-xs text-[#8a9a93]">Choose paper and size for a live sticker preview</p> : null}
    </div>
  );
}

function DimCap({ direction, flip }: { direction: "h" | "v"; flip?: boolean }) {
  if (direction === "h") {
    return (
      <svg className={cn("h-2.5 w-2.5 shrink-0 text-[#9aa69f]", flip && "rotate-180")} viewBox="0 0 10 10" aria-hidden>
        <path d="M8 5 H2 M2 5 L5.5 2 M2 5 L5.5 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={cn("h-2.5 w-2.5 shrink-0 text-[#9aa69f]", flip && "rotate-180")} viewBox="0 0 10 10" aria-hidden>
      <path d="M5 8 V2 M5 2 L2 5.5 M5 2 L8 5.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function StartGrid({ size, start, onChange }: { size: LabelSize; start: number; onChange: (n: number) => void }) {
  const total = perSheet(size);
  return (
    <div>
      <p className="mb-2 text-xs text-[#4a5c54]">Skip used slots on a partial sheet. Click the first empty label.</p>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${size.cols}, 1.6rem)` }}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-7 rounded border text-[11px]",
                n === start
                  ? "border-primary bg-primary text-white"
                  : n < start
                    ? "border-[#e6ebe8] bg-[#eef1ef] text-[#8a9a93]"
                    : "border-[#d5ddd9] bg-white",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-[#2a3a33]">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-[#cfd6d2]")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

function FloatingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[#8a9a93]">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-[#f3f5f4] disabled:text-[#8a9a93]";
