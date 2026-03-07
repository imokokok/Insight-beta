import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';
import type { CrossChainPriceDifference } from '@/types/oracle/comparison';

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols');
    const chains = searchParams.get('chains');

    const data = await fetchCrossChainPrices(symbols, chains);
    const requestTime = performance.now() - requestStartTime;

    logger.info('Cross-chain price comparison API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { symbols, chains },
      responseStats: {
        totalSymbols: data.length,
        arbitrageOpportunities: data.filter((d) => d.arbitrageOpportunity).length,
      },
    });

    return ok(data);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Cross-chain price comparison API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      { code: 'cross_chain_error', message: 'Failed to fetch cross-chain price data' },
      500,
    );
  }
}

async function fetchCrossChainPrices(
  symbols: string | null,
  chains: string | null,
): Promise<CrossChainPriceDifference[]> {
  const symbolList = symbols ? symbols.split(',') : ['ETH/USD', 'BTC/USD', 'LINK/USD'];
  const chainList = chains ? chains.split(',') : ['ethereum', 'polygon', 'arbitrum', 'optimism'];

  const results: CrossChainPriceDifference[] = [];

  for (const symbol of symbolList) {
    const chainPrices = generateChainPrices(symbol, chainList);
    const consensus = calculateConsensus(chainPrices);
    const spread = calculateSpread(chainPrices);
    const arbitrageOpportunity = detectArbitrage(chainPrices);

    results.push({
      symbol,
      chains: chainPrices,
      consensus,
      spread,
      arbitrageOpportunity,
      lastUpdated: new Date().toISOString(),
    });
  }

  return results;
}

function generateChainPrices(symbol: string, chains: string[]) {
  const basePrice = getBasePrice(symbol);
  const now = new Date();

  return chains.map((chain) => {
    const deviation = (Math.random() - 0.5) * 0.02;
    const price = basePrice * (1 + deviation);

    return {
      chain: chain as any,
      price,
      timestamp: now.toISOString(),
      deviation: price - basePrice,
      deviationPercent: deviation,
      confidence: Math.random() * 0.2 + 0.8,
      liquidity: Math.floor(Math.random() * 1000000) + 100000,
      volume24h: Math.floor(Math.random() * 50000000) + 1000000,
    };
  });
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    'ETH/USD': 2500,
    'BTC/USD': 45000,
    'LINK/USD': 15,
    'MATIC/USD': 0.8,
    'AVAX/USD': 35,
    'SOL/USD': 100,
    'ARB/USD': 1.2,
    'OP/USD': 2.5,
  };
  return prices[symbol] || 100;
}

function calculateConsensus(chainPrices: any[]) {
  const prices = chainPrices.map((cp) => cp.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const weighted =
    prices.reduce((sum, price, i) => sum + price * (i + 1), 0) /
    ((prices.length * (prices.length + 1)) / 2);
        ((prices.length * (prices.length + 1)) / 2)
      : 0;

  return { median, mean, weighted };
function calculateSpread(chainPrices: any[]) {

function calculateSpread(chainPrices: CrossChainPriceData[]): SpreadResult {
  const prices = chainPrices.map((cp) => cp.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const absolute = max - min;
  const percent = absolute / ((min + max) / 2);

  return { min, max, absolute, percent };
function detectArbitrage(chainPrices: any[]): any | undefined {
  if (chainPrices.length < 2) return undefined;

  const sortedByPrice = [...chainPrices].sort((a, b) => a.price - b.price);

  if (!lowest || !highest) return undefined;

  const profitPercent = (highest.price - lowest.price) / lowest.price;

  if (profitPercent > 0.005) {
    return {
      profitPercent,
      buyChain: lowest.chain,
      sellChain: highest.chain,
    };
  }

  return undefined;
}
