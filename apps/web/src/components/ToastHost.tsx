"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dismiss, subscribeToasts, type ToastItem } from "@/lib/toast";

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(100vw-2rem,360px)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-[0_12px_32px_rgb(16_24_20/0.16)]",
            item.kind === "success" && "border-primary/25",
            item.kind === "error" && "border-[#f0c4c4]",
            item.kind === "info" && "border-[#e6ebe8]",
          )}
          role="status"
        >
          {item.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          ) : item.kind === "error" ? (
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#e24b4b]" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#6b7c74]" />
          )}
          <p
            className={cn(
              "min-w-0 flex-1 text-[14px] leading-snug",
              item.kind === "error" ? "text-[#9a2f2f]" : "text-[#2a3a33]",
            )}
          >
            {item.message}
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(item.id)}
            className="shrink-0 text-[#9aa6a0] hover:text-[#3d4f47]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
