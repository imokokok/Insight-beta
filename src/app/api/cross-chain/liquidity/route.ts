import { z } from 'zod';

import type {
  ChainLiquidity,
  LiquiditySummary,
  LiquidityDepth,
  LiquidityTrend,
  LiquidityResponse,
} from '@/features/cross-chain/types';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/shared/utils';

const LiquidityQuerySchema = z.object({
  symbol: z.string().optional(),
  chain: z.string().optional(),
  limit: z.string().optional(),
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

function generateMockLiquidityData(
  symbol?: string,
  chain?: string,
  limit: number = 10,
): LiquidityResponse {
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

  const depthData: LiquidityDepth[] = [];
  for (const chainKey of chainKeys.slice(0, limit)) {
    for (const token of tokens.slice(0, 2)) {
      const basePrice =
        token === 'BTC' ? 95000 : token === 'ETH' ? 3200 : token === 'SOL' ? 180 : 1;
      const midPrice = basePrice * (0.95 + Math.random() * 0.1);

      const bids: { price: number; amount: number; total: number }[] = [];
      const asks: { price: number; amount: number; total: number }[] = [];

      let bidTotal = 0;
      let askTotal = 0;

      for (let i = 0; i < 10; i++) {
        const bidPrice = midPrice * (1 - (i + 1) * 0.001);
        const bidAmount = Math.random() * 100 + 10;
        bidTotal += bidAmount;
        bids.push({
          price: bidPrice,
          amount: bidAmount,
          total: bidTotal,
        });

        const askPrice = midPrice * (1 + (i + 1) * 0.001);
        const askAmount = Math.random() * 100 + 10;
        askTotal += askAmount;
        asks.push({
          price: askPrice,
          amount: askAmount,
          total: askTotal,
        });
      }

      const spread = asks[0]!.price - bids[0]!.price;
      const spreadPercent = (spread / midPrice) * 100;

      depthData.push({
        chain: chainKey,
        protocol: ['Uniswap V3', 'SushiSwap', 'PancakeSwap', 'Trader Joe'][
          Math.floor(Math.random() * 4)
        ]!,
        symbol: token,
        orderBook: {
          symbol: token,
          chain: chainKey,
          protocol: ['Uniswap V3', 'SushiSwap', 'PancakeSwap', 'Trader Joe'][
            Math.floor(Math.random() * 4)
          ]!,
          bids,
          asks,
          midPrice,
          spread,
          spreadPercent,
          timestamp,
        },
        depthMetrics: {
          depth1Percent: bidTotal * 0.1,
          depth5Percent: bidTotal * 0.5,
          depth10Percent: bidTotal,
          buyLiquidity: bidTotal,
          sellLiquidity: askTotal,
          totalLiquidity: bidTotal + askTotal,
        },
        timestamp,
      });
    }
  }

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

  const dataPoints: any[] = [];
  for (let i = 30; i >= 0; i--) {
    const pointTime = new Date(Date.now() - i * 3600000).toISOString();
    const variation = 0.9 + Math.random() * 0.2;
    dataPoints.push({
      timestamp: pointTime,
      totalLiquidity: totalLiquidity * variation,
      liquidityByChain: Object.fromEntries(
        chainKeys.map((ck) => [ck, CHAIN_DATA[ck]!.baseLiquidity * variation]),
      ),
      avgSlippage: Math.random() * 0.5,
      price: tokens[0] === 'BTC' ? 95000 * variation : 3200 * variation,
    });
  }

  const liquidityTrends: LiquidityTrend = {
    symbol: tokens[0] ?? 'ETH',
    chains: chainKeys,
    timeRange: '30d',
    dataPoints,
    trendAnalysis: {
      liquidityChangePercent: (Math.random() - 0.5) * 20,
      volatility: Math.random() * 10,
      trendDirection: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      projectedLiquidity: totalLiquidity * (0.95 + Math.random() * 0.1),
    },
  };

  return {
    success: true,
    chains,
    summary,
    liquidityTrends,
    depthData,
    meta: {
      timestamp,
    },
  };
}

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = LiquidityQuerySchema.parse({
      symbol: searchParams.get('symbol') || undefined,
      chain: searchParams.get('chain') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    const data = generateMockLiquidityData(query.symbol, query.chain, limit);

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
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
