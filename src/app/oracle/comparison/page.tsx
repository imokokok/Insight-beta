/**
 * Oracle Comparison Analytics Page
 *
 * 预言机比较分析主页面
 * - 价格偏离热力图
 * - 延迟分析
 * - 成本效益分析
 * - 实时价格对比
 */

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/ui/use-toast';
import { useI18n } from '@/i18n';
import { ComparisonControls } from '@/components/features/comparison/ComparisonControls';
import { PriceHeatmap } from '@/components/features/comparison/PriceHeatmap';
import { LatencyAnalysisView } from '@/components/features/comparison/LatencyAnalysis';
import { CostEfficiencyView } from '@/components/features/comparison/CostEfficiency';
import { RealtimeComparisonView } from '@/components/features/comparison/RealtimeComparison';
import { VirtualTable } from '@/components/features/comparison/VirtualTable';
import type {
  ComparisonFilter,
  ComparisonConfig,
  ComparisonView,
  PriceHeatmapData,
  LatencyAnalysis,
  CostComparison,
  RealtimeComparisonItem,
  PriceDeviationCell,
} from '@/lib/types/oracle';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES } from '@/lib/types/oracle';
import {
  exportRealtimeToCSV,
  exportHeatmapToCSV,
  exportLatencyToCSV,
  exportCostToCSV,
  exportAllToJSON,
} from '@/lib/utils/export';

// ============================================================================
// 默认配置
// ============================================================================

const defaultConfig: ComparisonConfig = {
  refreshInterval: 30000,
  deviationThresholds: {
    low: 0.1,
    medium: 0.5,
    high: 1.0,
    critical: 2.0,
  },
  latencyThresholds: {
    healthy: 60,
    degraded: 300,
    stale: 600,
  },
  referencePriceMethod: 'median',
  timeRange: '24h',
};

const defaultFilter: ComparisonFilter = {
  protocols: ORACLE_PROTOCOLS,
  showStale: false,
};

// ============================================================================
// 模拟数据生成器（开发用）
// ============================================================================

function generateMockHeatmapData(protocols: string[]): PriceHeatmapData {
  const symbols = [
    'ETH/USD',
    'BTC/USD',
    'LINK/USD',
    'MATIC/USD',
    'AVAX/USD',
    'SOL/USD',
    'ARB/USD',
    'OP/USD',
  ];

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

function generateMockLatencyData(protocols: string[]): LatencyAnalysis {
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
      minLatency: Math.min(...latencies),
      totalFeeds: metrics.length,
      staleFeeds: staleCount,
      degradedFeeds: degradedCount,
      healthyFeeds: metrics.length - staleCount - degradedCount,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function generateMockCostData(protocols: string[]): CostComparison {
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

function generateMockRealtimeData(protocols: string[]): RealtimeComparisonItem[] {
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
// 主页面组件
// ============================================================================

export default function ComparisonPage() {
  const { toast } = useToast();
  const { t } = useI18n();

  // State
  const [currentView, setCurrentView] = useState<ComparisonView>('heatmap');
  const [filter, setFilter] = useState<ComparisonFilter>(defaultFilter);
  const [config, setConfig] = useState<ComparisonConfig>(defaultConfig);

  // Data State
  const [heatmapData, setHeatmapData] = useState<PriceHeatmapData | undefined>();
  const [latencyData, setLatencyData] = useState<LatencyAnalysis | undefined>();
  const [costData, setCostData] = useState<CostComparison | undefined>();
  const [realtimeData, setRealtimeData] = useState<RealtimeComparisonItem[] | undefined>();

  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ============================================================================
  // 数据获取
  // ============================================================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const protocols = filter.protocols || ORACLE_PROTOCOLS;

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      setHeatmapData(generateMockHeatmapData(protocols));
      setLatencyData(generateMockLatencyData(protocols));
      setCostData(generateMockCostData(protocols));
      setRealtimeData(generateMockRealtimeData(protocols));
      setLastUpdated(new Date());
    } catch {
      toast({
        title: t('comparison.toast.loadError'),
        description: t('comparison.toast.retryLater'),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, toast]);

  // ============================================================================
  // WebSocket 连接
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');

    ws.onopen = () => {
      setIsLive(true);
      ws.send(
        JSON.stringify({
          type: 'subscribe_comparison',
          symbols: filter.symbols || ['ETH/USD', 'BTC/USD', 'LINK/USD'],
        }),
      );
    };

    ws.onclose = () => {
      setIsLive(false);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'comparison_update') {
        setRealtimeData(message.data);
        setLastUpdated(new Date());
      }
    };

    wsRef.current = ws;
  }, [filter.symbols]);

  const disconnectWebSocket = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsLive(false);
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // 初始加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 定时刷新
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      if (!isLive) {
        fetchData();
      }
    }, config.refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [config.refreshInterval, fetchData, isLive]);

  // WebSocket 连接管理
  useEffect(() => {
    if (currentView === 'realtime') {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [currentView, connectWebSocket, disconnectWebSocket]);

  // ============================================================================
  // 事件处理
  // ============================================================================

  const handleCellClick = useCallback(
    (cell: PriceDeviationCell) => {
      toast({
        title: `${cell.symbol} - ${PROTOCOL_DISPLAY_NAMES[cell.protocol]}`,
        description: `价格: $${cell.price.toFixed(4)} | 偏离: ${cell.deviationPercent.toFixed(2)}%`,
        variant: 'info',
      });
    },
    [toast],
  );

  const handleExport = useCallback(
    (format: 'json' | 'csv' = 'json') => {
      if (format === 'csv') {
        // 根据当前视图导出对应的 CSV
        switch (currentView) {
          case 'heatmap':
            if (heatmapData) {
              exportHeatmapToCSV(heatmapData);
              toast({
                title: t('comparison.toast.exportSuccess'),
                description: t('comparison.toast.heatmapExported'),
                variant: 'success',
              });
            }
            break;
          case 'latency':
            if (latencyData) {
              exportLatencyToCSV(latencyData);
              toast({
                title: t('comparison.toast.exportSuccess'),
                description: t('comparison.toast.latencyExported'),
                variant: 'success',
              });
            }
            break;
          case 'cost':
            if (costData) {
              exportCostToCSV(costData);
              toast({
                title: t('comparison.toast.exportSuccess'),
                description: t('comparison.toast.costExported'),
                variant: 'success',
              });
            }
            break;
          case 'realtime':
          case 'table':
            if (realtimeData) {
              exportRealtimeToCSV(realtimeData);
              toast({
                title: t('comparison.toast.exportSuccess'),
                description: t('comparison.toast.realtimeExported'),
                variant: 'success',
              });
            }
            break;
        }
      } else {
        // 导出 JSON
        exportAllToJSON({
          heatmap: heatmapData,
          latency: latencyData,
          cost: costData,
          realtime: realtimeData,
        });
        toast({
          title: t('comparison.toast.exportSuccess'),
          description: t('comparison.toast.allExported'),
          variant: 'success',
        });
      }
    },
    [currentView, heatmapData, latencyData, costData, realtimeData, toast],
  );

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('comparison.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('comparison.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              {t('comparison.liveConnected')}
            </span>
          )}
        </div>
      </div>

      {/* 控制面板 */}
      <ComparisonControls
        filter={filter}
        config={config}
        currentView={currentView}
        onFilterChange={setFilter}
        onConfigChange={setConfig}
        onViewChange={setCurrentView}
        onRefresh={fetchData}
        onExport={handleExport}
        isLoading={isLoading}
        availableSymbols={[
          'ETH/USD',
          'BTC/USD',
          'LINK/USD',
          'MATIC/USD',
          'AVAX/USD',
          'SOL/USD',
          'ARB/USD',
          'OP/USD',
        ]}
      />

      {/* 主内容区 */}
      <div className="space-y-6">
        {currentView === 'heatmap' && (
          <PriceHeatmap
            data={heatmapData}
            isLoading={isLoading}
            onCellClick={handleCellClick}
            selectedProtocols={filter.protocols}
          />
        )}

        {currentView === 'latency' && (
          <LatencyAnalysisView data={latencyData} isLoading={isLoading} />
        )}

        {currentView === 'cost' && <CostEfficiencyView data={costData} isLoading={isLoading} />}

        {currentView === 'realtime' && (
          <RealtimeComparisonView
            data={realtimeData}
            isLoading={isLoading}
            isLive={isLive}
            onRefresh={fetchData}
            lastUpdated={lastUpdated}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}

        {currentView === 'table' && (
          <VirtualTable
            data={realtimeData}
            isLoading={isLoading}
            onExport={handleExport}
            rowHeight={52}
            containerHeight={600}
          />
        )}
      </div>

      {/* 使用说明 */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h3 className="mb-2 font-medium">{t('comparison.usage.title')}</h3>
        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>{t('comparison.views.heatmap')}</strong>：{t('comparison.usage.heatmap')}
          </li>
          <li>
            <strong>{t('comparison.views.latency')}</strong>：{t('comparison.usage.latency')}
          </li>
          <li>
            <strong>{t('comparison.views.cost')}</strong>：{t('comparison.usage.cost')}
          </li>
          <li>
            <strong>{t('comparison.views.realtime')}</strong>：{t('comparison.usage.realtime')}
          </li>
        </ul>
      </div>
    </div>
  );
}
