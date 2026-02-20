import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface PriceUpdate {
  symbol: string;
  price: string;
  confidence: string;
  publishTime: string;
  publisher: string;
  emaPrice: string;
}

interface UpdatesMetadata {
  total: number;
  avgLatency: number;
  updateFrequency: string;
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol'),
    publisher: searchParams.get('publisher'),
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
  };
}

function getMockUpdates(): PriceUpdate[] {
  const now = Date.now();
  return [
    {
      symbol: 'BTC/USD',
      price: '67432.50',
      confidence: '0.85',
      publishTime: new Date(now - 1000).toISOString(),
      publisher: 'Binance',
      emaPrice: '67428.30',
    },
    {
      symbol: 'ETH/USD',
      price: '3456.78',
      confidence: '0.42',
      publishTime: new Date(now - 1500).toISOString(),
      publisher: 'Coinbase',
      emaPrice: '3455.20',
    },
    {
      symbol: 'SOL/USD',
      price: '178.45',
      confidence: '0.25',
      publishTime: new Date(now - 2000).toISOString(),
      publisher: 'Binance',
      emaPrice: '178.30',
    },
    {
      symbol: 'BNB/USD',
      price: '598.20',
      confidence: '0.35',
      publishTime: new Date(now - 2500).toISOString(),
      publisher: 'Binance',
      emaPrice: '597.80',
    },
    {
      symbol: 'DOGE/USD',
      price: '0.1582',
      confidence: '0.0012',
      publishTime: new Date(now - 3000).toISOString(),
      publisher: 'OKX',
      emaPrice: '0.1580',
    },
    {
      symbol: 'AVAX/USD',
      price: '42.85',
      confidence: '0.18',
      publishTime: new Date(now - 3500).toISOString(),
      publisher: 'Coinbase',
      emaPrice: '42.70',
    },
    {
      symbol: 'DOT/USD',
      price: '8.92',
      confidence: '0.08',
      publishTime: new Date(now - 4000).toISOString(),
      publisher: 'Kraken',
      emaPrice: '8.90',
    },
    {
      symbol: 'LINK/USD',
      price: '18.45',
      confidence: '0.12',
      publishTime: new Date(now - 4500).toISOString(),
      publisher: 'Binance',
      emaPrice: '18.40',
    },
    {
      symbol: 'MATIC/USD',
      price: '0.8925',
      confidence: '0.0045',
      publishTime: new Date(now - 5000).toISOString(),
      publisher: 'OKX',
      emaPrice: '0.8910',
    },
    {
      symbol: 'ARB/USD',
      price: '1.23',
      confidence: '0.015',
      publishTime: new Date(now - 5500).toISOString(),
      publisher: 'Bybit',
      emaPrice: '1.22',
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { symbol, publisher, limit } = parseQueryParams(request);
    let updates = getMockUpdates();

    if (symbol) {
      updates = updates.filter((u) => u.symbol.toLowerCase().includes(symbol.toLowerCase()));
    }

    if (publisher) {
      updates = updates.filter((u) => u.publisher.toLowerCase().includes(publisher.toLowerCase()));
    }

    updates = updates.slice(0, limit);

    const metadata: UpdatesMetadata = {
      total: updates.length,
      avgLatency: 245,
      updateFrequency: '400ms',
    };

    return ok({ updates, metadata }, { total: updates.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Pyth price updates';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
