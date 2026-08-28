"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  Building2,
  FileStack,
  ListChecks,
  Ruler,
  SlidersHorizontal,
  Upload,
  User,
  Users,
  History,
  QrCode,
  Zap,
  DatabaseBackup,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";

type NavItem = {
  href: string;
  label: string;
  icon: typeof User;
  match?: string[];
  hideForScanner?: boolean;
  ownerTools?: boolean;
  dividerBefore?: boolean;
};

const NAV: NavItem[] = [
  { href: "/settings/profile", label: "User Profile", icon: User },
  { href: "/settings/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/settings/custom-fields", label: "Custom Fields", icon: ListChecks, match: ["/settings/custom-fields", "/manage-custom-attributes"], hideForScanner: true, dividerBefore: true },
  { href: "/settings/job-settings", label: "Job Settings", icon: Briefcase },
  { href: "/settings/reasons", label: "Transaction Reasons", icon: History },
  { href: "/settings/units", label: "Units of Measure", icon: Ruler },
  { href: "/settings/alerts", label: "Manage Alerts", icon: Bell, hideForScanner: true },
  { href: "/settings/import", label: "Bulk Import", icon: Upload, hideForScanner: true },
  { href: "/settings/backup", label: "Data Backup", icon: DatabaseBackup, hideForScanner: true },
  { href: "/settings/feature-controls", label: "Feature Controls", icon: Zap },
  { href: "/settings/labels", label: "Create Labels", icon: QrCode },
  { href: "/settings/company", label: "Company Details", icon: Building2, hideForScanner: true, ownerTools: true, dividerBefore: true },
  { href: "/settings/team", label: "Manage Team", icon: Users, hideForScanner: true, ownerTools: true },
  { href: "/settings/files", label: "Shared Files", icon: FileStack },
];

export function SettingsChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [roleKind, setRoleKind] = useState<string>("");
  useEffect(() => {
    api<{ user: { role: { kind: string } } }>("/api/v1/auth/me")
      .then((d) => setRoleKind(d.user.role.kind))
      .catch(() => undefined);
  }, []);
  const scanner = roleKind === "SCANNER";
  const ownerToolsVisible = roleKind === "SUPER_ADMIN" || roleKind === "ADMIN";
  const items = NAV.filter((item) => {
    if (scanner && item.hideForScanner) return false;
    if (item.ownerTools && !ownerToolsVisible) return false;
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-1">
      <aside className="w-[248px] shrink-0 overflow-y-auto border-r border-[#e6ebe8] bg-[#f7f8f8]">
        <h2 className="px-5 pb-3 pt-5 text-[22px] font-semibold tracking-tight text-[#2a3a33]">Settings</h2>
        <nav className="px-2 pb-8">
          {items.map((item) => {
            const Icon = item.icon;
            const prefixes = item.match ?? [item.href];
            const active = prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
            return (
              <div key={item.href}>
                {item.dividerBefore ? <div className="mx-3 my-2 border-t border-[#e6ebe8]" /> : null}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition",
                    active ? "bg-primary-soft font-medium text-primary" : "text-[#4a5c54] hover:bg-white hover:text-[#2a3a33]",
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-[#7a8b84]")} strokeWidth={1.75} />
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto bg-[#f4f6f5]">{children}</div>
    </div>
  );
}
