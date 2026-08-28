"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Search,
  Tags,
  Workflow,
  BarChart3,
  Bell,
  CircleHelp,
  Settings,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/items", label: "Items", icon: Package },
  { href: "/advanced-search", label: "Search", icon: Search },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/help", label: "Help", icon: CircleHelp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export type ShellOrg = {
  name: string;
  initials: string;
  accentColor: string;
  logoKey?: string | null;
};

export type ShellUser = {
  firstName: string;
  lastName: string;
  role: { name: string; kind: string };
};

export function AppShell({
  org,
  user,
  children,
  folderPane,
}: {
  org: ShellOrg;
  user: ShellUser;
  children: React.ReactNode;
  folderPane?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const data = await api<{ unread: number }>("/api/v1/notifications?summary=1", { toast: false });
        if (!cancelled) setUnread(data.unread ?? 0);
      } catch {
        if (!cancelled) setUnread(0);
      }
    }
    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  async function logout() {
    await api("/api/v1/auth/logout", { method: "POST", toast: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-[72px] shrink-0 flex-col bg-nav text-nav-text xl:w-[220px]">
        <div className="flex h-16 items-center justify-center gap-3 px-3 xl:justify-start">
          {org.logoKey ? (
            <img src="/api/v1/org/logo" alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: org.accentColor }}
            >
              {org.initials}
            </div>
          )}
          <div className="hidden min-w-0 xl:block">
            <div className="truncate text-sm font-semibold text-white">{org.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-nav-text/70">Primary WMS</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
          {NAV.filter((item) => user.role.kind !== "SCANNER" || item.href !== "/reports").map((item) => {
            const active =
              item.href === "/items"
                ? pathname.startsWith("/items") ||
                  pathname.startsWith("/folder") ||
                  pathname.startsWith("/item") ||
                  pathname.startsWith("/add-folder")
                : item.href === "/workflows"
                  ? pathname.startsWith("/workflows") ||
                    pathname.startsWith("/jobs") ||
                    pathname.startsWith("/pick-lists") ||
                    pathname.startsWith("/purchase-orders") ||
                    pathname.startsWith("/stock-counts") ||
                    pathname.startsWith("/invoices")
                : item.href === "/reports"
                  ? pathname.startsWith("/reports") || pathname.startsWith("/activity-history")
                : item.href === "/settings"
                  ? pathname.startsWith("/settings") ||
                    pathname.startsWith("/trash") ||
                    pathname.startsWith("/manage-custom-attributes")
                  : pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge = item.href === "/notifications" && unread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm transition xl:justify-start",
                  active ? "bg-primary text-white" : "hover:bg-nav-hover",
                )}
              >
                <span className="relative shrink-0">
                  <Icon className="h-[18px] w-[18px]" />
                  {showBadge ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e24b4b] px-1 text-[9px] font-bold leading-none text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </span>
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mb-3 mx-2 flex h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm hover:bg-nav-hover xl:justify-start"
          title="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span className="hidden xl:inline">Log out</span>
        </button>
      </aside>
      {folderPane}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  actions,
  crumbs,
}: {
  title: string;
  actions?: React.ReactNode;
  crumbs?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <div>
        {crumbs}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
