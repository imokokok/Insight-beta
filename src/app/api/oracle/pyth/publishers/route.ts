import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface Publisher {
  name: string;
  trustScore: number;
  publishFrequency: number;
  supportedSymbols: string[];
  status: 'active' | 'inactive';
  lastPublish: string;
}

interface PublishersMetadata {
  total: number;
  active: number;
  avgTrustScore: number;
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    status: searchParams.get('status') as 'active' | 'inactive' | null,
  };
}

function getMockPublishers(): Publisher[] {
  return [
    {
      name: 'Binance',
      trustScore: 98,
      publishFrequency: 3600,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 5000).toISOString(),
    },
    {
      name: 'OKX',
      trustScore: 95,
      publishFrequency: 3200,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'OKB/USD', 'DOGE/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 8000).toISOString(),
    },
    {
      name: 'Bybit',
      trustScore: 92,
      publishFrequency: 2800,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'BIT/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 3000).toISOString(),
    },
    {
      name: 'Coinbase',
      trustScore: 97,
      publishFrequency: 3500,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 2000).toISOString(),
    },
    {
      name: 'Kraken',
      trustScore: 94,
      publishFrequency: 3000,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'DOT/USD', 'KSM/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 6000).toISOString(),
    },
    {
      name: 'FTX',
      trustScore: 45,
      publishFrequency: 0,
      supportedSymbols: ['BTC/USD', 'ETH/USD'],
      status: 'inactive',
      lastPublish: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      name: 'Huobi',
      trustScore: 88,
      publishFrequency: 2400,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'HT/USD', 'TRX/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 4000).toISOString(),
    },
    {
      name: 'Gate.io',
      trustScore: 85,
      publishFrequency: 2200,
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'GT/USD'],
      status: 'active',
      lastPublish: new Date(Date.now() - 7000).toISOString(),
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { status } = parseQueryParams(request);
    let publishers = getMockPublishers();

    if (status) {
      publishers = publishers.filter((p) => p.status === status);
    }

    const metadata: PublishersMetadata = {
      total: publishers.length,
      active: publishers.filter((p) => p.status === 'active').length,
      avgTrustScore: Math.round(
        publishers.reduce((sum, p) => sum + p.trustScore, 0) / publishers.length,
      ),
    };

    return ok(
      { publishers, metadata },
      {
        total: publishers.length,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Pyth publishers';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
