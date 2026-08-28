/**
 * Smoke-test Workflows module against localhost:3000.
 * Usage: node scripts/smoke-workflows.mjs [email] [password]
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.argv[2] ?? process.env.SMOKE_EMAIL;
const password = process.argv[3] ?? process.env.SMOKE_PASSWORD;

if (!email || !password) {
  console.error("Usage: node scripts/smoke-workflows.mjs <email> <password>");
  process.exit(1);
}

const jar = new Map();

function parseSetCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path, body) {
  const init = {
    method,
    headers: { Cookie: cookieHeader(), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE}${path}`, init);
  parseSetCookie(res);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  let r = await req("POST", "/api/v1/auth/login", { email, password });
  check("login", r.status === 200, `status ${r.status}`);

  const listEndpoints = [
    ["GET", "/api/v1/jobs"],
    ["GET", "/api/v1/pick-lists"],
    ["GET", "/api/v1/purchase-orders"],
    ["GET", "/api/v1/stock-counts"],
    ["GET", "/api/v1/invoices"],
  ];

  for (const [method, path] of listEndpoints) {
    r = await req(method, path);
    const key = path.split("/").pop();
    const hasArray =
      r.status === 200 &&
      r.data &&
      (Array.isArray(r.data.jobs) ||
        Array.isArray(r.data.pickLists) ||
        Array.isArray(r.data.purchaseOrders) ||
        Array.isArray(r.data.stockCounts) ||
        Array.isArray(r.data.invoices));
    check(`${method} ${path}`, hasArray, `status ${r.status}`);
  }

  const created = {};
  r = await req("POST", "/api/v1/pick-lists");
  check("POST /api/v1/pick-lists", r.status === 201 && r.data?.pickList?.id, r.data?.pickList?.number ?? `status ${r.status}`);
  if (r.data?.pickList?.id) created.pickList = r.data.pickList.id;

  r = await req("POST", "/api/v1/purchase-orders");
  check("POST /api/v1/purchase-orders", r.status === 201 && r.data?.purchaseOrder?.id, r.data?.purchaseOrder?.number ?? `status ${r.status}`);
  if (r.data?.purchaseOrder?.id) created.po = r.data.purchaseOrder.id;

  r = await req("POST", "/api/v1/stock-counts");
  check("POST /api/v1/stock-counts", r.status === 201 && r.data?.stockCount?.id, r.data?.stockCount?.number ?? `status ${r.status}`);
  if (r.data?.stockCount?.id) created.stockCount = r.data.stockCount.id;

  r = await req("POST", "/api/v1/invoices");
  check("POST /api/v1/invoices", r.status === 201 && r.data?.invoice?.id, r.data?.invoice?.number ?? `status ${r.status}`);
  if (r.data?.invoice?.id) created.invoice = r.data.invoice.id;

  if (created.pickList) {
    r = await req("GET", `/api/v1/pick-lists/${created.pickList}`);
    check("GET pick-list detail", r.status === 200 && r.data?.pickList?.number?.startsWith("PL-"), r.data?.pickList?.number);
  }
  if (created.po) {
    r = await req("GET", `/api/v1/purchase-orders/${created.po}`);
    check("GET PO detail", r.status === 200 && r.data?.purchaseOrder?.number?.startsWith("PO-"), r.data?.purchaseOrder?.number);
  }
  if (created.stockCount) {
    r = await req("GET", `/api/v1/stock-counts/${created.stockCount}`);
    check("GET stock count detail", r.status === 200 && r.data?.stockCount?.number?.startsWith("SC-"), r.data?.stockCount?.number);
  }
  if (created.invoice) {
    r = await req("GET", `/api/v1/invoices/${created.invoice}`);
    check("GET invoice detail", r.status === 200 && r.data?.invoice?.number?.startsWith("IN-"), r.data?.invoice?.number);
  }

  r = await req("GET", "/api/v1/pick-lists?page=1&pageSize=10");
  check("pick-lists pagination", r.status === 200 && typeof r.data?.total === "number", `total=${r.data?.total}`);

  const pages = [
    "/workflows",
    "/jobs",
    "/jobs/new",
    "/pick-lists",
    "/purchase-orders",
    "/stock-counts",
    "/invoices",
  ];
  if (created.pickList) pages.push(`/pick-lists/${created.pickList}`);
  if (created.po) pages.push(`/purchase-orders/${created.po}`);
  if (created.stockCount) pages.push(`/stock-counts/${created.stockCount}`);
  if (created.invoice) pages.push(`/invoices/${created.invoice}`);

  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader() }, redirect: "manual" });
    const ok = res.status === 200;
    check(`PAGE ${path}`, ok, `status ${res.status}`);
  }

  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed:`);
    for (const f of failed) console.error(`  - ${f.name}`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} workflow checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
