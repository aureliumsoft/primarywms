"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  PackagePlus,
  Play,
  RotateCcw,
  Search,
} from "lucide-react";
import { api, toast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button, Field, Input, Modal } from "./ui";

export type CatalogJob = {
  id: string;
  number: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  externalLink: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  completedAt: string | null;
};

const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
} as const;

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function JobBanner({
  job,
  onChanged,
}: {
  job: CatalogJob;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const completed = job.status === "COMPLETED";

  async function startJob() {
    setBusy(true);
    try {
      await api(`/api/v1/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
        toast: "Job started",
      });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start job");
    } finally {
      setBusy(false);
    }
  }

  async function reopenJob() {
    setBusy(true);
    try {
      await api(`/api/v1/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
        toast: "Job reopened",
      });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reopen job");
    } finally {
      setBusy(false);
    }
  }

  const start = formatDate(job.startDate);
  const end = formatDate(job.endDate);

  return (
    <>
      <div
        className={cn(
          "mt-4 rounded-xl border px-4 py-3",
          completed ? "border-[#e6ebe8] bg-[#f7f8f8]" : "border-primary/25 bg-primary-soft/40",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-[13px] font-semibold text-[#1c2b25]">Job folder</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  completed
                    ? "bg-[#eef2f0] text-[#5c6b64]"
                    : job.status === "IN_PROGRESS"
                      ? "bg-primary text-white"
                      : "bg-[#fff6e8] text-[#9a6b1f]",
                )}
              >
                {STATUS_LABEL[job.status]}
              </span>
              <Link href="/jobs" className="text-[12px] font-medium text-primary hover:underline">
                All jobs
              </Link>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#5c6b64]">
              {start || end ? (
                <span>
                  {start ?? "—"} → {end ?? "—"}
                </span>
              ) : (
                <span>No dates set</span>
              )}
              {job.externalLink ? (
                <a
                  href={job.externalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  External link <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              {completed ? <span>Locked — reopen to edit quantities or pull items</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!completed ? (
              <>
                {job.status === "NOT_STARTED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startJob()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#d8dfdb] bg-white px-3 text-[12px] font-semibold text-[#3d4f47] hover:bg-[#f4f6f5]"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start job
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPullOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#d8dfdb] bg-white px-3 text-[12px] font-semibold text-[#3d4f47] hover:bg-[#f4f6f5]"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Pull items
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCompleteOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary-hover"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void reopenJob()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#d8dfdb] bg-white px-3 text-[12px] font-semibold text-[#3d4f47] hover:bg-[#f4f6f5]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen
              </button>
            )}
          </div>
        </div>
      </div>

      {completeOpen ? (
        <CompleteJobModal
          jobId={job.id}
          onClose={() => setCompleteOpen(false)}
          onDone={() => {
            setCompleteOpen(false);
            onChanged();
          }}
        />
      ) : null}
      {pullOpen ? (
        <PullItemsModal
          jobId={job.id}
          onClose={() => setPullOpen(false)}
          onDone={() => {
            setPullOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function CompleteJobModal({
  jobId,
  onClose,
  onDone,
}: {
  jobId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [leftover, setLeftover] = useState<"return" | "consume" | "leave">("return");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setPending(true);
    setError("");
    try {
      await api(`/api/v1/jobs/${jobId}/complete`, {
        method: "POST",
        body: JSON.stringify({ leftover }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete job");
      setPending(false);
    }
  }

  return (
    <Modal open title="Complete job" onClose={onClose}>
      <p className="mb-4 text-sm text-[#5c6b64]">
        Choose what to do with leftover quantities still in this job. The job record stays available and becomes locked.
      </p>
      <div className="space-y-2">
        {(
          [
            ["return", "Return unused items to their previous folders (or All Items)"],
            ["consume", "Consume leftover quantities (set to 0)"],
            ["leave", "Leave items in the job folder"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
              leftover === value ? "border-primary bg-primary-soft/50" : "border-[#e6ebe8]",
            )}
          >
            <input
              type="radio"
              name="leftover"
              checked={leftover === value}
              onChange={() => setLeftover(value)}
              className="mt-0.5"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={pending}>
          {pending ? "Completing…" : "Complete job"}
        </Button>
      </div>
    </Modal>
  );
}

type SearchItem = {
  id: string;
  name: string;
  quantity: number;
  folder?: { id: string; name: string } | null;
  unit?: { abbreviation: string } | null;
};

function PullItemsModal({
  jobId,
  onClose,
  onDone,
}: {
  jobId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [qty, setQty] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      api<{ items: SearchItem[] }>(`/api/v1/search?${params}`)
        .then((d) => setItems(d.items.filter((item) => item.quantity > 0).slice(0, 40)))
        .catch(() => setItems([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q]);

  async function pull() {
    if (!selected) return;
    setPending(true);
    setError("");
    try {
      await api(`/api/v1/jobs/${jobId}/pull`, {
        method: "POST",
        body: JSON.stringify({ itemId: selected.id, quantity: Number(qty) }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pull item");
      setPending(false);
    }
  }

  return (
    <Modal open title="Pull items into job" onClose={onClose} wide>
      <p className="mb-3 text-sm text-[#5c6b64]">Search inventory and move quantity into this job folder.</p>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa6a0]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
      </div>
      <div className="max-h-56 overflow-auto rounded-lg border border-[#e6ebe8]">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-[#8a9a93]">No matching items with quantity.</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelected(item);
                setQty(String(Math.min(1, item.quantity) || item.quantity));
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 border-b border-[#eef2f0] px-3 py-2.5 text-left text-sm last:border-0 hover:bg-[#f8faf9]",
                selected?.id === item.id && "bg-primary-soft/60",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-[#1c2b25]">{item.name}</span>
                <span className="text-[12px] text-[#8a9a93]">{item.folder?.name ?? "All Items"}</span>
              </span>
              <span className="shrink-0 text-[12px] text-[#5c6b64]">
                {item.quantity}
                {item.unit?.abbreviation ? ` ${item.unit.abbreviation}` : ""}
              </span>
            </button>
          ))
        )}
      </div>
      {selected ? (
        <div className="mt-4">
          <Field label={`Quantity to pull (max ${selected.quantity})`}>
            <Input
              type="number"
              min={0.0001}
              max={selected.quantity}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <button
            type="button"
            className="mt-1 text-sm text-primary"
            onClick={() => setQty(String(selected.quantity))}
          >
            Pull all
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void pull()} disabled={!selected || pending || Number(qty) <= 0}>
          {pending ? "Pulling…" : "Pull into job"}
        </Button>
      </div>
    </Modal>
  );
}
