"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SettingsCard, SettingsPage } from "@/components/settings/ui";
import { Button } from "@/components/ui";

type Shared = {
  id: string;
  name: string;
  kind: string;
  publicUrl: string | null;
  shareToken: string;
  createdAt: string;
  sizeBytes: number | null;
};

export default function FilesPage() {
  const [files, setFiles] = useState<Shared[]>([]);
  const [supabase, setSupabase] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function load() {
    const data = await api<{ files: Shared[]; supabase: boolean }>("/api/v1/files");
    setFiles(data.files);
    setSupabase(data.supabase);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Could not load files"));
  }, []);

  function shareUrl(token: string) {
    return `${window.location.origin}/share/${token}`;
  }

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/v1/files", { method: "POST", body: form, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      input.value = "";
      await load();
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(data.file.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage title="Shared Files" subtitle="Upload images or PDFs and share a public link. Recipients do not need a Primary WMS login.">
      <div className="max-w-2xl space-y-6">
        <SettingsCard>
          <p className="text-sm text-muted-foreground">
            Upload images or PDFs to Supabase. Anyone with the link can open the file — they do not need a Primary WMS login.
          </p>
          {supabase === false ? (
            <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Supabase is not configured yet. Set <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>, and{" "}
              <code>SUPABASE_STORAGE_BUCKET</code> in <code>apps/web/.env</code>, then restart the server. Files will
              still save locally until then.
            </p>
          ) : supabase ? (
            <p className="mt-3 text-sm font-medium text-primary">Connected to Supabase Storage.</p>
          ) : null}
          <form onSubmit={onUpload} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="file" name="file" accept="image/*,application/pdf" required className="text-sm" />
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Upload & copy link"}
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </SettingsCard>

        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-xs uppercase text-muted-foreground">{file.kind}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl(file.shareToken));
                    setCopied(file.id);
                  }}
                >
                  {copied === file.id ? "Copied" : "Copy link"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    await api(`/api/v1/files?id=${file.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {files.length === 0 ? <p className="text-sm text-[#8a9a93]">No shared files yet.</p> : null}
        </div>
      </div>
    </SettingsPage>
  );
}
