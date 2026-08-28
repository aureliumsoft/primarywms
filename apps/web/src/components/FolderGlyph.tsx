"use client";

import { Briefcase, Folder, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function isFolderPopulated(folder: {
  _count?: { items?: number; children?: number } | null;
}): boolean {
  const items = folder._count?.items ?? 0;
  const children = folder._count?.children ?? 0;
  return items > 0 || children > 0;
}

type FolderGlyphProps = {
  populated?: boolean;
  selected?: boolean;
  kind?: "ITEM" | "JOB";
  /** Root / All Items uses the inbox glyph. */
  root?: boolean;
  /** `onDark` for photo placeholders on gray covers. */
  tone?: "default" | "onDark" | "muted";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-[42%] w-[42%]",
} as const;

/**
 * Folder states used across sidebar, pickers, table, and cards:
 * - empty: outline
 * - populated: solid fill
 * - selected: solid primary fill
 */
export function FolderGlyph({
  populated = false,
  selected = false,
  kind = "ITEM",
  root = false,
  tone = "default",
  className,
  size = "md",
}: FolderGlyphProps) {
  const dim = SIZE[size];
  const filled = selected || populated;

  const color =
    tone === "onDark"
      ? selected
        ? "fill-primary text-primary"
        : filled
          ? "fill-white text-white"
          : "fill-none text-white"
      : tone === "muted"
        ? selected
          ? "fill-primary text-primary"
          : filled
            ? "fill-[#c5c5c5] text-[#c5c5c5]"
            : "fill-none text-[#c5c5c5]"
        : selected
          ? "fill-primary text-primary"
          : filled
            ? "fill-[#9aa6a0] text-[#9aa6a0]"
            : "fill-none text-[#7a8b84]";

  if (root) {
    return <Inbox className={cn(dim, "shrink-0", color, className)} strokeWidth={1.5} />;
  }

  if (kind === "JOB") {
    return <Briefcase className={cn(dim, "shrink-0", color, className)} strokeWidth={1.5} />;
  }

  return <Folder className={cn(dim, "shrink-0", color, className)} strokeWidth={1.5} />;
}
