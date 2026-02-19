import type { NextRequest } from 'next/server';

import { getRpcUrl } from '@/config/env';
import { error, ok } from '@/lib/api/apiResponse';
import {
  createAPI3Client,
  getSupportedAPI3Chains,
  API3_FEED_IDS,
} from '@/lib/blockchain/api3Oracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

import type { Address } from 'viem';

interface AirnodeQueryParams {
  chain?: SupportedChain;
  status?: 'online' | 'offline' | 'all';
}

interface AirnodeStatus {
  chain: SupportedChain;
  online: boolean;
  lastHeartbeat: string | null;
  responseTime: number;
  dataFeeds: string[];
}

function parseQueryParams(request: NextRequest): AirnodeQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    chain: searchParams.get('chain') as SupportedChain | undefined,
    status: (searchParams.get('status') as AirnodeQueryParams['status']) ?? 'all',
  };
}

export async function GET(request: NextRequest) {
  try {
    const { chain, status } = parseQueryParams(request);
    const supportedChains = getSupportedAPI3Chains();

    if (chain && !supportedChains.includes(chain)) {
      return error(
        { code: 'INVALID_CHAIN', message: `Chain "${chain}" is not supported by API3` },
        400,
      );
    }

    const chainsToQuery = chain ? [chain] : supportedChains;
    const airnodeStatuses: AirnodeStatus[] = [];
    const errors: Array<{ chain: string; error: string }> = [];

    const sampleAirnodeAddress = '0x0000000000000000000000000000000000000000' as Address;

    for (const targetChain of chainsToQuery) {
      const rpcUrl = getRpcUrl(targetChain);
      if (!rpcUrl) {
        errors.push({ chain: targetChain, error: 'RPC URL not configured' });
        continue;
      }

      try {
        const client = createAPI3Client(targetChain, rpcUrl, { oevEnabled: true });
        const health = await client.checkAirnodeHealth(sampleAirnodeAddress);

        const airnodeStatus: AirnodeStatus = {
          chain: targetChain,
          online: health.online,
          lastHeartbeat: health.lastHeartbeat?.toISOString() ?? null,
          responseTime: health.responseTime,
          dataFeeds: Object.keys(API3_FEED_IDS),
        };

        if (status === 'all') {
          airnodeStatuses.push(airnodeStatus);
        } else if (status === 'online' && health.online) {
          airnodeStatuses.push(airnodeStatus);
        } else if (status === 'offline' && !health.online) {
          airnodeStatuses.push(airnodeStatus);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ chain: targetChain, error: message });
      }
    }

    const result = {
      airnodes: airnodeStatuses,
      metadata: {
        total: airnodeStatuses.length,
        online: airnodeStatuses.filter((a) => a.online).length,
        offline: airnodeStatuses.filter((a) => !a.online).length,
        supportedChains,
        filter: status,
      },
    };

    if (errors.length > 0) {
      return ok({ ...result, errors }, { total: airnodeStatuses.length });
    }

    return ok(result, { total: airnodeStatuses.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
