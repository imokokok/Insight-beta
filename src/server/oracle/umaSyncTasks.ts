import { syncDVMEvents } from './umaRewardsSync';
import { createTvlMonitor } from '@/lib/blockchain/umaTvlMonitor';
import { insertTvlRecord } from './umaTvl';
import { readUMAConfig } from './umaConfig';
import { parseRpcUrls } from '@/lib/utils';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

// Track active sync tasks
const activeSyncTasks = new Map<string, () => void>();

/**
 * Start UMA Rewards sync task
 */
export function startRewardsSyncTask(instanceId: string = 'uma-mainnet'): () => void {
  const taskKey = `rewards-${instanceId}`;

  // Stop existing task if any
  if (activeSyncTasks.has(taskKey)) {
    const stopExisting = activeSyncTasks.get(taskKey);
    if (stopExisting) stopExisting();
    activeSyncTasks.delete(taskKey);
  }

  const intervalMs = env.UMA_REWARDS_SYNC_INTERVAL_MS || 5 * 60 * 1000; // Default 5 minutes

  logger.info('Starting UMA rewards sync task', { instanceId, intervalMs });

  let isRunning = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const runSync = async () => {
    if (isRunning) {
      logger.debug('Rewards sync already running, skipping', { instanceId });
      return;
    }

    isRunning = true;
    try {
      await syncDVMEvents(instanceId);
      logger.debug('Rewards sync completed', { instanceId });
    } catch (error) {
      logger.error('Rewards sync failed', { error, instanceId });
    } finally {
      isRunning = false;
    }
  };

  // Run immediately
  void runSync();

  // Schedule periodic sync
  intervalId = setInterval(runSync, intervalMs);

  // Return cleanup function
  const stopTask = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    logger.info('UMA rewards sync task stopped', { instanceId });
  };

  activeSyncTasks.set(taskKey, stopTask);
  return stopTask;
}

/**
 * Start UMA TVL sync task
 */
export function startTvlSyncTask(instanceId: string = 'uma-mainnet'): () => void {
  const taskKey = `tvl-${instanceId}`;

  // Stop existing task if any
  if (activeSyncTasks.has(taskKey)) {
    const stopExisting = activeSyncTasks.get(taskKey);
    if (stopExisting) stopExisting();
    activeSyncTasks.delete(taskKey);
  }

  const intervalMs = env.UMA_TVL_SYNC_INTERVAL_MS || 10 * 60 * 1000; // Default 10 minutes

  logger.info('Starting UMA TVL sync task', { instanceId, intervalMs });

  let isRunning = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const runSync = async () => {
    if (isRunning) {
      logger.debug('TVL sync already running, skipping', { instanceId });
      return;
    }

    isRunning = true;
    try {
      const umaConfig = await readUMAConfig(instanceId);
      if (!umaConfig) {
        logger.warn('TVL sync skipped: UMA config not found', { instanceId });
        return;
      }

      const chain = umaConfig.chain || 'Ethereum';
      const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
      const envKey = `UMA_${chainKey}_RPC_URL` as keyof typeof env;
      const rpcUrl = (env[envKey] as string) || umaConfig.rpcUrl;

      if (!rpcUrl) {
        logger.warn('TVL sync skipped: RPC URL not configured', { instanceId, chain });
        return;
      }

      const chainIds: Record<string, number> = {
        Ethereum: 1,
        Polygon: 137,
        Arbitrum: 42161,
        Optimism: 10,
        Base: 8453,
        PolygonAmoy: 80002,
      };

      const chainId = chainIds[chain] || 1;

      const monitor = createTvlMonitor(chainId, parseRpcUrls(rpcUrl)[0] || rpcUrl, {
        optimisticOracleV3Address: umaConfig.optimisticOracleV3Address as `0x${string}`,
        optimisticOracleV2Address: umaConfig.optimisticOracleV2Address as `0x${string}`,
      });

      const tvlData = await monitor.getFullTvlData();
      await insertTvlRecord({
        chainId: tvlData.chainId,
        timestamp: new Date(tvlData.timestamp).toISOString(),
        totalStaked: tvlData.totalStaked.toString(),
        totalBonded: tvlData.totalBonded.toString(),
        totalRewards: tvlData.totalRewards.toString(),
        oracleTvl: tvlData.oracleTvl.toString(),
        dvmTvl: tvlData.dvmTvl.toString(),
        activeAssertions: tvlData.activeAssertions,
        activeDisputes: tvlData.activeDisputes,
      });

      logger.debug('TVL sync completed', {
        instanceId,
        chainId,
        tvl: tvlData.oracleTvl.toString(),
      });
    } catch (error) {
      logger.error('TVL sync failed', { error, instanceId });
    } finally {
      isRunning = false;
    }
  };

  // Run immediately
  void runSync();

  // Schedule periodic sync
  intervalId = setInterval(runSync, intervalMs);

  // Return cleanup function
  const stopTask = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    logger.info('UMA TVL sync task stopped', { instanceId });
  };

  activeSyncTasks.set(taskKey, stopTask);
  return stopTask;
}

/**
 * Stop all UMA sync tasks
 */
export function stopAllUMASyncTasks(): void {
  for (const [key, stopTask] of activeSyncTasks.entries()) {
    if (stopTask) stopTask();
    logger.info('Stopped UMA sync task', { taskKey: key });
  }
  activeSyncTasks.clear();
}

/**
 * Get active sync task status
 */
export function getUMASyncTaskStatus(): Array<{ task: string; active: boolean }> {
  return Array.from(activeSyncTasks.entries()).map(([key]) => ({
    task: key,
    active: true,
  }));
}
