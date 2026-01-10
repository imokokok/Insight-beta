import { ensureOracleSynced, isOracleSyncing } from './oracleIndexer';
import { logger } from "@/lib/logger";
import { createOrTouchAlert, readAlertRules } from "@/server/observability";
import { getSyncState } from "@/server/oracleState";

const SYNC_INTERVAL = 15000; // 15 seconds

function startWorker() {
  if (global.insightWorkerStarted) return;
  global.insightWorkerStarted = true;
  
  logger.info("Starting background sync worker...");
  
  // Run immediately
  ensureOracleSynced().catch((e) => logger.error(e));
  
  setInterval(async () => {
    if (isOracleSyncing()) return;
    try {
      await ensureOracleSynced();
      const rules = await readAlertRules();
      const staleRule = rules.find((r) => r.enabled && r.event === "stale_sync");
      if (staleRule) {
        const maxAgeMs = Number((staleRule.params as { maxAgeMs?: unknown } | undefined)?.maxAgeMs ?? 5 * 60 * 1000);
        const state = await getSyncState();
        const lastSuccessAt = state.sync.lastSuccessAt;
        if (lastSuccessAt) {
          const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
          if (ageMs > maxAgeMs) {
            const fingerprint = `stale_sync:${state.chain}:${state.contractAddress ?? "unknown"}`;
            await createOrTouchAlert({
              fingerprint,
              type: "stale_sync",
              severity: staleRule.severity,
              title: "Oracle sync stale",
              message: `Last success ${Math.round(ageMs / 1000)}s ago`,
              entityType: "oracle",
              entityId: state.contractAddress
            });
          }
        }
      }
    } catch (e) {
      logger.error("Background sync failed:", e);
    }
  }, SYNC_INTERVAL);
}

declare global {
  var insightWorkerStarted: boolean;
}

startWorker();
