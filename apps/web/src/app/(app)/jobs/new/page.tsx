"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { CustomFieldControl } from "@/components/CustomFieldControl";
import {
  defaultsFromFields,
  toCustomValuePayloads,
  validateFieldValue,
  type CustomFieldDef,
} from "@/lib/custom-field-values";

export default function NewJobPage() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [extraFields, setExtraFields] = useState<CustomFieldDef[]>([]);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{
      extraFields: CustomFieldDef[];
    }>("/api/v1/settings/jobs")
      .then((d) => {
        setExtraFields(d.extraFields);
        setCustom(defaultsFromFields(d.extraFields));
      })
      .catch(() => null);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!number.trim()) {
      setError("Job number is required");
      return;
    }
    for (const field of extraFields) {
      try {
        validateFieldValue(field, custom[field.id] ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Check custom fields");
        return;
      }
    }
    setPending(true);
    setError("");
    try {
      const result = await api<{ job: { folderId: string } }>("/api/v1/jobs", {
        method: "POST",
        body: JSON.stringify({
          number: number.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
          notes: notes.trim() || null,
          externalLink: externalLink.trim() || null,
          customValues: toCustomValuePayloads(extraFields, custom),
        }),
      });
      router.push(`/folder/${result.job.folderId}/content`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create job");
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f7f8f8]">
      <header className="border-b border-[#e6ebe8] bg-white px-8 pb-5 pt-7">
        <p className="mb-1 text-[13px] text-[#8a9a93]">
          <Link href="/workflows" className="hover:text-primary">
            Workflows
          </Link>
          <span className="mx-1.5">›</span>
          <Link href="/jobs" className="hover:text-primary">
            Jobs
          </Link>
          <span className="mx-1.5">›</span>
          New
        </p>
        <h1 className="text-[28px] font-bold tracking-tight text-[#1c2b25]">New job</h1>
        <p className="mt-1 max-w-xl text-[14px] text-[#6b7c74]">
          Creating a job automatically creates a dedicated job folder under All Items. Dates are for reference only.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl space-y-5 p-8">
        <div className="rounded-xl border border-[#e6ebe8] bg-white p-6 shadow-sm">
          <Field label="Job number *">
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. JOB-000001" required />
          </Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="External link">
              <Input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </Field>
          </div>
          {extraFields.length ? (
            <div className="mt-6 space-y-4 border-t border-[#eef2f0] pt-5">
              <h2 className="text-[12px] font-bold uppercase tracking-wide text-[#8a9a93]">Additional fields</h2>
              {extraFields.map((field) => (
                <Field key={field.id} label={field.name}>
                  <CustomFieldControl
                    field={field}
                    value={custom[field.id] ?? ""}
                    onChange={(next) => setCustom((prev) => ({ ...prev, [field.id]: next }))}
                  />
                </Field>
              ))}
            </div>
          ) : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push("/jobs")}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create job"}
          </Button>
        </div>
      </form>
    </div>
  );
}
