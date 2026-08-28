import {
  ArrowLeftRight,
  BarChart3,
  Bookmark,
  Clock,
  FolderInput,
  Layers,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ReportDef = {
  href: string;
  title: string;
  body: string;
  hub: string;
  type: string;
  icon: LucideIcon;
  nested?: boolean;
  parent?: string;
};

export const REPORTS: ReportDef[] = [
  {
    href: "/activity-history",
    title: "Activity History",
    body: "Keep tabs on all users' changes to items, folders, tags, & more.",
    hub: "Creates, edits, moves, quantity changes, and deletes.",
    type: "activity",
    icon: Clock,
  },
  {
    href: "/reports/inventory-summary",
    title: "Inventory Summary",
    body: "Review your inventory's quantity, value, & location at a glance.",
    hub: "Quantity and value by item and folder location.",
    type: "inventory-summary",
    icon: Layers,
  },
  {
    href: "/reports/low-stock",
    title: "Low Stock",
    body: "Items at or below their min level.",
    hub: "Items at or below their min level.",
    type: "low-stock",
    icon: Bookmark,
    nested: true,
    parent: "/reports/inventory-summary",
  },
  {
    href: "/reports/transactions",
    title: "Transactions",
    body: "Monitor all inventory movements, updates, and deletions for efficient team oversight.",
    hub: "Quantity-affecting ledger with reasons and notes.",
    type: "transactions",
    icon: ArrowLeftRight,
  },
  {
    href: "/reports/item-flow",
    title: "Item Flow",
    body: "Track quantity fluctuations for your inventory using flexible filtering.",
    hub: "Increases, decreases, and net change by item.",
    type: "item-flow",
    icon: BarChart3,
  },
  {
    href: "/reports/move-summary",
    title: "Move Summary",
    body: "Monitor all inventory folder changes that occur within a specified time.",
    hub: "Transfers grouped by source folder.",
    type: "move-summary",
    icon: FolderInput,
  },
  {
    href: "/reports/user-activity",
    title: "User Activity Summary",
    body: "Track how team members interact with your inventory & filter for actions.",
    hub: "Counts of actions per user.",
    type: "user-activity",
    icon: Users,
  },
  {
    href: "/reports/quantity-change",
    title: "Quantity Change by Item",
    body: "Net quantity delta per item in a date range.",
    hub: "Net quantity delta per item in a date range.",
    type: "quantity-change",
    icon: BarChart3,
    nested: true,
    parent: "/reports/item-flow",
  },
];

export const HUB_CARDS = REPORTS.filter((r) => !r.nested);
