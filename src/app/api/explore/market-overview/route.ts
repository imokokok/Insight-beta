import { ok } from '@/lib/api/apiResponse';

export async function GET() {
  return ok({
    healthScore: 87,
    activeFeeds: 342,
    activeFeedsChange: 5.2,
    updates24h: 12450,
    deviationDistribution: {
      low: 285,
      medium: 45,
      high: 12,
    },
    protocolCoverage: {
      chainlink: 156,
      pyth: 98,
      redstone: 88,
    },
    recentAnomalies: [
      {
        id: 'anomaly-001',
        type: 'price_deviation',
        symbol: 'BTC/USD',
        severity: 'high',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        description: 'BTC/USD 价格偏离阈值超过 5%，当前偏离 5.8%',
      },
      {
        id: 'anomaly-002',
        type: 'stale_feed',
        symbol: 'ETH/USD',
        severity: 'medium',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        description: 'ETH/USD 数据源更新延迟超过 30 秒',
      },
      {
        id: 'anomaly-003',
        type: 'source_divergence',
        symbol: 'SOL/USD',
        severity: 'low',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        description: 'SOL/USD 多数据源价格差异超过 2%',
      },
    ],
  });
}
