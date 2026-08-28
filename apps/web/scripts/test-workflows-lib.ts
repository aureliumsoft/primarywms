/**
 * Direct lib + DB smoke test for workflow documents (no HTTP login).
 * Run from repo root: pnpm exec tsx apps/web/scripts/test-workflows-lib.ts
 */
import { prisma } from "@primarywms/db";
import type { RoleKind } from "@primarywms/db";
import { listJobs } from "../src/lib/jobs";
import { listPickLists, createPickList, getPickList } from "../src/lib/pick-lists";
import { listPurchaseOrders, createPurchaseOrder, getPurchaseOrder } from "../src/lib/purchase-orders";
import { listStockCounts, createStockCount, getStockCount } from "../src/lib/stock-counts";
import { listInvoices, createInvoice, getInvoice } from "../src/lib/invoices";

function authUserFrom(row: {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: { id: string; kind: string; name: string; permissions: unknown; hidePrices: boolean };
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    status: row.status as "ACTIVE",
    jobFunction: null,
    jobTitle: null,
    phone: null,
    roleId: row.role.id,
    role: {
      id: row.role.id,
      kind: row.role.kind as RoleKind,
      name: row.role.name,
      permissions: (row.role.permissions as Record<string, boolean>) ?? {},
      hidePrices: row.role.hidePrices,
    },
    defaultView: "GRID" as const,
    defaultSort: "UPDATED_AT",
    sortDirection: "DESC" as const,
    emailAlerts: true,
    poEmails: true,
    timezoneAuto: true,
    timezone: null,
    theme: "SYSTEM" as const,
  };
}

async function main() {
  const userRow = await prisma.user.findFirst({
    where: { status: "ACTIVE", passwordHash: { not: null } },
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });
  if (!userRow) {
    console.error("FAIL — no active user in database");
    process.exit(1);
  }
  const user = authUserFrom(userRow);
  const checks: { name: string; ok: boolean; detail?: string }[] = [];
  const pass = (name: string, ok: boolean, detail?: string) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  const jobs = await listJobs(user);
  pass("listJobs", Array.isArray(jobs));

  const plList = await listPickLists(user);
  pass("listPickLists", Array.isArray(plList.pickLists) && typeof plList.total === "number", `total=${plList.total}`);

  const pl = await createPickList(user);
  pass("createPickList", pl.number.startsWith("PL-") && pl.status === "DRAFT", pl.number);

  const plGet = await getPickList(user, pl.id);
  pass("getPickList", plGet.id === pl.id && plGet.lines.length === 0);

  const po = await createPurchaseOrder(user);
  pass("createPurchaseOrder", po.number.startsWith("PO-") && po.status === "DRAFT", po.number);
  pass("getPurchaseOrder", (await getPurchaseOrder(user, po.id)).id === po.id);

  const sc = await createStockCount(user);
  pass("createStockCount", sc.number.startsWith("SC-") && sc.itemCount === 0, sc.number);
  pass("getStockCount", (await getStockCount(user, sc.id)).lines.length === 0);

  const inv = await createInvoice(user);
  pass("createInvoice", inv.number.startsWith("IN-") && inv.status === "DRAFT", inv.number);
  pass("getInvoice", (await getInvoice(user, inv.id)).id === inv.id);

  const plList2 = await listPickLists(user, { page: 1, pageSize: 5 });
  pass("pickLists pagination", plList2.pickLists.length >= 1 && plList2.page === 1);

  // cleanup test drafts
  await prisma.pickListLine.deleteMany({ where: { pickListId: pl.id } });
  await prisma.pickList.delete({ where: { id: pl.id } });
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: po.id } });
  await prisma.purchaseOrder.delete({ where: { id: po.id } });
  await prisma.stockCountLine.deleteMany({ where: { stockCountId: sc.id } });
  await prisma.stockCount.delete({ where: { id: sc.id } });
  await prisma.invoiceLine.deleteMany({ where: { invoiceId: inv.id } });
  await prisma.invoice.delete({ where: { id: inv.id } });
  pass("cleanup test documents", true);

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} lib checks passed`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
