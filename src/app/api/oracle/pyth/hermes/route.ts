import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface HermesService {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  supportedChains: string[];
  uptime: number;
}

interface HermesMetadata {
  total: number;
  healthy: number;
  avgResponseTime: number;
}

function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    status: searchParams.get('status') as 'healthy' | 'degraded' | 'down' | null,
  };
}

function getMockHermesServices(): HermesService[] {
  return [
    {
      name: 'Hermes Mainnet Primary',
      url: 'https://hermes.pyth.network',
      status: 'healthy',
      responseTime: 45,
      supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base'],
      uptime: 99.95,
    },
    {
      name: 'Hermes Mainnet Backup',
      url: 'https://hermes-backup.pyth.network',
      status: 'healthy',
      responseTime: 52,
      supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'],
      uptime: 99.87,
    },
    {
      name: 'Hermes Asia Pacific',
      url: 'https://hermes-ap.pyth.network',
      status: 'healthy',
      responseTime: 38,
      supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche', 'base'],
      uptime: 99.92,
    },
    {
      name: 'Hermes Europe',
      url: 'https://hermes-eu.pyth.network',
      status: 'degraded',
      responseTime: 125,
      supportedChains: ['ethereum', 'polygon', 'arbitrum'],
      uptime: 98.45,
    },
    {
      name: 'Hermes Testnet',
      url: 'https://hermes-testnet.pyth.network',
      status: 'healthy',
      responseTime: 68,
      supportedChains: ['ethereum-sepolia', 'polygon-mumbai', 'arbitrum-sepolia'],
      uptime: 99.78,
    },
    {
      name: 'Hermes Solana',
      url: 'https://hermes-solana.pyth.network',
      status: 'healthy',
      responseTime: 42,
      supportedChains: ['solana-mainnet', 'solana-devnet'],
      uptime: 99.89,
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { status } = parseQueryParams(request);
    let services = getMockHermesServices();

    if (status) {
      services = services.filter((s) => s.status === status);
    }

    const metadata: HermesMetadata = {
      total: services.length,
      healthy: services.filter((s) => s.status === 'healthy').length,
      avgResponseTime: Math.round(
        services.reduce((sum, s) => sum + s.responseTime, 0) / services.length,
      ),
    };

    return ok({ services, metadata }, { total: services.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Hermes service status';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
