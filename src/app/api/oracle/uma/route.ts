import type { NextRequest } from 'next/server';
import { listUMAAssertions, listUMADisputes, getUMASyncState } from '@/server/oracle/umaState';
import { listUMAConfigs } from '@/server/oracle/umaConfig';
import { isUMASyncing } from '@/server/oracle/umaSync';
import { handleApi, rateLimit } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

const RATE_LIMITS = {
  GET: { key: 'uma_get', limit: 60, windowMs: 60_000 },
} as const;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';
      const includeAssertions = url.searchParams.get('includeAssertions') === 'true';
      const includeDisputes = url.searchParams.get('includeDisputes') === 'true';

      const [configs, syncState, assertionsResult, disputesResult] = await Promise.all([
        listUMAConfigs(),
        getUMASyncState(instanceId),
        includeAssertions
          ? listUMAAssertions({ instanceId, limit: 20 })
          : Promise.resolve({ assertions: [], total: 0 }),
        includeDisputes
          ? listUMADisputes({ instanceId, limit: 20 })
          : Promise.resolve({ disputes: [], total: 0 }),
      ]);

      const currentConfig = configs.find((c) => c.id === instanceId) ?? configs[0] ?? null;
      const syncing = isUMASyncing(instanceId);

      if (!currentConfig) {
        return {
          instanceId,
          error: 'No configuration found',
          availableInstances: configs.map((c) => ({ id: c.id, chain: c.chain })),
        };
      }

      const response = {
        instanceId,
        timestamp: new Date().toISOString(),
        config: {
          chain: currentConfig.chain,
          ooV2Address: currentConfig.optimisticOracleV2Address,
          ooV3Address: currentConfig.optimisticOracleV3Address,
          enabled: currentConfig.enabled,
        },
        sync: {
          lastProcessedBlock: syncState.lastProcessedBlock?.toString() || '0',
          latestBlock: syncState.latestBlock?.toString() || null,
          lastSuccessAt: syncState.sync.lastSuccessAt,
          lastError: syncState.sync.lastError,
          syncing,
        },
        stats: {
          totalAssertions: assertionsResult.total,
          totalDisputes: disputesResult.total,
        },
        recentAssertions: includeAssertions ? assertionsResult.assertions : undefined,
        recentDisputes: includeDisputes ? disputesResult.disputes : undefined,
        availableInstances: configs.map((c) => ({
          id: c.id,
          chain: c.chain,
          enabled: c.enabled,
        })),
      };

      const durationMs = Date.now() - startTime;
      logger.debug('UMA overview fetched', { requestId, instanceId, durationMs });

      return response;
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA overview GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}
