import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess } from '@/shared/utils';

interface BridgeStatus {
  name: string;
  displayName: string;
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number;
  feePercent: number;
  supportedChains: string[];
  volume24h: number;
  lastUpdated: string;
  alerts: string[];
}

const BRIDGES: Omit<BridgeStatus, 'latencyMs' | 'lastUpdated' | 'alerts'>[] = [
  {
    name: 'multichain',
    displayName: 'Multichain',
    status: 'healthy',
    feePercent: 0.1,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
    volume24h: 15000000,
  },
  {
    name: 'stargate',
    displayName: 'Stargate',
    status: 'healthy',
    feePercent: 0.06,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'],
    volume24h: 25000000,
  },
  {
    name: 'layerzero',
    displayName: 'LayerZero',
    status: 'healthy',
    feePercent: 0.05,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
    volume24h: 35000000,
  },
  {
    name: 'wormhole',
    displayName: 'Wormhole',
    status: 'healthy',
    feePercent: 0.03,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'solana'],
    volume24h: 20000000,
  },
  {
    name: 'across',
    displayName: 'Across Protocol',
    status: 'healthy',
    feePercent: 0.04,
    supportedChains: ['ethereum', 'arbitrum', 'optimism', 'base'],
    volume24h: 12000000,
  },
];

function generateBridgeStatuses(): BridgeStatus[] {
  return BRIDGES.map(bridge => {
    const latencyVariation = Math.random() * 100;
    const isDegraded = Math.random() < 0.1;
    const isOffline = Math.random() < 0.02;
    
    let status: 'healthy' | 'degraded' | 'offline' = 'healthy';
    let alerts: string[] = [];
    let latencyMs = 1000 + latencyVariation * 10;

    if (isOffline) {
      status = 'offline';
      latencyMs = 30000 + Math.random() * 30000;
      alerts.push('Bridge is currently offline');
    } else if (isDegraded) {
      status = 'degraded';
      latencyMs = 5000 + Math.random() * 10000;
      alerts.push('Experiencing higher than normal latency');
    }

    return {
      ...bridge,
      status,
      latencyMs: Math.round(latencyMs),
      lastUpdated: new Date().toISOString(),
      alerts,
    };
  });
}

async function handleGet() {
  const bridges = generateBridgeStatuses();

  const summary = {
    total: bridges.length,
    healthy: bridges.filter(b => b.status === 'healthy').length,
    degraded: bridges.filter(b => b.status === 'degraded').length,
    offline: bridges.filter(b => b.status === 'offline').length,
    avgLatencyMs: Math.round(bridges.reduce((sum, b) => sum + b.latencyMs, 0) / bridges.length),
    totalVolume24h: bridges.reduce((sum, b) => sum + b.volume24h, 0),
  };

  return apiSuccess({
    bridges,
    summary,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
