"use client";

import { Ban } from "lucide-react";
import { cn } from "@/lib/cn";

export function SettingsPage({
  title,
  subtitle,
  actions,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="px-8 py-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#1c2b25]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-[14px] text-[#6b7c74]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className={cn(wide ? "max-w-5xl" : "max-w-3xl")}>{children}</div>
    </div>
  );
}

export function SettingsCard({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-[#e6ebe8] bg-white p-6 shadow-sm", className)}>
      {title ? <h2 className="mb-5 text-[15px] font-semibold text-[#6b7c74]">{title}</h2> : null}
      {children}
    </section>
  );
}

export function SettingsSave({ disabled, pending, children = "Save changes" }: { disabled?: boolean; pending?: boolean; children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-5 h-11 rounded-md border border-[#d8dfdb] bg-white px-5 text-[13px] font-bold uppercase tracking-wide text-[#3d4f47] hover:bg-[#f4f6f5] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function SettingsField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] text-[#8a9a93]">{label}</span>
      {children}
    </label>
  );
}

export function settingsInputClass(extra?: string) {
  return cn(
    "h-11 w-full rounded-md border border-[#d8dfdb] bg-white px-3 text-[14px] text-[#2a3a33] outline-none placeholder:text-[#9aa6a0] focus:border-primary focus:ring-2 focus:ring-primary/20",
    extra,
  );
}

export function SettingsSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        {label ? <div className="text-[15px] font-medium text-[#1c2b25]">{label}</div> : null}
        {description ? <p className="mt-0.5 text-[13px] text-[#6b7c74]">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-[#d8dfdb]")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
      <Ban className="h-16 w-16 text-[#8a9a93]" strokeWidth={1.25} />
      <h1 className="mt-5 text-[28px] font-bold tracking-tight text-[#1c2b25]">Access Denied</h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6b7c74]">
        {message ??
          "You don't have permissions to view or edit this screen. Only users with Owner access can view and edit on this page. Please reach out to the Owner(s) of the account to make this change."}
      </p>
    </div>
  );
}

export function PrimaryAddButton({ children, onClick, type = "button" }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover"
    >
      {children}
    </button>
  );
}

export function SettingsTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-[#e6ebe8]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "-mb-px border-b-2 pb-3 text-[14px] font-medium transition",
            active === tab.id ? "border-primary text-primary" : "border-transparent text-[#6b7c74] hover:text-[#1c2b25]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e6ebe8] bg-white shadow-sm">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function SettingsTh({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#8a9a93]", className)}>
      {children}
    </th>
  );
}

export function SettingsAddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 border-t border-[#eef2f0] px-4 py-3 text-[13px] font-medium text-primary hover:bg-[#f7f8f8]"
    >
      <span className="text-lg leading-none">+</span>
      {label}
    </button>
  );
}

export function SettingsEmpty({ message }: { message: string }) {
  return <p className="px-4 py-16 text-center text-[14px] text-[#8a9a93]">{message}</p>;
}
