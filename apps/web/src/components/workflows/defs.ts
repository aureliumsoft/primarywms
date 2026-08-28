import { Briefcase, ClipboardList, FileText, Hash, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkflowDef = {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
  badge?: string;
};

export const WORKFLOWS: WorkflowDef[] = [
  {
    href: "/jobs",
    title: "Jobs",
    body: "Track jobs, log items used, and keep your team updated on progress.",
    icon: Briefcase,
    badge: "New",
  },
  {
    href: "/pick-lists",
    title: "Pick Lists",
    body: "Request items for pickup, assign them to your team, and update quantities automatically.",
    icon: ClipboardList,
  },
  {
    href: "/purchase-orders",
    title: "Purchase Orders",
    body: "Simplify procurement and track orders from request through receipt.",
    icon: ShoppingCart,
  },
  {
    href: "/invoices",
    title: "Invoices",
    body: "Generate invoices from inventory usage and track payment status.",
    icon: FileText,
  },
  {
    href: "/stock-counts",
    title: "Stock Counts",
    body: "Verify inventory on hand and keep quantities accurate.",
    icon: Hash,
    badge: "New",
  },
];

export const PICK_LIST_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  READY_TO_PICK: "Ready to Pick",
  IN_PROGRESS: "In Progress",
  PARTIALLY_COMPLETE: "Partially Complete",
  COMPLETE: "Complete",
};

export const PO_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for Review",
  APPROVED: "Approved",
  ORDERED: "Ordered",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  VOIDED: "Voided",
  CLOSED: "Closed",
};

export const STOCK_COUNT_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  READY_TO_COUNT: "Ready to Count",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETE: "Complete",
  VOIDED: "Voided",
};

export const INVOICE_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  OVERDUE: "Overdue",
  PAID: "Paid",
};

export function formatWorkflowDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatMoney(value: number, currency = "GBP") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `£${value.toFixed(2)}`;
  }
}
