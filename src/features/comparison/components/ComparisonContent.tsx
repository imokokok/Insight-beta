'use client';

import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { WS_CONFIG } from '@/config/constants';
import { ComparisonControls } from '@/features/comparison/components/ComparisonControls';
import { useComparisonData } from '@/features/comparison/hooks';
import { useDebounce } from '@/hooks/useDebounce';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import {
  exportRealtimeToCSV,
  exportHeatmapToCSV,
  exportLatencyToCSV,
  exportCostToCSV,
  exportAllToJSON,
} from '@/shared/utils/export';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';
import type {
  ComparisonFilter,
  ComparisonConfig,
  ComparisonView,
  PriceDeviationCell,
} from '@/types/oracle/comparison';

const PriceHeatmap = lazy(() =>
  import('@/features/comparison/components/PriceHeatmap').then((mod) => ({
    default: mod.PriceHeatmap,
  })),
);

const LatencyAnalysisView = lazy(() =>
  import('@/features/comparison/components/LatencyAnalysis').then((mod) => ({
    default: mod.LatencyAnalysisView,
  })),
);

const CostEfficiencyView = lazy(() =>
  import('@/features/comparison/components/CostEfficiency').then((mod) => ({
    default: mod.CostEfficiencyView,
  })),
);

const RealtimeComparisonView = lazy(() =>
  import('@/features/comparison/components/RealtimeComparison').then((mod) => ({
    default: mod.RealtimeComparisonView,
  })),
);

const VirtualTable = lazy(() =>
  import('@/features/comparison/components/VirtualTable').then((mod) => ({
    default: mod.VirtualTable,
  })),
);

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

const MAX_RECONNECT_ATTEMPTS = 5;

interface ComparisonContentProps {
  onRefresh?: () => void;
}

export function ComparisonContent({ onRefresh: _onRefresh }: ComparisonContentProps) {
  const { toast } = useToast();
  const { t } = useI18n();

  const [currentView, setCurrentView] = useState<ComparisonView>('heatmap');
  const [filter, setFilter] = useState<ComparisonFilter>(defaultFilter);
  const [config, setConfig] = useState<ComparisonConfig>(defaultConfig);
  const debouncedFilter = useDebounce(filter, 500);

  const {
    heatmap,
    latency,
    cost,
    realtime,
    current: currentData,
  } = useComparisonData({
    view: currentView,
    filter: debouncedFilter,
    enabled: true,
  });

  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_CONFIG.URL);

    ws.onopen = () => {
      setIsLive(true);
      reconnectAttempts.current = 0;
      ws.send(
        JSON.stringify({
          type: 'subscribe_comparison',
          symbols: debouncedFilter.symbols || ['ETH/USD', 'BTC/USD', 'LINK/USD'],
        }),
      );
    };

    ws.onclose = () => {
      setIsLive(false);
      wsRef.current = null;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000 * reconnectAttempts.current);
      }
    };

    ws.onerror = (error) => {
      if (process.env.NODE_ENV !== 'development') {
        logger.error('WebSocket error', { error });
      }
      setIsLive(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'comparison_update') {
          realtime.refresh();
        }
      } catch (error) {
        logger.error('Failed to parse WebSocket message', { error });
      }
    };

    wsRef.current = ws;
  }, [debouncedFilter.symbols, realtime]);

  const disconnectWebSocket = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsLive(false);
  }, []);

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

  const handleCellClick = useCallback(
    (cell: PriceDeviationCell) => {
      toast({
        title: `${cell.symbol} - ${PROTOCOL_DISPLAY_NAMES[cell.protocol]}`,
        message: `${t('comparison:price')}: $${cell.price.toFixed(4)} | ${t('comparison:deviation')}: ${(cell.deviationPercent * 100).toFixed(2)}%`,
        type: 'info',
      });
    },
    [toast, t],
  );

  const handleExport = useCallback(
    (format: 'json' | 'csv' = 'json') => {
      if (format === 'csv') {
        switch (currentView) {
          case 'heatmap':
            if (heatmap.data) {
              exportHeatmapToCSV(heatmap.data);
              toast({
                title: t('comparison.toast.exportSuccess'),
                message: t('comparison.toast.heatmapExported'),
                type: 'success',
              });
            }
            break;
          case 'latency':
            if (latency.data) {
              exportLatencyToCSV(latency.data);
              toast({
                title: t('comparison.toast.exportSuccess'),
                message: t('comparison.toast.latencyExported'),
                type: 'success',
              });
            }
            break;
          case 'cost':
            if (cost.data) {
              exportCostToCSV(cost.data);
              toast({
                title: t('comparison.toast.exportSuccess'),
                message: t('comparison.toast.costExported'),
                type: 'success',
              });
            }
            break;
          case 'realtime':
          case 'table':
            if (realtime.data) {
              exportRealtimeToCSV(realtime.data);
              toast({
                title: t('comparison.toast.exportSuccess'),
                message: t('comparison.toast.realtimeExported'),
                type: 'success',
              });
            }
            break;
        }
      } else {
        exportAllToJSON({
          heatmap: heatmap.data,
          latency: latency.data,
          cost: cost.data,
          realtime: realtime.data,
        });
        toast({
          title: t('comparison.toast.exportSuccess'),
          message: t('comparison.toast.allExported'),
          type: 'success',
        });
      }
    },
    [currentView, heatmap.data, latency.data, cost.data, realtime.data, toast, t],
  );

  const handleRefresh = useCallback(() => {
    switch (currentView) {
      case 'heatmap':
        heatmap.refresh();
        break;
      case 'latency':
        latency.refresh();
        break;
      case 'cost':
        cost.refresh();
        break;
      case 'realtime':
      case 'table':
        realtime.refresh();
        break;
    }
  }, [currentView, heatmap, latency, cost, realtime]);

  return (
    <ErrorBoundary>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('comparison.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t('comparison.description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 sm:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                {t('comparison.liveConnected')}
              </span>
            )}
          </div>
        </div>

        <ComparisonControls
          filter={filter}
          config={config}
          currentView={currentView}
          onFilterChange={setFilter}
          onConfigChange={setConfig}
          onViewChange={setCurrentView}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isLoading={currentData.isLoading}
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

        <div className="space-y-4 sm:space-y-6">
          {currentView === 'heatmap' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <PriceHeatmap
                data={heatmap.data}
                isLoading={heatmap.isLoading}
                onCellClick={handleCellClick}
                selectedProtocols={debouncedFilter.protocols}
              />
            </Suspense>
          )}

          {currentView === 'latency' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <LatencyAnalysisView data={latency.data} isLoading={latency.isLoading} />
            </Suspense>
          )}

          {currentView === 'cost' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <CostEfficiencyView data={cost.data} isLoading={cost.isLoading} />
            </Suspense>
          )}

          {currentView === 'realtime' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <RealtimeComparisonView
                data={realtime.data}
                isLoading={realtime.isLoading}
                isLive={isLive}
                onRefresh={handleRefresh}
                filter={debouncedFilter}
                onFilterChange={setFilter}
              />
            </Suspense>
          )}

          {currentView === 'table' && (
            <Suspense
              fallback={
                <div className="space-y-2">
                  <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              }
            >
              <VirtualTable
                data={realtime.data}
                isLoading={realtime.isLoading}
                onExport={handleExport}
                rowHeight={52}
                containerHeight={600}
              />
            </Suspense>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
