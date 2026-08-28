/**
 * Smoke-test Settings + Notifications APIs against localhost:3000.
 * Usage: node scripts/smoke-settings.mjs [email] [password]
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.argv[2] ?? process.env.SMOKE_EMAIL;
const password = process.argv[3] ?? process.env.SMOKE_PASSWORD;

if (!email || !password) {
  console.error("Usage: node scripts/smoke-settings.mjs <email> <password>");
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
  const check = (name, status, expect = 200) => {
    const ok = status === expect;
    results.push({ name, ok, status, expect });
    console.log(`${ok ? "PASS" : "FAIL"} ${name} (${status}${expect !== status ? ` expected ${expect}` : ""})`);
  };

  let r = await req("POST", "/api/v1/auth/login", { email, password });
  check("login", r.status, 200);

  const endpoints = [
    ["GET", "/api/v1/auth/me"],
    ["GET", "/api/v1/org"],
    ["GET", "/api/v1/settings/lookups"],
    ["GET", "/api/v1/alerts"],
    ["GET", "/api/v1/users"],
    ["GET", "/api/v1/files"],
    ["GET", "/api/v1/notifications?summary=1"],
    ["GET", "/api/v1/settings/jobs"],
  ];

  for (const [method, path] of endpoints) {
    r = await req(method, path);
    check(`${method} ${path}`, r.status);
  }

  r = await req("PATCH", "/api/v1/notifications", { markAll: true });
  check("PATCH notifications markAll", r.status);

  const pages = [
    "/settings/profile",
    "/settings/preferences",
    "/settings/custom-fields",
    "/settings/units",
    "/settings/reasons",
    "/settings/alerts",
    "/settings/import",
    "/settings/backup",
    "/settings/feature-controls",
    "/settings/labels",
    "/settings/company",
    "/settings/team",
    "/settings/files",
    "/settings/job-settings",
    "/notifications",
    "/reports",
  ];

  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader() }, redirect: "manual" });
    const ok = res.status === 200 || res.status === 307;
    results.push({ name: `PAGE ${path}`, ok, status: res.status });
    console.log(`${ok ? "PASS" : "FAIL"} PAGE ${path} (${res.status})`);
  }

  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
