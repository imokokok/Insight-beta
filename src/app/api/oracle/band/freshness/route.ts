import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { createBandClient, BAND_CONTRACT_ADDRESSES } from '@/lib/blockchain/bandOracle';
import { getDefaultRpcUrl } from '@/lib/blockchain/chainConfig';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface FreshnessQueryParams {
  symbol?: string;
  chain?: SupportedChain;
}

function parseQueryParams(request: NextRequest): FreshnessQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol') ?? undefined,
    chain: searchParams.get('chain') as SupportedChain | undefined,
  };
}

function isValidChain(chain: string | undefined): chain is SupportedChain {
  if (!chain) return false;
  return Object.keys(BAND_CONTRACT_ADDRESSES).includes(chain);
}

export async function GET(request: NextRequest) {
  try {
    const { symbol, chain } = parseQueryParams(request);

    if (!symbol) {
      return error({ code: 'MISSING_SYMBOL', message: 'Symbol parameter is required' }, 400);
    }

    const targetChain: SupportedChain = chain && isValidChain(chain) ? chain : 'ethereum';

    const contractAddress = BAND_CONTRACT_ADDRESSES[targetChain];
    if (!contractAddress) {
      return error(
        {
          code: 'UNSUPPORTED_CHAIN',
          message: `Band Protocol not supported on chain: ${targetChain}`,
        },
        400,
      );
    }

    const rpcUrl = getDefaultRpcUrl(targetChain);
    const client = createBandClient(targetChain, rpcUrl);

    const healthResult = await client.checkFeedHealth(symbol);

    const now = Date.now();
    const lastUpdateMs = healthResult.lastUpdate.getTime();
    const stalenessSeconds = Math.floor((now - lastUpdateMs) / 1000);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (stalenessSeconds > 600) {
      status = 'critical';
    } else if (stalenessSeconds > 300 || !healthResult.healthy) {
      status = 'warning';
    }

    const latencyDistribution = {
      under1min: stalenessSeconds < 60,
      under5min: stalenessSeconds < 300,
      under10min: stalenessSeconds < 600,
      over10min: stalenessSeconds >= 600,
    };

    return ok({
      symbol,
      chain: targetChain,
      data: {
        healthy: healthResult.healthy,
        status,
        lastUpdate: healthResult.lastUpdate.toISOString(),
        lastUpdateTimestamp: lastUpdateMs,
        stalenessSeconds,
        issues: healthResult.issues,
        latencyDistribution,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check feed health';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
