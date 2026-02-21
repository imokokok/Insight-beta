import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { createUMAClient, getSupportedUMAChains } from '@/lib/blockchain/umaOracle';
import { getDefaultRpcUrl } from '@/lib/blockchain/chainConfig';
import type { SupportedChain } from '@/types/unifiedOracleTypes';
import { logger } from '@/shared/logger';

interface ChainHealthData {
  chain: SupportedChain;
  healthy: boolean;
  latency: number;
  activeAssertions: number;
  activeDisputes: number;
  totalBonded: string;
  issues: string[];
  feeds?: FeedHealthData[];
}

interface FeedHealthData {
  assertionId: string;
  healthy: boolean;
  lastUpdate: string;
  stalenessSeconds: number;
  issues: string[];
  activeAssertions: number;
  activeDisputes: number;
  totalBonded: string;
}

interface HealthQueryParams {
  chains?: string;
  assertionIds?: string;
  useMock?: string;
}

function generateMockHealthData(): {
  overall: {
    healthy: boolean;
    totalChains: number;
    healthyChains: number;
    avgLatency: number;
    totalActiveAssertions: number;
    totalActiveDisputes: number;
    totalBonded: string;
  };
  chains: ChainHealthData[];
} {
  const supportedChains = getSupportedUMAChains();
  const chains: ChainHealthData[] = [];
  let totalHealthy = 0;
  let totalLatency = 0;
  let totalAssertions = 0;
  let totalDisputes = 0;
  let totalBonded = BigInt(0);

  supportedChains.forEach((chain) => {
    const healthy = Math.random() > 0.2;
    const latency = Math.floor(Math.random() * 500) + 50;
    const activeAssertions = Math.floor(Math.random() * 50);
    const activeDisputes = Math.floor(Math.random() * 5);
    const bonded = BigInt(Math.floor(Math.random() * 1000000) + 100000);
    const issues: string[] = [];

    if (!healthy) {
      issues.push('High latency detected');
      if (Math.random() > 0.5) {
        issues.push('RPC connection unstable');
      }
    }

    chains.push({
      chain,
      healthy,
      latency,
      activeAssertions,
      activeDisputes,
      totalBonded: bonded.toString(),
      issues,
    });

    if (healthy) totalHealthy++;
    totalLatency += latency;
    totalAssertions += activeAssertions;
    totalDisputes += activeDisputes;
    totalBonded += bonded;
  });

  return {
    overall: {
      healthy: totalHealthy === supportedChains.length,
      totalChains: supportedChains.length,
      healthyChains: totalHealthy,
      avgLatency: Math.floor(totalLatency / supportedChains.length),
      totalActiveAssertions: totalAssertions,
      totalActiveDisputes: totalDisputes,
      totalBonded: totalBonded.toString(),
    },
    chains,
  };
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const params: HealthQueryParams = {
      chains: searchParams.get('chains') || undefined,
      assertionIds: searchParams.get('assertionIds') || undefined,
      useMock: searchParams.get('useMock') || undefined,
    };

    const useMock = params.useMock === 'true' || process.env.NODE_ENV === 'development';

    if (useMock) {
      const mockData = generateMockHealthData();
      const requestTime = performance.now() - requestStartTime;

      logger.info('UMA Health API request completed (mock)', {
        performance: { totalRequestTimeMs: Math.round(requestTime) },
        isMock: true,
      });

      return ok({
        ...mockData,
        isMock: true,
        metadata: {
          source: 'uma-optimistic-oracle',
          lastUpdated: new Date().toISOString(),
          note: 'Mock data - to be replaced with real UMA health data',
        },
      });
    }

    const supportedChains = getSupportedUMAChains();
    const requestedChains = params.chains
      ? params.chains.split(',').filter((c): c is SupportedChain => supportedChains.includes(c as SupportedChain))
      : supportedChains;

    const assertionIds = params.assertionIds ? params.assertionIds.split(',') : [];

    const chainHealthData: ChainHealthData[] = [];
    let overallHealthy = true;
    let totalLatency = 0;
    let totalAssertions = 0;
    let totalDisputes = 0;
    let totalBonded = BigInt(0);

    for (const chain of requestedChains) {
      try {
        const rpcUrl = getDefaultRpcUrl(chain);
        const client = createUMAClient(chain, rpcUrl);

        const healthCheck = await client.checkHealth();
        totalLatency += healthCheck.latency;

        if (!healthCheck.healthy) {
          overallHealthy = false;
        }

        const feeds: FeedHealthData[] = [];
        let chainAssertions = 0;
        let chainDisputes = 0;
        let chainBonded = BigInt(0);

        for (const assertionId of assertionIds) {
          try {
            const feedHealth = await client.checkFeedHealth(assertionId);
            feeds.push({
              assertionId,
              healthy: feedHealth.healthy,
              lastUpdate: feedHealth.lastUpdate.toISOString(),
              stalenessSeconds: feedHealth.stalenessSeconds,
              issues: feedHealth.issues,
              activeAssertions: feedHealth.activeAssertions,
              activeDisputes: feedHealth.activeDisputes,
              totalBonded: feedHealth.totalBonded.toString(),
            });
            chainAssertions += feedHealth.activeAssertions;
            chainDisputes += feedHealth.activeDisputes;
            chainBonded += feedHealth.totalBonded;
          } catch {
            feeds.push({
              assertionId,
              healthy: false,
              lastUpdate: new Date(0).toISOString(),
              stalenessSeconds: Infinity,
              issues: [`Failed to check feed health for ${assertionId}`],
              activeAssertions: 0,
              activeDisputes: 0,
              totalBonded: '0',
            });
          }
        }

        chainHealthData.push({
          chain,
          healthy: healthCheck.healthy,
          latency: healthCheck.latency,
          activeAssertions: chainAssertions,
          activeDisputes: chainDisputes,
          totalBonded: chainBonded.toString(),
          issues: healthCheck.issues,
          feeds: feeds.length > 0 ? feeds : undefined,
        });

        totalAssertions += chainAssertions;
        totalDisputes += chainDisputes;
        totalBonded += chainBonded;
      } catch (err) {
        overallHealthy = false;
        chainHealthData.push({
          chain,
          healthy: false,
          latency: 0,
          activeAssertions: 0,
          activeDisputes: 0,
          totalBonded: '0',
          issues: [err instanceof Error ? err.message : `Failed to check health for ${chain}`],
        });
      }
    }

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA Health API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      isMock: false,
      chains: requestedChains.length,
      feeds: assertionIds.length,
    });

    return ok({
      overall: {
        healthy: overallHealthy,
        totalChains: requestedChains.length,
        healthyChains: chainHealthData.filter((c) => c.healthy).length,
        avgLatency: requestedChains.length > 0 ? Math.floor(totalLatency / requestedChains.length) : 0,
        totalActiveAssertions: totalAssertions,
        totalActiveDisputes: totalDisputes,
        totalBonded: totalBonded.toString(),
      },
      chains: chainHealthData,
      isMock: false,
      metadata: {
        source: 'uma-optimistic-oracle',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('UMA Health API error', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      new AppError('Failed to fetch UMA health data', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { message: err instanceof Error ? err.message : 'Unknown error' },
      }),
    );
  }
}
