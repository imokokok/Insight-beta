import { ensureUMASynced, isUMASyncing } from './umaSync';
import { listUMAConfigs } from './umaConfig';
import { logger } from '@/lib/logger';

const UMA_SYNC_INTERVAL_MS = 30_000;
const MAX_CONSECUTIVE_ERRORS = 5;

interface SyncTaskState {
  running: boolean;
  consecutiveErrors: number;
  lastSyncTime: number;
  instanceIds: string[];
}

const syncTaskState: SyncTaskState = {
  running: false,
  consecutiveErrors: 0,
  lastSyncTime: 0,
  instanceIds: ['uma-mainnet'],
};

export function startUMASyncTask() {
  if (syncTaskState.running) {
    logger.warn('UMA sync task already running');
    return;
  }

  syncTaskState.running = true;
  syncTaskState.consecutiveErrors = 0;
  syncTaskState.lastSyncTime = 0;

  logger.info('Starting UMA sync task', { intervalMs: UMA_SYNC_INTERVAL_MS });

  const runSync = async () => {
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    for (const instanceId of syncTaskState.instanceIds) {
      try {
        if (isUMASyncing(instanceId)) {
          logger.debug('UMA sync already in progress', { instanceId });
          continue;
        }

        const result = await ensureUMASynced(instanceId);
        if (result.updated) {
          successCount++;
          logger.info('UMA sync completed', { instanceId, updated: result.updated });
        }
      } catch (error) {
        failCount++;
        logger.error('UMA sync failed', {
          instanceId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    syncTaskState.lastSyncTime = Date.now();
    const durationMs = Date.now() - startTime;

    if (failCount > 0) {
      syncTaskState.consecutiveErrors++;
      logger.warn('UMA sync cycle completed with errors', {
        successCount,
        failCount,
        durationMs,
        consecutiveErrors: syncTaskState.consecutiveErrors,
      });

      if (syncTaskState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        logger.error('UMA sync task stopping after too many consecutive errors', {
          consecutiveErrors: syncTaskState.consecutiveErrors,
        });
        syncTaskState.running = false;
        return;
      }
    } else {
      syncTaskState.consecutiveErrors = 0;
      logger.debug('UMA sync cycle completed', { successCount, durationMs });
    }

    if (syncTaskState.running) {
      setTimeout(runSync, UMA_SYNC_INTERVAL_MS);
    }
  };

  setTimeout(runSync, 5000);
}

export function stopUMASyncTask() {
  syncTaskState.running = false;
  logger.info('UMA sync task stopped', {
    lastSyncTime: new Date(syncTaskState.lastSyncTime).toISOString(),
  });
}

export function getUMASyncTaskStatus() {
  return {
    running: syncTaskState.running,
    consecutiveErrors: syncTaskState.consecutiveErrors,
    lastSyncTime:
      syncTaskState.lastSyncTime > 0 ? new Date(syncTaskState.lastSyncTime).toISOString() : null,
    instanceIds: syncTaskState.instanceIds,
    intervalMs: UMA_SYNC_INTERVAL_MS,
  };
}

export async function reloadUMAInstances() {
  try {
    const configs = await listUMAConfigs();
    syncTaskState.instanceIds = configs.filter((c) => c.enabled).map((c) => c.id);
    logger.info('UMA instances reloaded', { instanceIds: syncTaskState.instanceIds });
    return syncTaskState.instanceIds;
  } catch (error) {
    logger.error('Failed to reload UMA instances', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

export function addUMAInstance(instanceId: string) {
  if (!syncTaskState.instanceIds.includes(instanceId)) {
    syncTaskState.instanceIds.push(instanceId);
    logger.info('UMA instance added to sync task', { instanceId });
  }
}

export function removeUMAInstance(instanceId: string) {
  const index = syncTaskState.instanceIds.indexOf(instanceId);
  if (index > -1) {
    syncTaskState.instanceIds.splice(index, 1);
    logger.info('UMA instance removed from sync task', { instanceId });
  }
}
