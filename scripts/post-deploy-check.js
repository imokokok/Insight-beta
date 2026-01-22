const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function unwrapApiJson(json) {
  if (
    json &&
    typeof json === "object" &&
    json.ok === true &&
    Object.prototype.hasOwnProperty.call(json, "data")
  ) {
    return json.data;
  }
  if (json && typeof json === "object" && json.ok === false) {
    const err = json.error;
    const code =
      err && typeof err === "object" && err.code ? String(err.code) : "error";
    throw new Error(`api_error:${code}`);
  }
  return json;
}

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
    const data = unwrapApiJson(await res.json());
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
    const data = unwrapApiJson(await res.json());
    console.log("✅ Health check passed:", data);

    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    return checkSecurityHeaders(res, { isHttps, expectNoStore: true });
  } catch (e) {
    console.error("❌ Health check failed:", e.message);
    return false;
  }
}

async function checkValidation() {
  console.log(
    `Checking validation probe at ${BASE_URL}/api/health?probe=validation ...`,
  );
  try {
    const res = await fetch(`${BASE_URL}/api/health?probe=validation`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = unwrapApiJson(await res.json());
    if (data?.status !== "ok") {
      console.error("❌ Validation probe degraded:", data?.issues || data);
      return false;
    }
    console.log("✅ Validation probe passed:", data);
    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    return checkSecurityHeaders(res, { isHttps, expectNoStore: true });
  } catch (e) {
    console.error("❌ Validation probe failed:", e.message);
    return false;
  }
}

async function checkStats() {
  console.log(`Checking oracle status at ${BASE_URL}/api/oracle/status ...`);
  try {
    const res = await fetch(`${BASE_URL}/api/oracle/status`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = unwrapApiJson(await res.json());
    const state = (data && data.state) || {};
    console.log("✅ Oracle Status:", {
      chain: state.chain,
      contractAddress: state.contractAddress,
      lastProcessedBlock: state.lastProcessedBlock,
      latestBlock: state.latestBlock,
      lagBlocks: state.lagBlocks,
      syncing: state.syncing,
      consecutiveFailures: state.consecutiveFailures,
      lastError: state.sync?.lastError ?? null,
    });
    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    if (!checkSecurityHeaders(res, { isHttps, expectNoStore: true }))
      return null;
    if (!state.contractAddress) {
      console.warn(
        "⚠️  Warning: Oracle contractAddress not configured (DB config empty).",
      );
    }
    return data;
  } catch (e) {
    console.error("❌ Stats check failed:", e.message);
    return null;
  }
}

async function checkSyncMetrics() {
  console.log(
    `Checking oracle sync metrics at ${BASE_URL}/api/oracle/sync-metrics ...`,
  );
  try {
    const res = await fetch(
      `${BASE_URL}/api/oracle/sync-metrics?minutes=120&limit=5`,
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = unwrapApiJson(await res.json());
    const items = Array.isArray(data?.items) ? data.items : [];
    const latest = items[items.length - 1];
    console.log("✅ Oracle Sync Metrics:", {
      count: items.length,
      latest,
    });
    const isHttps = String(BASE_URL).toLowerCase().startsWith("https://");
    if (!checkSecurityHeaders(res, { isHttps, expectNoStore: true }))
      return false;
    if (items.length === 0) {
      console.warn(
        "⚠️  Warning: No sync metrics found yet (indexer may be warming up).",
      );
    }
    if (latest?.error) {
      console.warn(
        `⚠️  Warning: Latest sync metric includes error: ${latest.error}`,
      );
    }
    return true;
  } catch (e) {
    console.error("❌ Sync metrics check failed:", e.message);
    return false;
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

  // 2. Validation Check
  if (!(await checkValidation())) process.exit(1);

  console.log("\n-------------------\n");

  // 3. Stats Check
  const status = await checkStats();
  if (!status) process.exit(1);
  const lastProcessed = status?.state?.lastProcessedBlock;
  if (lastProcessed === "0" || lastProcessed === 0) {
    console.warn(
      "⚠️  Warning: lastProcessedBlock is 0. Oracle might not be syncing yet.",
    );
  }

  console.log("\n-------------------\n");

  // 4. Sync Metrics Check
  if (!(await checkSyncMetrics())) process.exit(1);

  console.log("\n-------------------\n");
  console.log(
    "✅ Basic checks passed. Monitor logs for detailed event processing.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
