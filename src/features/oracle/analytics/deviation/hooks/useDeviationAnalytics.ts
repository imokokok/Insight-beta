'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { deviationConfigService } from '@/features/oracle/services/deviationConfig';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';

import { useProtocolFilter } from './useProtocolFilter';
import { useTimeRange } from './useTimeRange';

import type { DeviationReport, DeviationTrend, PriceDeviationPoint } from '../types/deviation';

export function useDeviationAnalytics() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DeviationReport | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<DeviationTrend | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<PriceDeviationPoint | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolData, setSymbolData] = useState<PriceDeviationPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const { t } = useI18n();

  const timeRangeState = useTimeRange('24h');
  const protocolFilterState = useProtocolFilter();

  const { getCachedData, setCachedData } = useDataCache<{
    report: DeviationReport;
  }>({ key: 'deviation_dashboard', ttl: 5 * 60 * 1000 });

  const fetchReport = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setReport(cached.report);
          setLoading(false);
          return;
        }

        const protocolParam = protocolFilterState.filterParams.protocols
          ? `&protocols=${protocolFilterState.filterParams.protocols}`
          : '';
        const response = await fetchApiData<{ data: DeviationReport }>(
          `/api/oracle/analytics/deviation?type=report&windowHours=${timeRangeState.windowHours}${protocolParam}`,
        );
        setReport(response.data);
        setLastUpdated(new Date());

        setCachedData({
          report: response.data,
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch deviation report';
        setError(errorMessage);
        logger.error('Failed to fetch deviation report', { error: err });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, timeRangeState.windowHours, protocolFilterState.filterParams.protocols],
  );

  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefreshWithCountdown({
    onRefresh: fetchReport,
    interval: deviationConfigService.getConfig().refreshIntervalMs,
    enabled: true,
    pauseWhenHidden: true,
  });

  const fetchSymbolTrend = useCallback(async (symbol: string) => {
    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const protocolParam = protocolFilterState.filterParams.protocols
        ? `&protocols=${protocolFilterState.filterParams.protocols}`
        : '';
      const response = await fetchApiData<{ data: { dataPoints: PriceDeviationPoint[] } }>(
        `/api/oracle/analytics/deviation?type=trend&symbol=${symbol}&windowHours=${timeRangeState.windowHours}${protocolParam}`,
        { signal: abortControllerRef.current.signal },
      );
      setSymbolData(response.data.dataPoints || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      logger.error('Failed to fetch symbol trend', { error: err, symbol });
    }
  }, [timeRangeState.windowHours, protocolFilterState.filterParams.protocols]);

  usePageOptimizations({
    pageName: t('analytics:deviation.pageName'),
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="text"][placeholder*="' + t('common:search') + '"]',
    showRefreshToast: true,
  });

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (selectedTrend) {
      fetchSymbolTrend(selectedTrend.symbol);
    }
  }, [selectedTrend, fetchSymbolTrend]);

  const filteredTrends = useMemo(
    () =>
      report?.trends.filter(
        (trend) =>
          !searchQuery ||
          trend.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trend.recommendation.toLowerCase().includes(searchQuery.toLowerCase()),
      ) || [],
    [report, searchQuery],
  );

  const handleExport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deviation-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const config = deviationConfigService.getConfig();

  return {
    loading,
    report,
    selectedTrend,
    setSelectedTrend,
    selectedAnomaly,
    setSelectedAnomaly,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    symbolData,
    lastUpdated,
    error,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    fetchReport,
    fetchSymbolTrend,
    filteredTrends,
    handleExport,
    config,
    timeRange: timeRangeState.timeRange,
    timeRangePreset: timeRangeState.preset,
    timeRangeWindowHours: timeRangeState.windowHours,
    setTimeRangePreset: timeRangeState.setPreset,
    setCustomTimeRange: timeRangeState.setCustomRange,
    customStartTime: timeRangeState.customStartTime,
    customEndTime: timeRangeState.customEndTime,
    selectedProtocols: protocolFilterState.selectedProtocols,
    isAllProtocolsSelected: protocolFilterState.isAllSelected,
    toggleProtocol: protocolFilterState.toggleProtocol,
    toggleAllProtocols: protocolFilterState.toggleAll,
  };
}
