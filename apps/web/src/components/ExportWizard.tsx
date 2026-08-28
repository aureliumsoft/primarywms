"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { SPREADSHEET_FIELDS } from "@/lib/export-fields";
import { downloadApi } from "@/lib/download";
import { api, toast } from "@/lib/api";
import { Button } from "./ui";
import { cn } from "@/lib/cn";

const PDF_FIELDS = ["SID", "Quantity", "Min Level", "Price", "Notes", "Tags", "Folder"];

type Kind = "spreadsheet" | "pdf";

export function ExportWizard({
  open,
  onClose,
  folderId,
  itemIds,
}: {
  open: boolean;
  onClose: () => void;
  folderId?: string;
  itemIds?: string[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<Kind>("spreadsheet");
  const [xlsx, setXlsx] = useState(true);
  const [fields, setFields] = useState<string[]>([...SPREADSHEET_FIELDS]);
  const [layout, setLayout] = useState<"album" | "list" | "compact">("list");
  const [pdfFields, setPdfFields] = useState<string[]>([...PDF_FIELDS]);
  const [titlePage, setTitlePage] = useState(true);
  const [summaryPage, setSummaryPage] = useState(false);
  const [includeLabels, setIncludeLabels] = useState(false);
  const [includeFolders, setIncludeFolders] = useState(true);
  const [title, setTitle] = useState("Inventory");
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    const saved = localStorage.getItem("pwms.export");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { fields?: string[]; pdfFields?: string[]; layout?: typeof layout };
        if (parsed.fields) setFields(parsed.fields);
        if (parsed.pdfFields) setPdfFields(parsed.pdfFields);
        if (parsed.layout) setLayout(parsed.layout);
      } catch {
        /* ignore */
      }
    }
    api<{ fields: { name: string }[] }>("/api/v1/settings/lookups")
      .then((d) => setCustom(d.fields.map((f) => f.name)))
      .catch(() => undefined);
  }, [open]);

  const options = useMemo(() => (kind === "pdf" ? PDF_FIELDS : [...SPREADSHEET_FIELDS, ...custom]), [kind, custom]);

  if (!open) return null;

  async function exportNow() {
    setBusy(true);
    try {
      localStorage.setItem("pwms.export", JSON.stringify({ fields, pdfFields, layout }));
      await downloadApi("/api/v1/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          format: xlsx ? "xlsx" : "csv",
          folderId,
          itemIds,
          fields: kind === "pdf" ? pdfFields.slice(0, 6) : fields,
          includeFolders,
          layout,
          title,
          titlePage,
          summaryPage,
          includeLabels,
        }),
      });
      toast.success("Export downloaded");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  function toggle(field: string) {
    setFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-6 pt-16">
      <div className="w-full max-w-[640px] rounded-2xl bg-white shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
        <header className="flex items-center justify-between border-b border-[#e6ebe8] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#1c2b25]">{step === 1 ? "Export" : kind === "pdf" ? "PDF options" : "Spreadsheet options"}</h2>
          <button type="button" onClick={onClose} className="text-[#8a9a93] hover:text-[#1c2b25]">
            ×
          </button>
        </header>
        <div className="px-6 py-5">
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setKind("spreadsheet")}
                className={cn(
                  "rounded-xl border p-4 text-left",
                  kind === "spreadsheet" ? "border-primary bg-primary-soft" : "border-[#e6ebe8] hover:border-primary",
                )}
              >
                <FileSpreadsheet className="mb-2 h-6 w-6 text-primary" />
                <div className="font-semibold">Spreadsheet</div>
                <p className="mt-1 text-[13px] text-[#6b7c74]">CSV or Excel with every field, organized by folder.</p>
              </button>
              <button
                type="button"
                onClick={() => setKind("pdf")}
                className={cn(
                  "rounded-xl border p-4 text-left",
                  kind === "pdf" ? "border-primary bg-primary-soft" : "border-[#e6ebe8] hover:border-primary",
                )}
              >
                <FileText className="mb-2 h-6 w-6 text-primary" />
                <div className="font-semibold">Page(s) PDF</div>
                <p className="mt-1 text-[13px] text-[#6b7c74]">Album, list, or compact layout with photos.</p>
              </button>
            </div>
          ) : kind === "spreadsheet" ? (
            <div className="space-y-4">
              <label className="flex items-center justify-between text-sm">
                Export as .xlsx (Excel)
                <input type="checkbox" checked={xlsx} onChange={(e) => setXlsx(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between text-sm">
                Include folders
                <input type="checkbox" checked={includeFolders} onChange={(e) => setIncludeFolders(e.target.checked)} />
              </label>
              <div className="flex justify-between text-[13px]">
                <span className="font-medium">Fields to export</span>
                <button type="button" className="text-primary" onClick={() => setFields([])}>
                  Unselect All
                </button>
              </div>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto text-sm">
                {options.map((field) => (
                  <label key={field} className="flex items-center gap-2">
                    <input type="checkbox" checked={fields.includes(field)} onChange={() => toggle(field)} />
                    {field}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["album", "list", "compact"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLayout(id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm capitalize",
                      layout === id ? "border-primary bg-primary-soft font-medium" : "border-[#e6ebe8]",
                    )}
                  >
                    {id}
                    <div className="mt-1 text-[11px] text-[#8a9a93]">
                      {id === "album" ? "1 item per page" : id === "list" ? "One column" : "Two columns"}
                    </div>
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between text-sm">
                Add Title Page
                <input type="checkbox" checked={titlePage} onChange={(e) => setTitlePage(e.target.checked)} />
              </label>
              {titlePage ? (
                <input className="h-11 w-full rounded-lg border px-3 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
              ) : null}
              <label className="flex items-center justify-between text-sm">
                Add Summary Page
                <input type="checkbox" checked={summaryPage} onChange={(e) => setSummaryPage(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between text-sm">
                Include Labels
                <input type="checkbox" checked={includeLabels} onChange={(e) => setIncludeLabels(e.target.checked)} />
              </label>
              <p className="text-[12px] text-[#8a9a93]">Choose up to 6 fields to print.</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {PDF_FIELDS.map((field) => (
                  <label key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pdfFields.includes(field)}
                      onChange={() => {
                        if (pdfFields.includes(field)) setPdfFields(pdfFields.filter((f) => f !== field));
                        else if (pdfFields.length < 6) setPdfFields([...pdfFields, field]);
                      }}
                    />
                    {field}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#e6ebe8] px-6 py-4">
          {step === 2 ? (
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>Next</Button>
          ) : (
            <Button onClick={() => void exportNow()} disabled={busy}>
              {busy ? "Exporting…" : "Export"}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
