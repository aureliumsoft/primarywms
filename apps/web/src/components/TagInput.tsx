"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type TagRow = { id: string; name: string };

export function TagInput({
  value,
  onChange,
  placeholder = "Tags",
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [allTags, setAllTags] = useState<TagRow[]>([]);

  useEffect(() => {
    api<{ tags: TagRow[] }>("/api/v1/tags")
      .then((d) => setAllTags(d.tags))
      .catch(() => setAllTags([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(value.map((name) => name.toLowerCase()));
    return allTags.filter((tag) => tag.name.toLowerCase().includes(q) && !taken.has(tag.name.toLowerCase())).slice(0, 8);
  }, [allTags, draft, value]);

  function add(raw: string) {
    const next = raw.trim();
    if (!next) return;
    if (value.some((name) => name.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[#d8dfdb] px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((name) => name !== tag))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) add(draft);
          }}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1.5 text-sm outline-none placeholder:text-[#9aa6a0]"
        />
      </div>
      {suggestions.length ? (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-[#ecefee] bg-white py-1 shadow-lg">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-primary-soft" onMouseDown={() => add(tag.name)}>
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
