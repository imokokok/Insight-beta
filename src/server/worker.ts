import { ensureOracleSynced, isOracleSyncing } from './oracleIndexer';
import { logger } from "@/lib/logger";

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
    } catch (e) {
      logger.error("Background sync failed:", e);
    }
  }, SYNC_INTERVAL);
}

declare global {
  var insightWorkerStarted: boolean;
}

startWorker();
