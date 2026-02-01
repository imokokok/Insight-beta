/**
 * Oracle Comparison API Routes
 *
 * 预言机比较分析 API 路由
 * - 价格热力图数据
 * - 延迟分析数据
 * - 成本效益数据
 * - 实时对比数据
 * - 历史趋势数据
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type {
  PriceHeatmapData,
  LatencyAnalysis,
  CostComparison,
  RealtimeComparisonItem,
} from '@/lib/types/oracle';
import { ORACLE_PROTOCOLS } from '@/lib/types/oracle';

// ============================================================================
// 模拟数据生成器（实际项目中替换为真实数据库查询）
// ============================================================================

function generateHeatmapData(symbols: string[], protocols: string[]): PriceHeatmapData {
  const rows = symbols.map((symbol) => {
    const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 20;
    const consensusPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);

    const cells = protocols.map((protocol) => {
      const deviationPercent = (Math.random() - 0.5) * 3;
      const price = consensusPrice * (1 + deviationPercent / 100);

      let deviationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const absDeviation = Math.abs(deviationPercent);
      if (absDeviation > 2) deviationLevel = 'critical';
      else if (absDeviation > 1) deviationLevel = 'high';
      else if (absDeviation > 0.5) deviationLevel = 'medium';

      return {
        protocol: protocol as any,
        symbol,
        price,
        referencePrice: consensusPrice,
        deviation: price - consensusPrice,
        deviationPercent,
        deviationLevel,
        timestamp: new Date().toISOString(),
        isStale: Math.random() < 0.1,
      };
    });

    const deviations = cells.map((c) => Math.abs(c.deviationPercent));
    const parts = symbol.split('/');

    return {
      symbol,
      baseAsset: parts[0] || '',
      quoteAsset: parts[1] || '',
      cells,
      maxDeviation: Math.max(...deviations),
      avgDeviation: deviations.reduce((a, b) => a + b, 0) / deviations.length,
      consensusPrice,
      consensusMethod: 'median' as const,
    };
  });

  const criticalDeviations = rows.reduce(
    (sum, row) => sum + row.cells.filter((c) => c.deviationLevel === 'critical').length,
    0,
  );

  return {
    rows,
    protocols: protocols as any[],
    lastUpdated: new Date().toISOString(),
    totalPairs: symbols.length,
    criticalDeviations,
  };
}

function generateLatencyData(protocols: string[]): LatencyAnalysis {
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD'];
  const chains = ['ethereum', 'arbitrum', 'optimism', 'base'];

  const metrics: LatencyAnalysis['metrics'] = [];

  protocols.forEach((protocol) => {
    symbols.forEach((symbol) => {
      const chain = chains[Math.floor(Math.random() * chains.length)];
      const latencyMs = Math.random() * 10000 + 1000;

      let status: 'healthy' | 'degraded' | 'stale' = 'healthy';
      if (latencyMs > 60000) status = 'stale';
      else if (latencyMs > 30000) status = 'degraded';

      metrics.push({
        protocol: protocol as any,
        symbol,
        chain: chain as any,
        lastUpdateTimestamp: new Date(Date.now() - latencyMs).toISOString(),
        latencyMs,
        latencySeconds: latencyMs / 1000,
        blockLag: Math.floor(Math.random() * 10),
        updateFrequency: 300 + Math.random() * 300,
        expectedFrequency: 300,
        frequencyDeviation: (Math.random() - 0.5) * 20,
        percentile50: latencyMs * 0.8,
        percentile90: latencyMs * 1.2,
        percentile99: latencyMs * 1.5,
        status,
      });
    });
  });

  const latencies = metrics.map((m) => m.latencyMs);
  const staleCount = metrics.filter((m) => m.status === 'stale').length;
  const degradedCount = metrics.filter((m) => m.status === 'degraded').length;

  return {
    metrics,
    summary: {
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      staleFeeds: staleCount,
      degradedFeeds: degradedCount,
      healthyFeeds: metrics.length - staleCount - degradedCount,
    },
    timeRange: {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
  };
}

function generateCostData(protocols: string[]): CostComparison {
  const protocolMetrics = protocols.map((protocol) => {
    const costScore = Math.random() * 100;
    const valueScore = Math.random() * 100;

    return {
      protocol: protocol as any,
      costScore,
      valueScore,
      feedsCount: Math.floor(Math.random() * 200) + 50,
      chainsCount: Math.floor(Math.random() * 10) + 1,
      avgUpdateFrequency: 300 + Math.random() * 300,
      accuracyScore: 95 + Math.random() * 5,
      uptimeScore: 99 + Math.random(),
      costPerFeed: Math.random() * 100,
      costPerChain: Math.random() * 500,
      costPerUpdate: Math.random() * 0.01,
      roi: 0.5 + Math.random() * 2,
    };
  });

  const cheapest = protocolMetrics.reduce((prev, curr) =>
    prev.costScore > curr.costScore ? prev : curr,
  );
  const bestValue = protocolMetrics.reduce((prev, curr) =>
    prev.valueScore > curr.valueScore ? prev : curr,
  );
  const mostExpensive = protocolMetrics.reduce((prev, curr) =>
    prev.costScore < curr.costScore ? prev : curr,
  );

  const recommendations: CostComparison['recommendations'] = [
    {
      useCase: 'defi_protocol',
      recommendedProtocol: bestValue.protocol,
      reason: '综合性价比最高，适合需要高可靠性的 DeFi 协议',
      estimatedMonthlyCost: 500 + Math.random() * 1000,
      alternatives: protocols.slice(0, 2) as any[],
    },
    {
      useCase: 'trading',
      recommendedProtocol: protocolMetrics.reduce((prev, curr) =>
        prev.avgUpdateFrequency < curr.avgUpdateFrequency ? prev : curr,
      ).protocol,
      reason: '更新频率快，延迟低，适合高频交易场景',
      estimatedMonthlyCost: 1000 + Math.random() * 2000,
      alternatives: protocols.slice(1, 3) as any[],
    },
    {
      useCase: 'enterprise',
      recommendedProtocol: protocolMetrics.reduce((prev, curr) =>
        prev.uptimeScore > curr.uptimeScore ? prev : curr,
      ).protocol,
      reason: '高可用性和企业级支持',
      estimatedMonthlyCost: 2000 + Math.random() * 3000,
      alternatives: protocols.slice(2, 4) as any[],
    },
    {
      useCase: 'hobby',
      recommendedProtocol: cheapest.protocol,
      reason: '成本最低，适合个人项目和小型实验',
      estimatedMonthlyCost: Math.random() * 100,
      alternatives: protocols.slice(0, 2) as any[],
    },
  ];

  return {
    protocols: protocolMetrics,
    recommendations,
    summary: {
      cheapestProtocol: cheapest.protocol,
      bestValueProtocol: bestValue.protocol,
      mostExpensiveProtocol: mostExpensive.protocol,
    },
  };
}

function generateRealtimeData(protocols: string[]): RealtimeComparisonItem[] {
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];

  return symbols.map((symbol) => {
    const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 20;

    const protocolData: RealtimeComparisonItem['protocols'] = protocols.map((protocol) => {
      const deviation = (Math.random() - 0.5) * 2;
      const price = basePrice * (1 + deviation / 100);

      return {
        protocol: protocol as any,
        price,
        timestamp: new Date().toISOString(),
        confidence: 0.8 + Math.random() * 0.2,
        latency: Math.random() * 5000,
        deviationFromConsensus: deviation,
        status: Math.random() < 0.9 ? 'active' : 'stale',
      };
    });

    const prices = protocolData.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)] ?? mean;

    return {
      symbol,
      protocols: protocolData,
      consensus: {
        median: median ?? mean,
        mean,
        weighted: mean,
      },
      spread: {
        min,
        max,
        absolute: max - min,
        percent: ((max - min) / (median ?? mean)) * 100,
      },
      lastUpdated: new Date().toISOString(),
    };
  });
}

// ============================================================================
// API 路由处理器
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    // 获取筛选参数
    const symbolsParam = searchParams.get('symbols');
    const protocolsParam = searchParams.get('protocols');

    const symbols = symbolsParam
      ? symbolsParam.split(',')
      : ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];
    const protocols = protocolsParam ? protocolsParam.split(',') : ORACLE_PROTOCOLS;

    let responseData: any = {};

    switch (type) {
      case 'heatmap':
        responseData = generateHeatmapData(symbols, protocols);
        break;

      case 'latency':
        responseData = generateLatencyData(protocols);
        break;

      case 'cost':
        responseData = generateCostData(protocols);
        break;

      case 'realtime':
        responseData = generateRealtimeData(protocols);
        break;

      case 'all':
      default:
        responseData = {
          heatmap: generateHeatmapData(symbols, protocols),
          latency: generateLatencyData(protocols),
          cost: generateCostData(protocols),
          realtime: generateRealtimeData(protocols),
        };
        break;
    }

    return NextResponse.json({
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        type,
        symbols,
        protocols,
      },
    });
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
}

// 获取历史趋势数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, protocol, hours = 24 } = body;

    // 生成历史数据点
    const dataPoints = [];
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 100; // 100 个数据点

    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now - (100 - i) * interval).toISOString();
      const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 20;

      dataPoints.push({
        timestamp,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.05),
        deviation: (Math.random() - 0.5) * 2,
        latency: Math.random() * 5000,
      });
    }

    return NextResponse.json({
      data: {
        symbol,
        protocol,
        hours,
        dataPoints,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Failed to fetch history data' }, { status: 500 });
  }
}
