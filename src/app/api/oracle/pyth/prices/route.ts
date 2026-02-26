import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { error, ok } from '@/lib/api/apiResponse';

const PricesQuerySchema = z.object({
  symbol: z.string().optional(),
  chain: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

interface PriceData {
  symbol: string;
  price: string;
  confidence: string;
  publishTime: string;
  chain: string;
  lastUpdateSlot: number;
}

function getMockPrices(): PriceData[] {
  const now = Date.now();
  return [
    {
      symbol: 'BTC/USD',
      price: '67432.50',
      confidence: '0.85',
      publishTime: new Date(now - 1000).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456789,
    },
    {
      symbol: 'ETH/USD',
      price: '3456.78',
      confidence: '0.42',
      publishTime: new Date(now - 1500).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456788,
    },
    {
      symbol: 'SOL/USD',
      price: '178.45',
      confidence: '0.25',
      publishTime: new Date(now - 2000).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456787,
    },
    {
      symbol: 'BNB/USD',
      price: '598.20',
      confidence: '0.35',
      publishTime: new Date(now - 2500).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456786,
    },
    {
      symbol: 'DOGE/USD',
      price: '0.1582',
      confidence: '0.0012',
      publishTime: new Date(now - 3000).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456785,
    },
    {
      symbol: 'AVAX/USD',
      price: '42.85',
      confidence: '0.18',
      publishTime: new Date(now - 3500).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456784,
    },
    {
      symbol: 'DOT/USD',
      price: '8.92',
      confidence: '0.08',
      publishTime: new Date(now - 4000).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456783,
    },
    {
      symbol: 'LINK/USD',
      price: '18.45',
      confidence: '0.12',
      publishTime: new Date(now - 4500).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456782,
    },
    {
      symbol: 'MATIC/USD',
      price: '0.8925',
      confidence: '0.0045',
      publishTime: new Date(now - 5000).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456781,
    },
    {
      symbol: 'ARB/USD',
      price: '1.23',
      confidence: '0.015',
      publishTime: new Date(now - 5500).toISOString(),
      chain: 'solana',
      lastUpdateSlot: 123456780,
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      symbol: searchParams.get('symbol') || undefined,
      chain: searchParams.get('chain') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const validation = PricesQuerySchema.safeParse(rawParams);

    if (!validation.success) {
      return error(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validation.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const { symbol, chain, limit, offset } = validation.data;

    let prices = getMockPrices();

    if (symbol) {
      prices = prices.filter((p) => p.symbol.toLowerCase().includes(symbol.toLowerCase()));
    }

    if (chain) {
      prices = prices.filter((p) => p.chain.toLowerCase() === chain.toLowerCase());
    }

    const total = prices.length;
    prices = prices.slice(offset, offset + limit);

    return ok({ prices, metadata: { total, limit, offset } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Pyth prices';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
