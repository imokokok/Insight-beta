'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { deviationConfigService } from '@/features/oracle/services/deviationConfig';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';

import type { DeviationReport, DeviationTrend, PriceDeviationPoint } from '../types/deviation';

export interface UseDeviationAnalyticsOptions {}

export function useDeviationAnalytics(_options: UseDeviationAnalyticsOptions = {}) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DeviationReport | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<DeviationTrend | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<PriceDeviationPoint | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolData, setSymbolData] = useState<PriceDeviationPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { t } = useI18n();

  const { getCachedData, setCachedData } = useDataCache<{
    report: DeviationReport;
  }>({ key: 'deviation_dashboard', ttl: 5 * 60 * 1000 });

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

        const config = deviationConfigService.getConfig();
        const windowHours = config.analysisWindowHours;
        
        const response = await fetchApiData<{ data: DeviationReport }>(
          `/api/oracle/analytics/deviation?type=report&windowHours=${windowHours}`,
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
    [getCachedData, setCachedData, lastUpdated],
  );

  const fetchSymbolTrend = useCallback(async (symbol: string) => {
    try {
      const config = deviationConfigService.getConfig();
      const response = await fetchApiData<{ data: { dataPoints: PriceDeviationPoint[] } }>(
        `/api/oracle/analytics/deviation?type=trend&symbol=${symbol}&windowHours=${config.analysisWindowHours}`,
      );
      setSymbolData(response.data.dataPoints || []);
    } catch (err) {
      logger.error('Failed to fetch symbol trend', { error: err, symbol });
    }
  }, []);

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
  };
}
