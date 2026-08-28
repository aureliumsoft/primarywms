/**
 * Unauthenticated workflow smoke checks (no login required).
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  const r = await fetch(`${BASE}/api/v1/setup`);
  const setup = await r.json();
  check("setup complete", setup.setupComplete === true);

  const apis = [
    "/api/v1/jobs",
    "/api/v1/pick-lists",
    "/api/v1/purchase-orders",
    "/api/v1/stock-counts",
    "/api/v1/invoices",
  ];
  for (const path of apis) {
    const res = await fetch(`${BASE}${path}`);
    const data = await res.json().catch(() => ({}));
    check(`${path} requires auth`, res.status === 401 && data.error, `status ${res.status}`);
  }

  const pages = ["/workflows", "/jobs", "/pick-lists", "/purchase-orders", "/stock-counts", "/invoices"];
  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    check(`PAGE ${path} redirects unauthenticated`, res.status === 307, `status ${res.status}`);
  }

  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} unauthenticated checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
