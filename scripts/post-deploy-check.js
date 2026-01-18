const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function checkHealth() {
  console.log(`Checking health at ${BASE_URL}/api/health ...`);
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    console.log("✅ Health check passed:", data);
    return true;
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
    return data;
  } catch (e) {
    console.error("❌ Stats check failed:", e.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting Post-Deployment Check...\n");

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
