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
} from '@/lib/types/oracle/comparison';
import { ORACLE_PROTOCOLS } from '@/lib/types/oracle';
import type { OracleProtocol } from '@/lib/types/oracle/protocol';
import type { SupportedChain } from '@/lib/types/oracle/chain';
import {
  generateRealHeatmapData,
  generateRealLatencyData,
  generateRealRealtimeData,
  checkDataSourceHealth,
} from '@/server/oracle/realDataService';
import { logger } from '@/lib/logger';

// ============================================================================
// 模拟数据生成器（当真实数据不可用时降级使用）
// ============================================================================

function generateMockHeatmapData(symbols: string[], protocols: string[]): PriceHeatmapData {
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
        protocol: protocol as OracleProtocol,
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
    protocols: protocols as OracleProtocol[],
    lastUpdated: new Date().toISOString(),
    totalPairs: symbols.length,
    criticalDeviations,
  };
}

function generateMockLatencyData(protocols: string[]): LatencyAnalysis {
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD'];
  const chains = ['ethereum', 'arbitrum', 'optimism', 'base'];

  const metrics: LatencyAnalysis['metrics'] = [];

  protocols.forEach((protocol) => {
    symbols.forEach((symbol) => {
      const chain = chains[Math.floor(Math.random() * chains.length)] ?? 'ethereum';
      const latencyMs = Math.random() * 10000 + 1000;

      let status: 'healthy' | 'degraded' | 'stale' = 'healthy';
      if (latencyMs > 60000) status = 'stale';
      else if (latencyMs > 30000) status = 'degraded';

      metrics.push({
        protocol: protocol as OracleProtocol,
        symbol,
        chain: chain as SupportedChain,
        latencyMs,
        latencySeconds: latencyMs / 1000,
        blockLag: Math.floor(latencyMs / 12000),
        updateFrequency: Math.random() * 60000 + 30000,
        expectedFrequency: 60000,
        frequencyDeviation: (Math.random() - 0.5) * 20,
        percentile50: latencyMs * 0.8,
        percentile90: latencyMs * 1.2,
        percentile99: latencyMs * 1.5,
        status,
        lastUpdateTimestamp: new Date().toISOString(),
      });
    });
  });

  const latencies = metrics.map((m) => m.latencyMs);

  return {
    metrics,
    summary: {
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
      totalFeeds: metrics.length,
      healthyFeeds: metrics.filter((m) => m.status === 'healthy').length,
      degradedFeeds: metrics.filter((m) => m.status === 'degraded').length,
      staleFeeds: metrics.filter((m) => m.status === 'stale').length,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function generateMockCostData(protocols: string[]): CostComparison {
  const protocolMetrics = protocols.map((protocol) => {
    const costScore = Math.random() * 40 + 60;
    const valueScore = Math.random() * 30 + 70;

    return {
      protocol: protocol as OracleProtocol,
      costScore,
      valueScore,
      feedsCount: Math.floor(Math.random() * 50) + 10,
      chainsCount: Math.floor(Math.random() * 5) + 1,
      avgUpdateFrequency: Math.random() * 300 + 60,
      accuracyScore: Math.random() * 10 + 90,
      uptimeScore: Math.random() * 5 + 95,
      costPerFeed: Math.random() * 100,
      costPerChain: Math.random() * 500,
      costPerUpdate: Math.random() * 0.01,
      roi: valueScore / costScore,
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
      alternatives: protocols.slice(0, 2) as OracleProtocol[],
    },
    {
      useCase: 'trading',
      recommendedProtocol: protocolMetrics.reduce((prev, curr) =>
        prev.avgUpdateFrequency < curr.avgUpdateFrequency ? prev : curr,
      ).protocol,
      reason: '更新频率快，延迟低，适合高频交易场景',
      estimatedMonthlyCost: 1000 + Math.random() * 2000,
      alternatives: protocols.slice(1, 3) as OracleProtocol[],
    },
    {
      useCase: 'enterprise',
      recommendedProtocol: protocolMetrics.reduce((prev, curr) =>
        prev.uptimeScore > curr.uptimeScore ? prev : curr,
      ).protocol,
      reason: '高可用性和企业级支持',
      estimatedMonthlyCost: 2000 + Math.random() * 3000,
      alternatives: protocols.slice(2, 4) as OracleProtocol[],
    },
    {
      useCase: 'hobby',
      recommendedProtocol: cheapest.protocol,
      reason: '成本最低，适合个人项目和小型实验',
      estimatedMonthlyCost: Math.random() * 100,
      alternatives: protocols.slice(0, 2) as OracleProtocol[],
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

function generateMockRealtimeData(protocols: string[]): RealtimeComparisonItem[] {
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD'];

  return symbols.map((symbol) => {
    const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 20;

    const protocolData: RealtimeComparisonItem['protocols'] = protocols.map((protocol) => {
      const deviation = (Math.random() - 0.5) * 2;
      const price = basePrice * (1 + deviation / 100);

      return {
        protocol: protocol as OracleProtocol,
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
    const symbolsParam = searchParams.get('symbols');
    const protocolsParam = searchParams.get('protocols');

    const symbols = symbolsParam
      ? symbolsParam.split(',')
      : ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD'];
    const protocols = (
      protocolsParam ? protocolsParam.split(',') : ORACLE_PROTOCOLS
    ) as OracleProtocol[];

    // 检查数据源健康状态
    const health = await checkDataSourceHealth();
    const useRealData = health.chainlink || health.pyth;

    const response: {
      heatmap?: PriceHeatmapData;
      latency?: LatencyAnalysis;
      cost?: CostComparison;
      realtime?: RealtimeComparisonItem[];
      meta: {
        dataSource: 'real' | 'mock';
        health: typeof health;
        timestamp: string;
      };
    } = {
      meta: {
        dataSource: useRealData ? 'real' : 'mock',
        health,
        timestamp: new Date().toISOString(),
      },
    };

    switch (type) {
      case 'heatmap':
        try {
          response.heatmap = useRealData
            ? await generateRealHeatmapData(symbols, protocols)
            : generateMockHeatmapData(symbols, protocols);
        } catch {
          response.heatmap = generateMockHeatmapData(symbols, protocols);
          response.meta.dataSource = 'mock';
        }
        break;

      case 'latency':
        try {
          response.latency = useRealData
            ? await generateRealLatencyData(protocols)
            : generateMockLatencyData(protocols);
        } catch {
          response.latency = generateMockLatencyData(protocols);
          response.meta.dataSource = 'mock';
        }
        break;

      case 'cost':
        // 成本数据暂时使用模拟数据（需要实际的成本计算逻辑）
        response.cost = generateMockCostData(protocols);
        break;

      case 'realtime':
        try {
          response.realtime = useRealData
            ? await generateRealRealtimeData(protocols)
            : generateMockRealtimeData(protocols);
        } catch {
          response.realtime = generateMockRealtimeData(protocols);
          response.meta.dataSource = 'mock';
        }
        break;

      case 'all':
      default:
        // 获取所有类型的数据
        try {
          response.heatmap = useRealData
            ? await generateRealHeatmapData(symbols, protocols as OracleProtocol[])
            : generateMockHeatmapData(symbols, protocols);
        } catch {
          response.heatmap = generateMockHeatmapData(symbols, protocols);
          response.meta.dataSource = 'mock';
        }

        try {
          response.latency = useRealData
            ? await generateRealLatencyData(protocols as OracleProtocol[])
            : generateMockLatencyData(protocols);
        } catch {
          response.latency = generateMockLatencyData(protocols);
        }

        response.cost = generateMockCostData(protocols);

        try {
          response.realtime = useRealData
            ? await generateRealRealtimeData(protocols)
            : generateMockRealtimeData(protocols);
        } catch {
          response.realtime = generateMockRealtimeData(protocols);
        }
        break;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Comparison API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - 获取历史数据
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, protocol, hours = 24 } = body;

    if (!symbol || !protocol) {
      return NextResponse.json(
        { error: 'Missing required parameters: symbol, protocol' },
        { status: 400 },
      );
    }

    // 生成历史趋势数据（实际项目中从数据库查询）
    const dataPoints = Math.min(hours * 4, 96); // 每15分钟一个点，最多96个点
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / dataPoints;

    const history = Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = new Date(now - (dataPoints - i) * interval).toISOString();
      const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 20;
      const randomWalk = (Math.random() - 0.5) * 0.02;
      const price = basePrice * (1 + randomWalk);

      return {
        timestamp,
        price,
        deviation: randomWalk * 100,
        latency: Math.random() * 5000 + 1000,
      };
    });

    return NextResponse.json({
      symbol,
      protocol,
      hours,
      data: history,
      meta: {
        dataSource: 'mock',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('History API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
