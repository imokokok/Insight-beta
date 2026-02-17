import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess } from '@/shared/utils';

interface ChainLiquidity {
  chain: string;
  displayName: string;
  totalLiquidity: number;
  liquidityChange24h: number;
  topPools: {
    symbol: string;
    liquidity: number;
    share: number;
  }[];
  avgSlippage: number;
  avgFee: number;
}

interface LiquidityResponse {
  chains: ChainLiquidity[];
  summary: {
    totalLiquidity: number;
    avgLiquidity: number;
    topChain: string;
    liquidityChange24h: number;
  };
  meta: {
    timestamp: string;
  };
}

const CHAIN_DATA: Record<string, { displayName: string; baseLiquidity: number }> = {
  ethereum: { displayName: 'Ethereum', baseLiquidity: 50000000000 },
  bsc: { displayName: 'BSC', baseLiquidity: 15000000000 },
  polygon: { displayName: 'Polygon', baseLiquidity: 8000000000 },
  avalanche: { displayName: 'Avalanche', baseLiquidity: 6000000000 },
  arbitrum: { displayName: 'Arbitrum', baseLiquidity: 12000000000 },
  optimism: { displayName: 'Optimism', baseLiquidity: 5000000000 },
  base: { displayName: 'Base', baseLiquidity: 3000000000 },
};

const TOP_TOKENS = ['BTC', 'ETH', 'USDC', 'USDT', 'WETH'];

function generateLiquidityData(): LiquidityResponse {
  const chains: ChainLiquidity[] = Object.entries(CHAIN_DATA).map(([chain, data]) => {
    const liquidityVariation = 0.9 + Math.random() * 0.2;
    const totalLiquidity = data.baseLiquidity * liquidityVariation;
    const liquidityChange24h = (Math.random() - 0.5) * 10;

    const topPools = TOP_TOKENS.slice(0, 3 + Math.floor(Math.random() * 2)).map((symbol) => {
      const poolLiquidity = totalLiquidity * (0.1 + Math.random() * 0.3);
      return {
        symbol,
        liquidity: poolLiquidity,
        share: poolLiquidity / totalLiquidity,
      };
    });

    return {
      chain,
      displayName: data.displayName,
      totalLiquidity,
      liquidityChange24h,
      topPools,
      avgSlippage: Math.random() * 0.5,
      avgFee: 0.01 + Math.random() * 0.29,
    };
  });

  const totalLiquidity = chains.reduce((sum, c) => sum + c.totalLiquidity, 0);
  const topChain = chains.reduce((max, c) => 
    c.totalLiquidity > (max?.totalLiquidity ?? 0) ? c : max, chains[0]);

  return {
    chains,
    summary: {
      totalLiquidity,
      avgLiquidity: totalLiquidity / chains.length,
      topChain: topChain?.chain ?? 'ethereum',
      liquidityChange24h: chains.reduce((sum, c) => sum + c.liquidityChange24h, 0) / chains.length,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

async function handleGet() {
  const data = generateLiquidityData();
  return apiSuccess(data);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
