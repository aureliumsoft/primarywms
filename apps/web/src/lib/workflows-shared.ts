import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan } from "./auth";

export function formatUserName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim() || null;
}

export function formatAddress(shipTo: unknown) {
  if (!shipTo || typeof shipTo !== "object") return "—";
  const row = shipTo as Record<string, string | undefined>;
  const parts = [row.name, row.line1, row.city, row.region, row.postal, row.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export async function nextDocumentNumber(organizationId: string, prefix: string, model: "pickList" | "purchaseOrder" | "stockCount" | "invoice") {
  const count =
    model === "pickList"
      ? await prisma.pickList.count({ where: { organizationId } })
      : model === "purchaseOrder"
        ? await prisma.purchaseOrder.count({ where: { organizationId } })
        : model === "stockCount"
          ? await prisma.stockCount.count({ where: { organizationId } })
          : await prisma.invoice.count({ where: { organizationId } });
  for (let i = count + 1; i < count + 1000; i += 1) {
    const number = `${prefix}-${String(i).padStart(6, "0")}`;
    const exists =
      model === "pickList"
        ? await prisma.pickList.findUnique({ where: { organizationId_number: { organizationId, number } } })
        : model === "purchaseOrder"
          ? await prisma.purchaseOrder.findUnique({ where: { organizationId_number: { organizationId, number } } })
          : model === "stockCount"
            ? await prisma.stockCount.findUnique({ where: { organizationId_number: { organizationId, number } } })
            : await prisma.invoice.findUnique({ where: { organizationId_number: { organizationId, number } } });
    if (!exists) return number;
  }
  return `${prefix}-${Date.now()}`;
}

export function assertWorkflowAccess(user: AuthUser) {
  assertCan(user, "update_quantity");
}

export type ListQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: string;
};

export function paginate(page?: number, pageSize?: number) {
  const p = Math.max(1, page ?? 1);
  const size = Math.min(100, Math.max(1, pageSize ?? 20));
  return { page: p, pageSize: size, skip: (p - 1) * size, take: size };
}
