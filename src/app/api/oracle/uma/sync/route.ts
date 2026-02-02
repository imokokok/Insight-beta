import type { NextRequest } from 'next/server';
import { ensureUMASynced, isUMASyncing } from '@/server/oracle/umaSync';
import { getUMASyncState } from '@/server/oracle/umaState';
import { readUMAConfig } from '@/server/oracle/umaConfig';
import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

const RATE_LIMITS = {
  GET: { key: 'uma_sync_get', limit: 60, windowMs: 60_000 },
  POST: { key: 'uma_sync_post', limit: 10, windowMs: 60_000 },
} as const;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';

      const config = await readUMAConfig(instanceId);
      if (!config) {
        return { error: 'Config not found' };
      }

      const syncState = await getUMASyncState(instanceId);
      const syncing = isUMASyncing(instanceId);

      const response = {
        instanceId,
        config: {
          chain: config.chain,
          ooV2Address: config.optimisticOracleV2Address,
          ooV3Address: config.optimisticOracleV3Address,
          rpcUrl: config.rpcUrl,
          startBlock: config.startBlock,
          maxBlockRange: config.maxBlockRange,
          votingPeriodHours: config.votingPeriodHours,
          confirmationBlocks: config.confirmationBlocks,
          enabled: config.enabled,
        },
        sync: {
          lastProcessedBlock: syncState.lastProcessedBlock?.toString() || '0',
          latestBlock: syncState.latestBlock?.toString() || null,
          safeBlock: syncState.safeBlock?.toString() || null,
          lagBlocks:
            syncState.latestBlock && syncState.lastProcessedBlock
              ? (syncState.latestBlock - syncState.lastProcessedBlock).toString()
              : null,
          lastAttemptAt: syncState.sync.lastAttemptAt,
          lastSuccessAt: syncState.sync.lastSuccessAt,
          lastDurationMs: syncState.sync.lastDurationMs,
          lastError: syncState.sync.lastError,
          consecutiveFailures: syncState.consecutiveFailures,
          rpcActiveUrl: syncState.rpcActiveUrl,
          syncing,
        },
        chain: config.chain,
      };

      const durationMs = Date.now() - startTime;
      logger.debug('UMA sync status fetched', { requestId, instanceId, syncing, durationMs });

      return response;
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA sync GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.POST);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'uma_sync' });
      if (auth) return auth;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';

      const result = await ensureUMASynced(instanceId);

      const durationMs = Date.now() - startTime;
      logger.info('UMA sync triggered', {
        requestId,
        instanceId,
        updated: result.updated,
        durationMs,
      });

      return {
        success: true,
        instanceId,
        updated: result.updated,
        state: {
          lastProcessedBlock: result.state.lastProcessedBlock?.toString() || '0',
          latestBlock: result.state.latestBlock?.toString() || null,
          lastSuccessAt: result.state.sync.lastSuccessAt,
        },
        durationMs,
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA sync POST failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}
