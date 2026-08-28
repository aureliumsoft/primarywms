"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Folder, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CustomFieldDef } from "@/lib/custom-field-values";
import { CreateCustomFieldModal } from "@/components/CreateCustomFieldModal";
import { cn } from "@/lib/cn";
import { SettingsCard, SettingsPage } from "@/components/settings/ui";

const SUGGESTED_JOB_SUBFOLDERS = ["Materials", "Tools", "Equipment"] as const;

export default function JobSettingsPage() {
  const [subfolders, setSubfolders] = useState<string[]>([""]);
  const [savedSubfolders, setSavedSubfolders] = useState<string[]>([""]);
  const [extraFieldIds, setExtraFieldIds] = useState<string[]>([]);
  const [savedExtraFieldIds, setSavedExtraFieldIds] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<CustomFieldDef[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  function applyLoaded(d: {
    defaultSubfolders: string[];
    extraFieldIds: string[];
    availableFields: CustomFieldDef[];
  }) {
    const folders = d.defaultSubfolders.length ? d.defaultSubfolders : [""];
    setSubfolders(folders);
    setSavedSubfolders(folders);
    setExtraFieldIds(d.extraFieldIds);
    setSavedExtraFieldIds(d.extraFieldIds);
    setAvailableFields(d.availableFields);
  }

  function load() {
    api<{
      defaultSubfolders: string[];
      extraFieldIds: string[];
      availableFields: CustomFieldDef[];
    }>("/api/v1/settings/jobs")
      .then(applyLoaded)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }

  useEffect(load, []);

  const dirty = useMemo(() => {
    const currentFolders = subfolders.map((name) => name.trim()).filter(Boolean);
    const savedFolders = savedSubfolders.map((name) => name.trim()).filter(Boolean);
    const foldersChanged =
      currentFolders.length !== savedFolders.length ||
      currentFolders.some((name, i) => name !== savedFolders[i]);
    const fieldsChanged =
      extraFieldIds.length !== savedExtraFieldIds.length ||
      extraFieldIds.some((id) => !savedExtraFieldIds.includes(id));
    return foldersChanged || fieldsChanged;
  }, [subfolders, savedSubfolders, extraFieldIds, savedExtraFieldIds]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const nextFolders = subfolders.map((name) => name.trim()).filter(Boolean);
      await api("/api/v1/settings/jobs", {
        method: "PATCH",
        body: JSON.stringify({
          defaultSubfolders: nextFolders,
          extraFieldIds,
        }),
      });
      setSubfolders(nextFolders.length ? nextFolders : [""]);
      setSavedSubfolders(nextFolders.length ? nextFolders : [""]);
      setSavedExtraFieldIds(extraFieldIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  function discard() {
    setSubfolders(savedSubfolders.length ? [...savedSubfolders] : [""]);
    setExtraFieldIds([...savedExtraFieldIds]);
    setError("");
  }

  function useSuggested() {
    setSubfolders([...SUGGESTED_JOB_SUBFOLDERS]);
  }

  function toggleField(id: string) {
    setExtraFieldIds((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  }

  return (
    <SettingsPage title="Job Settings" subtitle="Defaults applied to every new job your team creates.">
      <form onSubmit={save} className="max-w-3xl space-y-5">
        <SettingsCard>
          <h2 className="text-[18px] font-semibold text-[#1c2b25]">Additional fields</h2>
          <p className="mt-1 text-[14px] text-[#6b7c74]">The additional fields will apply to every new job your team creates.</p>
          <div className="mt-4 space-y-2">
            {availableFields.length === 0 ? (
              <p className="text-[13px] text-[#8a9a93]">No folder custom fields yet.</p>
            ) : (
              availableFields.map((field) => (
                <label key={field.id} className="flex items-center gap-3 rounded-lg border border-[#eef2f0] px-3 py-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    checked={extraFieldIds.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                    className="h-4 w-4 rounded border-[#cfd6d2] text-primary focus:ring-primary"
                  />
                  <span className="font-medium text-[#2a3a33]">{field.name}</span>
                  <span className="text-[12px] text-[#8a9a93]">{field.type.replaceAll("_", " ").toLowerCase()}</span>
                </label>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom field
          </button>
        </SettingsCard>

        <SettingsCard>
          <h2 className="text-[18px] font-semibold text-[#1c2b25]">Custom subfolders</h2>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-[#6b7c74]">
            These subfolders apply to every new job your team creates. Customize anytime to match how your team works.
          </p>
          <button type="button" onClick={useSuggested} className="mt-3 text-[13px] font-bold uppercase tracking-wide text-primary hover:underline">
            Use suggested subfolders
          </button>
          <p className="mt-1 text-[12px] text-[#8a9a93]">Fills {SUGGESTED_JOB_SUBFOLDERS.join(", ")}.</p>

          <div className="mt-5 space-y-4">
            {subfolders.map((name, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  {name.trim() ? (
                    <span className="absolute -top-2 left-3 z-[1] bg-white px-1 text-[11px] text-[#8a9a93]">Subfolder name</span>
                  ) : null}
                  <div
                    className={cn(
                      "flex h-12 items-center gap-2 rounded-md border border-[#d8dfdb] px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
                      name.trim() && "pt-0.5",
                    )}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-[#9aa6a0]" strokeWidth={1.75} />
                    <input
                      value={name}
                      onChange={(e) => setSubfolders((prev) => prev.map((row, i) => (i === index ? e.target.value : row)))}
                      placeholder="Add subfolder name"
                      className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#2a3a33] outline-none placeholder:text-[#9aa6a0]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove subfolder"
                  onClick={() => setSubfolders((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)))}
                  className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md text-[#8a9a93] hover:bg-[#f4f6f5] hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSubfolders((prev) => [...prev, ""])}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add subfolder
          </button>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={pending || !dirty}
              className="h-11 rounded-md bg-primary px-6 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={!dirty || pending}
              onClick={discard}
              className="text-[13px] font-bold uppercase tracking-wide text-[#5c6b64] hover:text-[#1c2b25] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Discard
            </button>
          </div>
        </SettingsCard>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>

      <CreateCustomFieldModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(field) => {
          if (field.appliesTo === "ITEM") return;
          setAvailableFields((prev) => [...prev, field as CustomFieldDef]);
          setExtraFieldIds((prev) => [...prev, field.id]);
          setCreateOpen(false);
        }}
      />
    </SettingsPage>
  );
}
