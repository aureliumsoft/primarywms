"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderInput,
  Upload,
} from "lucide-react";
import { api, toast } from "@/lib/api";
import { downloadApi } from "@/lib/download";
import { cn } from "@/lib/cn";
import { Button } from "./ui";
import { SelectFolderModal } from "./SelectFolderModal";
import type { TreeFolder } from "./FolderPane";

export type ImportResult = {
  createdItems: number;
  createdFolders: number;
  errors: { row: number; message: string }[];
  total: number;
};

type Step = "method" | "upload" | "report";

const ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function ImportWizard({
  layout = "page",
  open = true,
  onClose,
  defaultFolderId,
}: {
  /** Full-page flow (folder pane /import) or centered modal overlay. */
  layout?: "page" | "modal";
  open?: boolean;
  onClose?: () => void;
  defaultFolderId?: string;
}) {
  const [step, setStep] = useState<Step>("method");
  const [mode, setMode] = useState<"quick" | "advanced">("quick");
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [rootId, setRootId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [pickFolder, setPickFolder] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("method");
    setMode("quick");
    setFile(null);
    setResult(null);
    setBusy(false);
    api<{ tree: TreeFolder[]; rootId?: string }>("/api/v1/folders")
      .then((d) => {
        setTree(d.tree);
        const root = d.rootId ?? d.tree.find((f) => !f.parentId)?.id ?? "";
        setRootId(root);
        setFolderId(defaultFolderId || root);
      })
      .catch(() => undefined);
  }, [open, defaultFolderId]);

  const folderName = tree.find((f) => f.id === folderId)?.name ?? "All Items";

  const pickFile = useCallback((next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    const lower = next.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Choose a CSV or Excel file");
      return;
    }
    setFile(next);
  }, []);

  async function runImport() {
    if (!file) {
      toast.error("Choose a CSV or Excel file");
      return;
    }
    if (mode === "quick" && !folderId) {
      toast.error("Choose a destination folder");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", mode);
      if (mode === "quick") form.set("folderId", folderId);
      const data = await api<ImportResult>("/api/v1/import", { method: "POST", body: form, toast: false });
      setResult(data);
      setStep("report");
      if (data.errors.length === 0) {
        toast.success(`Imported ${data.createdItems} items and ${data.createdFolders} folders`);
      } else {
        toast.info(`Imported with ${data.errors.length} row errors`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function resetWizard() {
    setStep("method");
    setFile(null);
    setResult(null);
  }

  if (!open) return null;

  const stepTitle =
    step === "method" ? "Bulk Import" : step === "upload" ? "Upload file" : "Import report";

  const body = (
    <div className={cn(layout === "page" ? "max-w-3xl" : "")}>
      {step === "method" ? (
        <div className="space-y-5">
          <p className="text-[14px] leading-relaxed text-[#6b7c74]">
            Add new items and folders from a CSV or Excel file. Create custom fields and units of measure first so they
            appear in the template. Import creates new entries only — it does not update existing items or folders.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={cn(
                "rounded-xl border p-5 text-left transition",
                mode === "quick" ? "border-primary bg-primary-soft ring-1 ring-primary/30" : "border-[#e6ebe8] hover:border-primary/50",
              )}
            >
              <FolderInput className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-semibold text-[#1c2b25]">Quick Import</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7c74]">
                Place every row into one chosen folder. Best when everything belongs in a single location.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("advanced")}
              className={cn(
                "rounded-xl border p-5 text-left transition",
                mode === "advanced"
                  ? "border-primary bg-primary-soft ring-1 ring-primary/30"
                  : "border-[#e6ebe8] hover:border-primary/50",
              )}
            >
              <FileSpreadsheet className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-semibold text-[#1c2b25]">Advanced Import</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7c74]">
                Use Primary Folder and Subfolder-level1–4 columns to place each row. Folders are created as needed along
                the path.
              </p>
            </button>
          </div>
        </div>
      ) : null}

      {step === "upload" ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-[#e6ebe8] bg-white p-5">
            <h3 className="text-[15px] font-semibold text-[#1c2b25]">1. Download the template</h3>
            <p className="mt-1.5 text-[13px] text-[#6b7c74]">
              Use our template so column names match. Required for items: Entry Name and Quantity. Entry Type must be{" "}
              <strong>Item</strong> or <strong>Folder</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void downloadApi("/api/v1/import?format=csv")}>
                <Download className="h-4 w-4" />
                CSV template
              </Button>
              <Button variant="secondary" onClick={() => void downloadApi("/api/v1/import?format=xlsx")}>
                <Download className="h-4 w-4" />
                Excel template
              </Button>
            </div>
          </section>

          {mode === "quick" ? (
            <section className="rounded-xl border border-[#e6ebe8] bg-white p-5">
              <h3 className="text-[15px] font-semibold text-[#1c2b25]">2. Choose destination folder</h3>
              <p className="mt-1.5 text-[13px] text-[#6b7c74]">All rows will be imported into this folder.</p>
              <button
                type="button"
                className="mt-3 flex w-full max-w-md items-center justify-between rounded-lg border border-[#d8dfdb] px-3 py-2.5 text-left text-sm hover:bg-[#f4f6f5]"
                onClick={() => setPickFolder(true)}
              >
                <span className="truncate">{folderName}</span>
                <span className="shrink-0 text-primary">Change</span>
              </button>
            </section>
          ) : null}

          <section className="rounded-xl border border-[#e6ebe8] bg-white p-5">
            <h3 className="text-[15px] font-semibold text-[#1c2b25]">
              {mode === "quick" ? "3. Upload your file" : "2. Upload your file"}
            </h3>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
                dragOver ? "border-primary bg-primary-soft" : "border-[#d8dfdb] hover:border-primary/50 hover:bg-[#fafbfa]",
              )}
            >
              <Upload className="mb-3 h-8 w-8 text-[#8a9a93]" />
              {file ? (
                <>
                  <p className="font-medium text-[#1c2b25]">{file.name}</p>
                  <p className="mt-1 text-[13px] text-[#6b7c74]">Click or drop to replace</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-[#1c2b25]">Choose a file or drag it here</p>
                  <p className="mt-1 text-[13px] text-[#6b7c74]">CSV or Excel (.xlsx)</p>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </section>
        </div>
      ) : null}

      {step === "report" && result ? (
        <div className="space-y-4">
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-5",
              result.errors.length ? "border-[#f0d9a8] bg-[#fffbf2]" : "border-[#c8e6d4] bg-[#f3fbf6]",
            )}
          >
            {result.errors.length ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#c9820a]" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            )}
            <div>
              <p className="font-semibold text-[#1c2b25]">
                {result.errors.length ? "Import completed with errors" : "Import completed"}
              </p>
              <p className="mt-1 text-[14px] text-[#4a5c54]">
                {result.createdItems} item{result.createdItems === 1 ? "" : "s"} and {result.createdFolders} folder
                {result.createdFolders === 1 ? "" : "s"} created from {result.total} row{result.total === 1 ? "" : "s"}.
                {result.errors.length
                  ? ` ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} could not be imported.`
                  : " All rows succeeded."}
              </p>
            </div>
          </div>
          {result.errors.length ? (
            <div className="overflow-hidden rounded-xl border border-[#e6ebe8]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f7f9f8] text-[11px] uppercase tracking-wide text-[#8a9a93]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Row</th>
                    <th className="px-4 py-2.5 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((err) => (
                    <tr key={`${err.row}-${err.message}`} className="border-t border-[#eef2f0]">
                      <td className="px-4 py-2.5 text-[#4a5c54]">{err.row}</td>
                      <td className="px-4 py-2.5 text-[#e24b4b]">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="text-[13px] text-[#6b7c74]">
            Open{" "}
            <Link href="/items" className="font-medium text-primary hover:underline">
              All Items
            </Link>{" "}
            to review imported inventory.
          </p>
        </div>
      ) : null}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ebe8] pt-5">
        <div>
          {step === "upload" ? (
            <Button variant="secondary" onClick={() => setStep("method")}>
              Back
            </Button>
          ) : step === "report" ? (
            <Button variant="secondary" onClick={resetWizard}>
              Import another file
            </Button>
          ) : layout === "modal" && onClose ? (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          {step === "method" ? (
            <Button onClick={() => setStep("upload")}>Continue</Button>
          ) : step === "upload" ? (
            <Button disabled={busy || !file || (mode === "quick" && !folderId)} onClick={() => void runImport()}>
              <Upload className="h-4 w-4" />
              {busy ? "Importing…" : "Upload & Import"}
            </Button>
          ) : onClose ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <Link
              href="/items"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
            >
              Done
            </Link>
          )}
        </div>
      </footer>

      <SelectFolderModal
        open={pickFolder}
        title="Choose destination folder"
        tree={tree}
        rootId={rootId}
        selectedId={folderId || rootId}
        onClose={() => setPickFolder(false)}
        onSelect={(id) => {
          setFolderId(id);
          setPickFolder(false);
        }}
      />
    </div>
  );

  if (layout === "modal") {
    return (
      <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-6 pt-16">
        <div className="w-full max-w-[640px] rounded-2xl bg-white shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
          <header className="flex items-center justify-between border-b border-[#e6ebe8] px-6 py-4">
            <h2 className="text-[18px] font-semibold text-[#1c2b25]">{stepTitle}</h2>
            <button type="button" onClick={onClose} className="text-xl leading-none text-[#8a9a93] hover:text-[#1c2b25]">
              ×
            </button>
          </header>
          <div className="px-6 py-5">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-[13px] text-[#8a9a93]">
        {step === "method" ? "Choose method" : step === "upload" ? "Download template & upload" : "Results"}
      </p>
      {body}
    </div>
  );
}
