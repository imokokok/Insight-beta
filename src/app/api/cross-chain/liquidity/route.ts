import { z } from 'zod';

import type {
  ChainLiquidity,
  LiquiditySummary,
  LiquidityResponse,
} from '@/features/cross-chain/types';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/shared/utils';

const LiquidityQuerySchema = z.object({
  symbol: z.string().optional(),
  chain: z.string().optional(),
});

const CHAIN_DATA: Record<string, { displayName: string; baseLiquidity: number }> = {
  ethereum: { displayName: 'Ethereum', baseLiquidity: 50000000000 },
  bsc: { displayName: 'BSC', baseLiquidity: 15000000000 },
  polygon: { displayName: 'Polygon', baseLiquidity: 8000000000 },
  avalanche: { displayName: 'Avalanche', baseLiquidity: 6000000000 },
  arbitrum: { displayName: 'Arbitrum', baseLiquidity: 12000000000 },
  optimism: { displayName: 'Optimism', baseLiquidity: 5000000000 },
  base: { displayName: 'Base', baseLiquidity: 3000000000 },
};

const TOP_TOKENS = ['BTC', 'ETH', 'USDC', 'USDT', 'WETH', 'SOL', 'LINK', 'AVAX'];

function generateMockLiquidityData(symbol?: string, chain?: string): LiquidityResponse {
  let chainKeys = Object.keys(CHAIN_DATA);
  if (chain) {
    chainKeys = chainKeys.filter((c) => c === chain.toLowerCase());
  }

  const tokens = symbol ? [symbol.toUpperCase()] : TOP_TOKENS;
  const timestamp = new Date().toISOString();

  const chains: ChainLiquidity[] = chainKeys.map((chainKey) => {
    const data = CHAIN_DATA[chainKey]!;
    const liquidityVariation = 0.9 + Math.random() * 0.2;
    const totalLiquidity = data.baseLiquidity * liquidityVariation;
    const liquidityChange24h = (Math.random() - 0.5) * 10;
    const liquidityChangePercent24h = liquidityChange24h;

    const topPools = tokens.slice(0, 3 + Math.floor(Math.random() * 2)).map((token) => {
      const poolLiquidity = totalLiquidity * (0.1 + Math.random() * 0.3);
      const feeTiers = ['0.01%', '0.05%', '0.3%', '1%'];
      return {
        symbol: token,
        liquidity: poolLiquidity,
        share: poolLiquidity / totalLiquidity,
        tvl: poolLiquidity * (0.8 + Math.random() * 0.4),
        volume24h: poolLiquidity * (0.1 + Math.random() * 0.5),
        feeTier: feeTiers[Math.floor(Math.random() * feeTiers.length)],
      };
    });

    return {
      chain: chainKey,
      displayName: data.displayName,
      totalLiquidity,
      liquidityChange24h,
      liquidityChangePercent24h,
      topPools,
      avgSlippage: Math.random() * 0.5,
      avgFee: 0.01 + Math.random() * 0.29,
      timestamp,
    };
  });

  const totalLiquidity = chains.reduce((sum, c) => sum + c.totalLiquidity, 0);
  const topChainObj = chains.reduce(
    (max, c) => (c.totalLiquidity > (max?.totalLiquidity ?? 0) ? c : max),
    chains[0],
  );

  const allTopPools = chains.flatMap((c) => c.topPools);
  const topSymbolPool = allTopPools.reduce(
    (max, p) => (p.liquidity > (max?.liquidity ?? 0) ? p : max),
    allTopPools[0],
  );

  const summary: LiquiditySummary = {
    totalLiquidity,
    avgLiquidity: totalLiquidity / (chains.length || 1),
    topChain: topChainObj?.chain ?? 'ethereum',
    liquidityChange24h:
      chains.length > 0
        ? chains.reduce((sum, c) => sum + c.liquidityChange24h, 0) / chains.length
        : 0,
    liquidityChangePercent24h:
      chains.length > 0
        ? chains.reduce((sum, c) => sum + c.liquidityChangePercent24h, 0) / chains.length
        : 0,
    avgSlippage:
      chains.length > 0 ? chains.reduce((sum, c) => sum + c.avgSlippage, 0) / chains.length : 0,
    mostLiquidSymbol: topSymbolPool?.symbol ?? 'ETH',
    mostLiquidChain: topChainObj?.chain ?? 'ethereum',
  };

  return {
    success: true,
    chains,
    summary,
    meta: {
      timestamp,
      dataSource: 'mock',
      isExample: true,
      disclaimer: '此数据为模拟数据，非实时流动性数据',
    },
  };
}

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = LiquidityQuerySchema.parse({
      symbol: searchParams.get('symbol') || undefined,
      chain: searchParams.get('chain') || undefined,
    });

    const data = generateMockLiquidityData(query.symbol, query.chain);

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        'VALIDATION_ERROR',
        `Invalid query parameters: ${error.errors.map((e) => e.message).join(', ')}`,
        400,
      );
    }
    throw error;
  }
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
