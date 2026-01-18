const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function requireHeader(res, key, opts = {}) {
  const value = res.headers.get(key);
  const present = value !== null && String(value).trim().length > 0;
  if (!present) return { ok: false, reason: `missing_header:${key}` };
  if (
    opts.equals &&
    String(value).toLowerCase() !== String(opts.equals).toLowerCase()
  ) {
    return {
      ok: false,
      reason: `bad_header:${key}`,
      details: { expected: opts.equals, got: value },
    };
  }
  if (
    opts.includes &&
    !String(value).toLowerCase().includes(String(opts.includes).toLowerCase())
  ) {
    return {
      ok: false,
      reason: `bad_header:${key}`,
      details: { expectedIncludes: opts.includes, got: value },
    };
  }
  return { ok: true };
}

function checkSecurityHeaders(res, opts) {
  const isHttps = Boolean(opts && opts.isHttps);
  const expectNoStore = Boolean(opts && opts.expectNoStore);
  const checks = [
    requireHeader(res, "x-request-id"),
    requireHeader(res, "x-content-type-options", { equals: "nosniff" }),
    requireHeader(res, "x-frame-options", { equals: "deny" }),
    requireHeader(res, "referrer-policy"),
    requireHeader(res, "x-dns-prefetch-control", { equals: "off" }),
    requireHeader(res, "x-xss-protection", { equals: "1; mode=block" }),
    requireHeader(res, "permissions-policy"),
    requireHeader(res, "cross-origin-opener-policy", { equals: "same-origin" }),
    requireHeader(res, "cross-origin-resource-policy", {
      equals: "same-origin",
    }),
    requireHeader(res, "content-security-policy", { includes: "default-src" }),
    requireHeader(res, "content-security-policy", {
      includes: "frame-ancestors",
    }),
  ];
  if (expectNoStore)
    checks.push(requireHeader(res, "cache-control", { includes: "no-store" }));
  if (isHttps) checks.push(requireHeader(res, "strict-transport-security"));

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.error("❌ Header check failed:", failed);
    return false;
  }
  return true;
}

async function checkProbe(probe) {
  console.log(
    `Checking ${probe} probe at ${BASE_URL}/api/health?probe=${probe} ...`,
  );
  try {
    const res = await fetch(`${BASE_URL}/api/health?probe=${probe}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    console.log(`✅ ${probe} probe passed:`, data);
    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    if (!checkSecurityHeaders(res, { isHttps, expectNoStore: true }))
      return false;
    return true;
  } catch (e) {
    console.error(`❌ ${probe} probe failed:`, e.message);
    return false;
  }
}

async function checkHealth() {
  console.log(`Checking health at ${BASE_URL}/api/health ...`);
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    console.log("✅ Health check passed:", data);

    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    return checkSecurityHeaders(res, { isHttps, expectNoStore: true });
  } catch (e) {
    console.error("❌ Health check failed:", e.message);
    return false;
  }
}

async function checkStats() {
  console.log(`Checking oracle stats at ${BASE_URL}/api/oracle/stats ...`);
  try {
    const res = await fetch(`${BASE_URL}/api/oracle/stats`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    console.log("✅ Oracle Stats:", {
      chainId: data.chainId,
      lastProcessedBlock: data.lastProcessedBlock,
      syncStatus: data.isSyncing ? "Syncing" : "Synced",
    });
    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    if (!checkSecurityHeaders(res, { isHttps, expectNoStore: true }))
      return null;
    return data;
  } catch (e) {
    console.error("❌ Stats check failed:", e.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting Post-Deployment Check...\n");

  // 0. Probes
  if (!(await checkProbe("liveness"))) process.exit(1);
  if (!(await checkProbe("readiness"))) process.exit(1);

  console.log("\n-------------------\n");

  // 1. Health Check
  if (!(await checkHealth())) process.exit(1);

  console.log("\n-------------------\n");

  // 2. Stats Check
  const stats = await checkStats();
  if (!stats) process.exit(1);

  if (stats.lastProcessedBlock === 0) {
    console.warn(
      "⚠️  Warning: Last processed block is 0. Oracle might not be syncing yet.",
    );
  }

  console.log("\n-------------------\n");
  console.log(
    "✅ Basic checks passed. Monitor logs for detailed event processing.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
