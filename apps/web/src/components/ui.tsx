"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "nav";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-wide uppercase transition disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "h-8 px-3 text-[11px]",
        size === "md" && "h-10 px-4 text-xs",
        size === "lg" && "h-12 px-5 text-sm",
        variant === "primary" && "bg-primary text-white hover:bg-primary-hover shadow-sm",
        variant === "secondary" && "bg-white text-foreground border border-border hover:bg-primary-soft",
        variant === "ghost" && "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        variant === "nav" && "bg-transparent text-nav-text hover:bg-nav-hover",
        className,
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
});

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-semibold text-muted-foreground", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6 pt-16">
      <div className={cn("w-full rounded-2xl bg-white shadow-[var(--shadow)]", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
