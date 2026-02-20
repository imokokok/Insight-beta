import { z } from 'zod';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/shared/utils';

const ArbitrageQuerySchema = z.object({
  symbol: z.string().optional(),
  minProfitPercent: z.string().optional(),
  limit: z.string().optional(),
});

interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyChain: string;
  sellChain: string;
  buyPrice: number;
  sellPrice: number;
  priceDiffPercent: number;
  estimatedProfit: number;
  gasCostEstimate: number;
  netProfit: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: string;
  isActionable: boolean;
  warnings: string[];
}

const SUPPORTED_CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'avalanche',
  'arbitrum',
  'optimism',
  'base',
];
const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];

function generateMockArbitrageOpportunities(
  symbol?: string,
  minProfit?: number,
  limit: number = 10,
): ArbitrageOpportunity[] {
  const symbols = symbol ? [symbol.toUpperCase()] : SUPPORTED_SYMBOLS;
  const opportunities: ArbitrageOpportunity[] = [];

  for (const sym of symbols) {
    const basePrice = sym === 'BTC' ? 95000 : sym === 'ETH' ? 3200 : sym === 'SOL' ? 180 : 50;

    for (let i = 0; i < 3; i++) {
      const buyChainIdx = Math.floor(Math.random() * SUPPORTED_CHAINS.length);
      let sellChainIdx = Math.floor(Math.random() * SUPPORTED_CHAINS.length);
      while (sellChainIdx === buyChainIdx) {
        sellChainIdx = Math.floor(Math.random() * SUPPORTED_CHAINS.length);
      }

      const priceVariation = (Math.random() * 0.5 + 0.1) / 100;
      const buyPrice = basePrice * (1 - priceVariation);
      const sellPrice = basePrice * (1 + priceVariation);
      const priceDiffPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

      if (minProfit && priceDiffPercent < minProfit) continue;

      const estimatedProfit = (sellPrice - buyPrice) * 0.1;
      const gasCostEstimate = Math.random() * 5 + 1;
      const netProfit = estimatedProfit - gasCostEstimate;

      const riskLevel: 'low' | 'medium' | 'high' =
        priceDiffPercent > 1 ? 'high' : priceDiffPercent > 0.3 ? 'medium' : 'low';

      opportunities.push({
        id: `arb-${sym}-${SUPPORTED_CHAINS[buyChainIdx]}-${SUPPORTED_CHAINS[sellChainIdx]}-${Date.now()}`,
        symbol: sym,
        buyChain: SUPPORTED_CHAINS[buyChainIdx] ?? 'ethereum',
        sellChain: SUPPORTED_CHAINS[sellChainIdx] ?? 'bsc',
        buyPrice,
        sellPrice,
        priceDiffPercent,
        estimatedProfit,
        gasCostEstimate,
        netProfit,
        riskLevel,
        confidence: Math.random() * 0.3 + 0.7,
        timestamp: new Date().toISOString(),
        isActionable: netProfit > 0 && priceDiffPercent > 0.1,
        warnings: riskLevel === 'high' ? ['High price volatility detected'] : [],
      });
    }
  }

  return opportunities
    .filter((o) => o.isActionable)
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, limit);
}

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = ArbitrageQuerySchema.parse({
      symbol: searchParams.get('symbol') || undefined,
      minProfitPercent: searchParams.get('minProfitPercent') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const minProfit = query.minProfitPercent ? parseFloat(query.minProfitPercent) : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    const opportunities = generateMockArbitrageOpportunities(query.symbol, minProfit, limit);

    const summary = {
      total: opportunities.length,
      actionable: opportunities.filter((o) => o.isActionable).length,
      avgProfitPercent:
        opportunities.length > 0
          ? opportunities.reduce((sum, o) => sum + o.priceDiffPercent, 0) / opportunities.length
          : 0,
      totalEstimatedProfit: opportunities.reduce((sum, o) => sum + o.netProfit, 0),
    };

    return apiSuccess({
      opportunities,
      summary,
      meta: {
        timestamp: new Date().toISOString(),
        filters: {
          symbol: query.symbol,
          minProfitPercent: minProfit,
        },
      },
    });
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
