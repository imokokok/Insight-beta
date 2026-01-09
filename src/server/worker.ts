import { ensureOracleSynced, isOracleSyncing } from './oracleIndexer';

const SYNC_INTERVAL = 15000; // 15 seconds

function startWorker() {
  if (global.insightWorkerStarted) return;
  global.insightWorkerStarted = true;
  
  console.log('Starting background sync worker...');
  
  // Run immediately
  ensureOracleSynced().catch(console.error);
  
  setInterval(async () => {
    if (isOracleSyncing()) return;
    try {
      await ensureOracleSynced();
    } catch (e) {
      console.error('Background sync failed:', e);
    }
  }, SYNC_INTERVAL);
}

declare global {
  var insightWorkerStarted: boolean;
}

startWorker();
