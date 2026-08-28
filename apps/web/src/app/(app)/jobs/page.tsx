"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, Search } from "lucide-react";
import { api } from "@/lib/api";
import { JobsSkeleton } from "@/components/skeletons";
import { WorkflowEmpty, WorkflowHeader, WorkflowStatusBadge } from "@/components/workflows/WorkflowChrome";
import { WorkflowsShell } from "@/components/workflows/WorkflowsShell";
import { formatWorkflowDate } from "@/components/workflows/defs";

type JobRow = {
  id: string;
  folderId: string;
  number: string;
  startDate: string | null;
  endDate: string | null;
  externalLink: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
};

const STATUS_LABEL: Record<JobRow["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (showCompleted) params.set("completed", "1");
    if (q.trim()) params.set("q", q.trim());
    api<{ jobs: JobRow[] }>(`/api/v1/jobs?${params}`)
      .then((d) => setJobs(d.jobs))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load jobs"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showCompleted]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return jobs;
    return jobs.filter(
      (job) =>
        job.number.toLowerCase().includes(needle) ||
        (job.createdBy?.name ?? "").toLowerCase().includes(needle),
    );
  }, [jobs, q]);

  return (
    <WorkflowsShell>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <WorkflowHeader
          title="Jobs"
          subtitle="Track ongoing jobs and projects in one place. Create jobs, pull in items, and keep your team updated on progress."
          newHref="/jobs/new"
          newLabel="New job"
          settingsHref="/settings/job-settings"
        />
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e6ebe8] px-8 py-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa6a0]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jobs"
              className="h-10 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#5c6b64]">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-4 w-4 rounded border-[#cfd6d2] text-primary focus:ring-primary"
            />
            Show completed
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {error ? <p className="p-8 text-sm text-danger">{error}</p> : null}
          {loading ? <JobsSkeleton /> : null}
          {!loading && !error && filtered.length === 0 ? (
            <WorkflowEmpty
              icon={Briefcase}
              title="Create your first job"
              body="Add the job details and pull in items when you're ready. Each job creates a dedicated job folder under All Items."
              ctaHref="/jobs/new"
              ctaLabel="Create your first job"
            />
          ) : null}
          {!loading && filtered.length > 0 ? (
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#f7f8f8] text-[11px] font-semibold uppercase tracking-wide text-[#8a9a93]">
                <tr>
                  <th className="px-8 py-3 font-semibold">Job #</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Start</th>
                  <th className="px-4 py-3 font-semibold">End</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold">Created by</th>
                  <th className="px-8 py-3 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id} className="border-t border-[#eef2f0] hover:bg-[#f8faf9]">
                    <td className="px-8 py-3.5">
                      <Link href={`/folder/${job.folderId}/content`} className="font-semibold text-primary hover:underline">
                        {job.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <WorkflowStatusBadge
                        label={STATUS_LABEL[job.status]}
                        tone={job.status === "COMPLETED" ? "complete" : job.status === "IN_PROGRESS" ? "active" : "draft"}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(job.startDate)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(job.endDate)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{formatWorkflowDate(job.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-[#5c6b64]">{job.createdBy?.name ?? "—"}</td>
                    <td className="px-8 py-3.5">
                      {job.externalLink ? (
                        <a href={job.externalLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </WorkflowsShell>
  );
}
