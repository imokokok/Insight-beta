import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLatestTvl, getTvlHistory } from '@/server/oracle/umaTvl';
import { createTvlMonitor } from '@/lib/blockchain/umaTvlMonitor';
import { readUMAConfig } from '@/server/oracle/umaConfig';
import { insertTvlRecord } from '@/server/oracle/umaTvl';
import { parseRpcUrls } from '@/lib/utils';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  chainId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  hours: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 24)),
});

/**
 * GET /api/oracle/uma/tvl
 *
 * Query params:
 * - chainId: Chain ID (default: 1 for Ethereum)
 * - hours: History hours (default: 24)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const [latest, history] = await Promise.all([
      getLatestTvl(params.chainId),
      getTvlHistory(params.chainId, params.hours),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        chainId: params.chainId,
        current: latest,
        history,
      },
    });
  } catch (error) {
    logger.error('Failed to get TVL data', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get TVL data',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/oracle/uma/tvl/sync
 * Trigger a manual TVL sync
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '1', 10);

    // Get config
    const umaConfig = await readUMAConfig('uma-mainnet');
    if (!umaConfig) {
      return NextResponse.json({ ok: false, error: 'UMA config not found' }, { status: 404 });
    }

    const chain = umaConfig.chain || 'Ethereum';
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_RPC_URL`;
    const rpcUrl = (env[envKey as keyof typeof env] as string) || umaConfig.rpcUrl;

    if (!rpcUrl) {
      return NextResponse.json({ ok: false, error: 'RPC URL not configured' }, { status: 500 });
    }

    // Create monitor and fetch data
    const monitor = createTvlMonitor(chainId, parseRpcUrls(rpcUrl)[0] || rpcUrl, {
      optimisticOracleV3Address: umaConfig.optimisticOracleV3Address as `0x${string}`,
      optimisticOracleV2Address: umaConfig.optimisticOracleV2Address as `0x${string}`,
    });

    const tvlData = await monitor.getFullTvlData();

    // Save to database
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

    return NextResponse.json({
      ok: true,
      data: tvlData,
    });
  } catch (error) {
    logger.error('Failed to sync TVL', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to sync TVL',
      },
      { status: 500 },
    );
  }
}
