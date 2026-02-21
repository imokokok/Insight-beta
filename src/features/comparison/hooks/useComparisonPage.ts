'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

import { useToast } from '@/components/ui';
import { WS_CONFIG } from '@/config/constants';
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

export function useComparisonPage() {
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

  return {
    currentView,
    setCurrentView,
    filter,
    setFilter,
    config,
    setConfig,
    debouncedFilter,
    heatmap,
    latency,
    cost,
    realtime,
    currentData,
    isLive,
    handleCellClick,
    handleExport,
    handleRefresh,
  };
}
